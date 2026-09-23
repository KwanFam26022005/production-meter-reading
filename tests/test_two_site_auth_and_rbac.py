"""
Test Suite: Two-Site Authentication, CSRF, and Server-Side RBAC
Verifies security invariants for User Portal vs Operations Portal against shared FastAPI backend.
"""

import os
import pytest
from fastapi.testclient import TestClient

# Ensure test DB is isolated
os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["ENVIRONMENT"] = "development"

from backend.app.config import get_settings
get_settings.cache_clear()

from backend.app.db import SessionLocal, init_db
from backend.app.models import User
from backend.app.auth import hash_password
from backend.app.main import app

settings = get_settings()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    yield


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seeded_users(db_session):
    # Ensure test employee exists
    emp = db_session.query(User).filter(User.employee_code == "TEST_EMP_99").first()
    if not emp:
        emp = User(
            id="user-emp-99",
            employee_code="TEST_EMP_99",
            full_name="Nguyễn Văn Hiện Trường",
            role="EMPLOYEE",
            is_active=True,
            password_hash=hash_password("Password123!"),
        )
        db_session.add(emp)

    # Ensure test admin exists
    admin = db_session.query(User).filter(User.employee_code == "TEST_ADM_99").first()
    if not admin:
        admin = User(
            id="user-adm-99",
            employee_code="TEST_ADM_99",
            full_name="Trần Quản Trị Cảng",
            role="ADMIN",
            is_active=True,
            password_hash=hash_password("AdminPass123!"),
        )
        db_session.add(admin)

    db_session.commit()
    return emp, admin


def test_host_only_cookie_issued_on_login(client: TestClient, seeded_users):
    """Verify that session cookie is issued as Host-Only (no Domain attribute)."""
    res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST_EMP_99", "password": "Password123!"},
    )
    assert res.status_code == 200
    set_cookie = res.headers.get("set-cookie", "")
    assert settings.session_cookie_name in set_cookie
    assert "httponly" in set_cookie.lower()
    # Critical security invariant: Cookie must NOT contain Domain= attribute to remain Host-Only
    assert "domain=" not in set_cookie.lower()


def test_employee_forbidden_from_admin_api(client: TestClient, seeded_users):
    """Verify that an authenticated employee cannot access privileged Operations Portal APIs."""
    # 1. Login as employee
    login_res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST_EMP_99", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "EMPLOYEE"

    # 2. Try to access Admin Dashboard
    dash_res = client.get("/api/v1/admin/dashboard")
    assert dash_res.status_code == 403
    assert "quyền" in dash_res.json()["detail"].lower()

    # 3. Try to access Admin Meters list
    meters_res = client.get("/api/v1/admin/meters")
    assert meters_res.status_code == 403

    # 4. Try to access Audit Logs
    audit_res = client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 403


def test_admin_can_access_admin_api(client: TestClient, seeded_users):
    """Verify that an authenticated ADMIN can access Operations Portal APIs."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST_ADM_99", "password": "AdminPass123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "ADMIN"

    dash_res = client.get("/api/v1/admin/dashboard")
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert "kpis" in data
    assert "date_formatted" in data


def test_unauthenticated_requests_rejected(client: TestClient):
    """Verify that requests without cookies receive 401 Unauthorized."""
    # Clear cookies
    client.cookies.clear()
    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 401

    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 401


def test_csrf_protection_and_origin_headers(client: TestClient, seeded_users):
    """Verify CSRF token requirement for state-changing requests from both portals."""
    # Login as employee
    login_res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST_EMP_99", "password": "Password123!"},
    )
    assert login_res.status_code == 200

    # Get CSRF token
    csrf_res = client.get("/api/v1/auth/csrf")
    assert csrf_res.status_code == 200
    csrf_token = csrf_res.json()["csrf_token"]

    # State-changing request WITHOUT CSRF header must fail with 403
    logout_no_csrf = client.post(
        "/api/v1/auth/logout",
        headers={"Origin": "https://user.meter.saigonport.vn"},
    )
    assert logout_no_csrf.status_code == 403
    assert "csrf" in logout_no_csrf.json()["detail"].lower()

    # State-changing request WITH valid CSRF header succeeds
    logout_success = client.post(
        "/api/v1/auth/logout",
        headers={
            "Origin": "https://user.meter.saigonport.vn",
            "X-CSRF-Token": csrf_token,
        },
    )
    assert logout_success.status_code == 200


def test_logout_session_invalidation(client: TestClient, seeded_users):
    """Verify that logging out revokes the session on backend."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"employee_code": "TEST_EMP_99", "password": "Password123!"},
    )
    assert login_res.status_code == 200

    csrf_res = client.get("/api/v1/auth/csrf")
    csrf_token = csrf_res.json()["csrf_token"]

    # User is currently authenticated
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200

    # Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert logout_res.status_code == 200

    # Now /auth/me must fail with 401
    me_after = client.get("/api/v1/auth/me")
    assert me_after.status_code == 401

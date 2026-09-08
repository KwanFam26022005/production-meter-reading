import argparse
import getpass
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy.orm import Session

from backend.app.auth import hash_password
from backend.app.db import SessionLocal, init_db
from backend.app.models import User


def create_user(
    db: Session,
    employee_code: str,
    full_name: str,
    password: str,
    role: str = "EMPLOYEE",
) -> User:
    """Core function to create and persist a new user with Argon2id password hash."""
    clean_code = employee_code.strip()
    if not clean_code:
        raise ValueError("Mã nhân viên không được để trống.")

    existing = db.query(User).filter(User.employee_code == clean_code).first()
    if existing:
        raise ValueError(f"Mã nhân viên '{clean_code}' đã tồn tại trong hệ thống.")

    clean_name = full_name.strip()
    if not clean_name:
        raise ValueError("Họ và tên không được để trống.")

    if len(password) < 6:
        raise ValueError("Mật khẩu phải có độ dài tối thiểu 6 ký tự.")

    pw_hash = hash_password(password)
    user = User(
        employee_code=clean_code,
        full_name=clean_name,
        password_hash=pw_hash,
        role=role.strip().upper(),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_user_cli():
    parser = argparse.ArgumentParser(
        description="Secure User Provisioning CLI for Production Meter Reading & Attendance"
    )
    parser.add_argument("--employee-code", help="Employee code (e.g. CSG-001)")
    parser.add_argument("--full-name", help="Full name of employee")
    parser.add_argument("--role", default="EMPLOYEE", help="User role (default: EMPLOYEE)")

    args = parser.parse_args()

    init_db()
    db = SessionLocal()

    try:
        employee_code = args.employee_code
        if not employee_code:
            employee_code = input("Mã nhân viên (Employee Code): ").strip()
        if not employee_code:
            print("Lỗi: Mã nhân viên không được để trống.", file=sys.stderr)
            sys.exit(1)

        # Check existing early before prompting for password
        existing = db.query(User).filter(User.employee_code == employee_code.strip()).first()
        if existing:
            print(f"Lỗi: Mã nhân viên '{employee_code.strip()}' đã tồn tại trong hệ thống.", file=sys.stderr)
            sys.exit(1)

        full_name = args.full_name
        if not full_name:
            full_name = input("Họ và tên (Full Name): ").strip()
        if not full_name:
            print("Lỗi: Họ và tên không được để trống.", file=sys.stderr)
            sys.exit(1)

        password = getpass.getpass("Mật khẩu (Password): ")
        if not password:
            print("Lỗi: Mật khẩu không được để trống.", file=sys.stderr)
            sys.exit(1)

        confirm = getpass.getpass("Xác nhận mật khẩu (Confirm Password): ")
        if password != confirm:
            print("Lỗi: Mật khẩu xác nhận không khớp.", file=sys.stderr)
            sys.exit(1)

        if len(password) < 6:
            print("Lỗi: Mật khẩu phải có độ dài tối thiểu 6 ký tự.", file=sys.stderr)
            sys.exit(1)

        user = create_user(
            db=db,
            employee_code=employee_code,
            full_name=full_name,
            password=password,
            role=args.role,
        )

        print(f"[OK] Đã tạo thành công nhân viên: {user.full_name} ({user.employee_code}) - Quyền: {user.role}")
    except ValueError as exc:
        print(f"Lỗi: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_user_cli()

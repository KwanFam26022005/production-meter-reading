import argparse
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
from backend.app.db import SessionLocal, init_db
from backend.app.models import User

ALLOWED_ROLES = {"EMPLOYEE", "ADMIN"}


def set_user_role(
    db: Session,
    employee_code: str,
    role: str,
) -> User:
    """Updates only the role of an existing user without modifying password or session secrets."""
    clean_code = employee_code.strip()
    if not clean_code:
        raise ValueError("Mã nhân viên không được để trống.")

    norm_role = role.strip().upper()
    if norm_role not in ALLOWED_ROLES:
        raise ValueError(
            f"Vai trò không hợp lệ: '{role}'. Chỉ chấp nhận một trong các vai trò: {', '.join(sorted(ALLOWED_ROLES))}."
        )

    user = db.query(User).filter(User.employee_code == clean_code).first()
    if not user:
        raise ValueError(f"Không tìm thấy người dùng với mã nhân viên '{clean_code}'.")

    user.role = norm_role
    db.commit()
    db.refresh(user)
    return user


def main():
    parser = argparse.ArgumentParser(
        description="Local maintenance CLI utility to update user role (ADMIN / EMPLOYEE)."
    )
    parser.add_argument(
        "--employee-code",
        required=True,
        help="Mã nhân viên của tài khoản cần cập nhật vai trò (e.g. 52300119)",
    )
    parser.add_argument(
        "--role",
        default="ADMIN",
        help="Vai trò mới (EMPLOYEE | ADMIN, mặc định: ADMIN)",
    )

    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        updated_user = set_user_role(
            db=db,
            employee_code=args.employee_code,
            role=args.role,
        )
        print(
            f"[OK] Đã cập nhật thành công vai trò của người dùng '{updated_user.full_name}' ({updated_user.employee_code}) thành: {updated_user.role}"
        )
    except ValueError as exc:
        print(f"[LỖI] {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

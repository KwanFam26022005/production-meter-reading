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
from backend.app.models import SessionModel, User


def set_user_password(
    db: Session,
    employee_code: str,
    new_password: str,
    revoke_sessions: bool = True,
) -> User:
    """Updates password of an existing user using Argon2id and safely revokes existing sessions.

    Never logs or prints password or password_hash.
    """
    clean_code = employee_code.strip()
    if not clean_code:
        raise ValueError("Mã nhân viên không được để trống.")

    if not new_password:
        raise ValueError("Mật khẩu mới không được để trống.")

    if len(new_password) < 6:
        raise ValueError("Mật khẩu phải có độ dài tối thiểu 6 ký tự.")

    user = db.query(User).filter(User.employee_code == clean_code).first()
    if not user:
        raise ValueError(f"Không tìm thấy người dùng với mã nhân viên '{clean_code}'.")

    # Hash with standard project Argon2id hasher
    user.password_hash = hash_password(new_password)

    # Safely revoke existing sessions for this user
    if revoke_sessions:
        db.query(SessionModel).filter(SessionModel.user_id == user.id).delete()

    db.commit()
    db.refresh(user)
    return user


def main():
    parser = argparse.ArgumentParser(
        description="Local maintenance CLI utility to securely reset user password."
    )
    parser.add_argument(
        "--employee-code",
        required=True,
        help="Mã nhân viên của tài khoản cần đặt lại mật khẩu (e.g. 52300119)",
    )
    parser.add_argument(
        "--password",
        default=None,
        help="Mật khẩu mới (nếu bỏ trống sẽ yêu cầu nhập ẩn an toàn qua getpass)",
    )
    parser.add_argument(
        "--no-revoke",
        action="store_true",
        help="Không thu hồi các phiên đăng nhập hiện tại",
    )

    args = parser.parse_args()

    clean_code = args.employee_code.strip()
    new_password = args.password

    if not new_password:
        try:
            pwd1 = getpass.getpass(f"Nhập mật khẩu mới cho nhân viên [{clean_code}]: ")
            if not pwd1:
                print("[LỖI] Mật khẩu không được để trống.", file=sys.stderr)
                sys.exit(1)
            pwd2 = getpass.getpass("Xác nhận lại mật khẩu mới: ")
            if pwd1 != pwd2:
                print("[LỖI] Mật khẩu xác nhận không khớp.", file=sys.stderr)
                sys.exit(1)
            new_password = pwd1
        except (KeyboardInterrupt, EOFError):
            print("\nĐã hủy thao tác.", file=sys.stderr)
            sys.exit(1)

    init_db()
    db = SessionLocal()
    try:
        updated_user = set_user_password(
            db=db,
            employee_code=clean_code,
            new_password=new_password,
            revoke_sessions=not args.no_revoke,
        )
        print(
            f"[OK] Đã đặt lại mật khẩu thành công cho tài khoản '{updated_user.full_name}' ({updated_user.employee_code})."
        )
        print(f"     Vai trò: {updated_user.role} | Trạng thái: {'Đang hoạt động' if updated_user.is_active else 'Ngừng hoạt động'}")
        print("     Toàn bộ phiên đăng nhập cũ của tài khoản đã được thu hồi an toàn.")
    except ValueError as exc:
        print(f"[LỖI] {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

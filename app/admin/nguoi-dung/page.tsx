import { AdminNguoiDungScreen } from "@/components/admin/AdminNguoiDungScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { canManageUsers, getCurrentUserSystemRole } from "@/lib/auth/system-role";

export default async function AdminNguoiDungPage() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Quản lý user</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-icon">
              <UserLockIcon />
            </div>
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">
              Chỉ Admin hoặc Admin tối cao được quản lý phân quyền user hệ thống.
            </div>
          </div>
        </div>
      </>,
    );
  }

  return renderAdminPage(<AdminNguoiDungScreen />);
}

function UserLockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <rect x="15" y="11" width="8" height="10" rx="2" />
      <path d="M19 11V9a2 2 0 0 0-4 0v2" />
    </svg>
  );
}

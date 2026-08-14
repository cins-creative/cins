import { AdminQuanTriVienScreen } from "@/components/admin/AdminQuanTriVienScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { canManageUsers, getCurrentUserSystemRole } from "@/lib/auth/system-role";

export default async function AdminQuanTriVienPage() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Quản trị viên</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">
              Chỉ Admin hoặc Admin tối cao được xem danh sách quản trị viên và
              phân quyền tab.
            </div>
          </div>
        </div>
      </>,
    );
  }

  return renderAdminPage(<AdminQuanTriVienScreen />);
}

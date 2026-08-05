import { AdminTaiChinhScreen } from "@/components/admin/AdminTaiChinhScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import {
  canGrantAdmin,
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTaiChinhPage() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Tài chính CINs</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">
              Chỉ Admin hoặc Admin tối cao được xem cấu hình tài chính.
            </div>
          </div>
        </div>
      </>,
    );
  }

  return renderAdminPage(
    <AdminTaiChinhScreen canEdit={canGrantAdmin(role)} />,
  );
}

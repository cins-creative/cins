import type { ReactNode } from "react";

import { AdminNoiDungDangScreen } from "@/components/admin/AdminNoiDungDangScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import type { NoiDungDangView } from "@/lib/admin/noi-dung-dang-views";
import { canManageUsers, getCurrentUserSystemRole } from "@/lib/auth/system-role";

export async function renderNoiDungDangPage(
  view: NoiDungDangView,
): Promise<ReactNode> {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Nội dung đăng (World)</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">
              Chỉ Admin hoặc Admin tối cao được quản lý editorial boost World.
            </div>
          </div>
        </div>
      </>,
    );
  }

  return renderAdminPage(<AdminNoiDungDangScreen initialView={view} />);
}

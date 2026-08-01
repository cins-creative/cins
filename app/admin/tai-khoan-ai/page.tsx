import { AdminTaiKhoanAiScreen } from "@/components/admin/AdminTaiKhoanAiScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

import "./tai-khoan-ai.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTaiKhoanAiPage() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Nick seeding</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">
              Chỉ Admin hoặc Admin tối cao được quản lý nick seeding.
            </div>
          </div>
        </div>
      </>,
    );
  }

  return renderAdminPage(<AdminTaiKhoanAiScreen />);
}

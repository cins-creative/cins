import { AdminCsdtPhiScreen } from "@/components/admin/AdminCsdtPhiScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCsdtPhiPage() {
  if (!(await getCurrentUserIsCinsAdmin())) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Phí CSĐT</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
            <div className="empty-desc">Chỉ admin CINs được xem trang này.</div>
          </div>
        </div>
      </>,
    );
  }

  return renderAdminPage(<AdminCsdtPhiScreen />);
}

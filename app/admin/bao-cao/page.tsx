import { Suspense } from "react";

import { AdminBaoCaoLoader } from "@/app/admin/bao-cao/_components/AdminBaoCaoLoader";
import { renderAdminPage } from "@/lib/admin/admin-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminBaoCaoPage() {
  return renderAdminPage(
    <Suspense fallback={<p className="admin-panel-loading">Đang tải báo cáo…</p>}>
      <AdminBaoCaoLoader />
    </Suspense>,
  );
}

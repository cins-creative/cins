import { Suspense } from "react";

import { AdminGopYLoader } from "@/app/admin/gop-y/_components/AdminGopYLoader";
import { renderAdminPage } from "@/lib/admin/admin-page";

import "./gop-y-admin.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminGopYPage() {
  return renderAdminPage(
    <Suspense fallback={<p className="admin-panel-loading">Đang tải góp ý…</p>}>
      <AdminGopYLoader />
    </Suspense>,
  );
}

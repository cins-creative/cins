import { Suspense } from "react";

import { AdminMoShopLoader } from "@/app/admin/mo-shop/_components/AdminMoShopLoader";
import { renderAdminPage } from "@/lib/admin/admin-page";

import "./mo-shop-admin.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminMoShopPage() {
  return renderAdminPage(
    <Suspense
      fallback={<p className="admin-panel-loading">Đang tải lead mở shop…</p>}
    >
      <AdminMoShopLoader />
    </Suspense>,
  );
}

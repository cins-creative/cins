import { Suspense } from "react";

import { AdminDongGopLoader } from "@/app/admin/dong-gop/_components/AdminDongGopLoader";
import { renderAdminPage } from "@/lib/admin/admin-page";

import "./dong-gop-admin.css";
import "@/styles/article-rich-content.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminDongGopPage() {
  return renderAdminPage(
    <Suspense fallback={<p className="admin-panel-loading">Đang tải đóng góp…</p>}>
      <AdminDongGopLoader />
    </Suspense>,
  );
}

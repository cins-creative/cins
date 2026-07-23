import { Suspense } from "react";

import { AdminHuongDanLoader } from "@/app/admin/huong-dan/_components/AdminHuongDanLoader";
import { renderAdminPage } from "@/lib/admin/admin-page";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

import "./huong-dan-admin.css";
import "@/styles/article-draft-tiptap.css";
import "@/styles/article-rich-content.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHuongDanPage() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <p className="admin-panel-loading">
        Chỉ admin / super_admin được quản lý hướng dẫn.
      </p>,
    );
  }

  return renderAdminPage(
    <Suspense
      fallback={<p className="admin-panel-loading">Đang tải hướng dẫn…</p>}
    >
      <AdminHuongDanLoader />
    </Suspense>,
  );
}

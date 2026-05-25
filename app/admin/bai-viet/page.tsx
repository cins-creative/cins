import { AdminBaiVietScreen } from "@/components/admin/AdminBaiVietScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { checkAdminAccess } from "@/lib/admin/require-admin";
import { listArticlesForAdmin } from "@/lib/admin/articles-server";

export default async function AdminBaiVietPage() {
  const gate = checkAdminAccess();
  if (!gate.ok) return renderAdminPage(null);

  const list = await listArticlesForAdmin();
  if (!list.ok) {
    return renderAdminPage(
      <p className="admin-error-msg">
        Không đọc được danh sách: {list.message}
      </p>,
    );
  }

  return renderAdminPage(
    <AdminBaiVietScreen
      initialRows={list.rows}
      filterOptions={list.filterOptions}
      totalCount={list.totalCount}
    />,
  );
}

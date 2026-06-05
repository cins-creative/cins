import { AdminBaiVietScreen } from "@/components/admin/AdminBaiVietScreen";
import { listArticlesForAdmin } from "@/lib/admin/articles-server";
import type { AdminArticleListParams } from "@/lib/admin/article-list-params";

type Props = {
  listParams: AdminArticleListParams;
};

export async function AdminBaiVietListLoader({ listParams }: Props) {
  const list = await listArticlesForAdmin(listParams);
  if (!list.ok) {
    return (
      <p className="admin-error-msg">
        Không đọc được danh sách: {list.message}
      </p>
    );
  }

  return (
    <AdminBaiVietScreen
      rows={list.rows}
      filterOptions={list.filterOptions}
      totalCount={list.totalCount}
      page={list.page}
      pageSize={list.pageSize}
      listParams={listParams}
    />
  );
}

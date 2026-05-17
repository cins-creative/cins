import { AdminArticleManager } from "@/components/admin/AdminArticleManager";
import { listArticlesForAdmin } from "@/lib/admin/articles-server";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export default async function AdminPage() {
  if (!isInlineArticleEditEnabled()) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center text-slate-700">
        <p className="text-sm">
          Trang <code className="rounded bg-slate-100 px-1">/admin</code> chỉ mở khi{" "}
          <strong>development</strong> hoặc bạn đặt{" "}
          <code className="rounded bg-slate-100 px-1">CINS_INLINE_ARTICLE_EDIT=1</code>{" "}
          rồi khởi động lại server.
        </p>
      </div>
    );
  }

  if (!hasServiceRoleEnv()) {
    return (
      <div className="mx-auto max-w-lg p-8 text-slate-800">
        <h1 className="text-xl font-semibold">Thiếu Service Role</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thêm biến{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          vào môi trường (chỉ server). Khởi động lại <code className="text-xs">npm run dev</code>.
        </p>
      </div>
    );
  }

  const list = await listArticlesForAdmin();
  if (!list.ok) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <p className="text-red-600">Không đọc được danh sách: {list.message}</p>
      </div>
    );
  }

  return <AdminArticleManager initialRows={list.rows} />;
}

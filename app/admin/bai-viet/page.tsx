import { Suspense } from "react";

import { AdminBaiVietDongGopLoader } from "@/app/admin/bai-viet/_components/AdminBaiVietDongGopLoader";
import { AdminBaiVietListLoader } from "@/app/admin/bai-viet/_components/AdminBaiVietListLoader";
import { AdminBaiVietTableSkeleton } from "@/app/admin/bai-viet/_components/AdminBaiVietTable.skeleton";
import { AdminBaiVietTabShell } from "@/components/admin/AdminBaiVietTabShell";
import { renderAdminPage } from "@/lib/admin/admin-page";
import {
  parseAdminArticleListParams,
  parseAdminBaiVietTab,
} from "@/lib/admin/article-list-params";
import { countDongGopChoDuyetForAdmin } from "@/lib/article/dong-gop/admin-list";

import "@/styles/article-rich-content.css";
import "@/app/bai-viet/article-layout-nghe.css";
import "@/app/bai-viet/entity-article.css";
import "@/styles/nghe-inline-draft.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminBaiVietPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const listParams = parseAdminArticleListParams(sp);
  const tab = parseAdminBaiVietTab(sp);
  const pendingDongGopCount = await countDongGopChoDuyetForAdmin();

  return renderAdminPage(
    <AdminBaiVietTabShell
      activeTab={tab}
      pendingDongGopCount={pendingDongGopCount}
      listParams={listParams}
    >
      {tab === "dong-gop" ? (
        <Suspense
          fallback={<p className="admin-panel-loading">Đang tải đóng góp…</p>}
        >
          <AdminBaiVietDongGopLoader idBaiViet={listParams.bai} />
        </Suspense>
      ) : (
        <Suspense
          key={JSON.stringify(listParams)}
          fallback={<AdminBaiVietTableSkeleton embedded />}
        >
          <AdminBaiVietListLoader listParams={listParams} />
        </Suspense>
      )}
    </AdminBaiVietTabShell>,
  );
}

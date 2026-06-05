import { Suspense } from "react";

import { AdminBaiVietListLoader } from "@/app/admin/bai-viet/_components/AdminBaiVietListLoader";
import { AdminBaiVietTableSkeleton } from "@/app/admin/bai-viet/_components/AdminBaiVietTable.skeleton";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { checkAdminAccess } from "@/lib/admin/require-admin";
import { parseAdminArticleListParams } from "@/lib/admin/article-list-params";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminBaiVietPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const gate = checkAdminAccess();
  if (!gate.ok) return renderAdminPage(null);

  const listParams = parseAdminArticleListParams(await searchParams);

  return renderAdminPage(
    <Suspense
      key={JSON.stringify(listParams)}
      fallback={<AdminBaiVietTableSkeleton />}
    >
      <AdminBaiVietListLoader listParams={listParams} />
    </Suspense>,
  );
}

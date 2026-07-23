import { Suspense } from "react";

import { AdminGiaoDichLoader } from "@/app/admin/giao-dich/_components/AdminGiaoDichLoader";
import { renderAdminPage } from "@/lib/admin/admin-page";
import type { AdminGiaoDichTab } from "@/lib/admin/shop-giao-dich";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ tab?: string; page?: string }>;

function parseTab(raw: string | undefined): AdminGiaoDichTab {
  if (raw === "shop") return "shop";
  return "don";
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function AdminGiaoDichPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const page = parsePage(sp.page);

  return renderAdminPage(
    <Suspense
      fallback={<p className="admin-panel-loading">Đang tải giao dịch…</p>}
    >
      <AdminGiaoDichLoader tab={tab} page={page} />
    </Suspense>,
  );
}

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminMoShopDetailScreen } from "@/components/admin/AdminMoShopDetailScreen";
import { renderAdminPage } from "@/lib/admin/admin-page";
import { getShopDangKyMoById } from "@/lib/shop/dang-ky-mo-admin";

import "../mo-shop-admin.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = Promise<{ id: string }>;

async function DetailLoader({ id }: { id: string }) {
  const item = await getShopDangKyMoById(id);
  if (!item) notFound();
  return <AdminMoShopDetailScreen item={item} />;
}

export default async function AdminMoShopDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  return renderAdminPage(
    <Suspense
      fallback={<p className="admin-panel-loading">Đang tải chi tiết…</p>}
    >
      <DetailLoader id={id} />
    </Suspense>,
  );
}

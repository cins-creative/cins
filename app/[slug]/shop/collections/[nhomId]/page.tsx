import { notFound, redirect } from "next/navigation";

import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { shopLoaiPath } from "@/lib/shop/cua-hang-href";

type Params = Promise<{ slug: string; nhomId: string }>;

/**
 * Legacy không shopSlug: `/{slug}/shop/collections/{nhomId}` (và `/loai/` trước 308)
 * → `/{slug}/shop/{shopSlug}/collections/{nhomId}`.
 */
export default async function LegacyShopLoaiRedirect({
  params,
}: {
  params: Params;
}) {
  const { slug, nhomId } = await params;
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  if (!resolved) notFound();
  redirect(shopLoaiPath(slug, resolved.shopSlug, nhomId));
}

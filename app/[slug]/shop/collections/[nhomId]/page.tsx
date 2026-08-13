import { notFound, redirect } from "next/navigation";

import { resolveShopSlugForOwnerSlug } from "@/lib/shop/cua-hang";
import { shopLoaiHref } from "@/lib/shop/cua-hang-href";

type Params = Promise<{ slug: string; nhomId: string }>;

/**
 * Legacy `/{slug}/shop/loai/{nhomId}` → `/{slug}/shop/{shopSlug}/loai/{nhomId}`.
 */
export default async function LegacyShopLoaiRedirect({
  params,
}: {
  params: Params;
}) {
  const { slug, nhomId } = await params;
  const resolved = await resolveShopSlugForOwnerSlug(slug);
  if (!resolved) notFound();
  redirect(shopLoaiHref(slug, resolved.shopSlug, nhomId));
}

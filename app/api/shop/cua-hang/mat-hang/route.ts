import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getShopCuaHangByUserId } from "@/lib/shop/cua-hang";
import { shopSlugFromTen } from "@/lib/shop/cua-hang-href";
import {
  listShopStorefrontItems,
  listShopStorefrontNhomCards,
} from "@/lib/shop/storefront";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

async function resolveOwner(opts: {
  userId?: string | null;
  slug?: string | null;
}): Promise<{ id: string; slug: string } | null> {
  if (opts.userId?.trim()) {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("user_nguoi_dung")
      .select("id, slug")
      .eq("id", opts.userId.trim())
      .maybeSingle<{ id: string; slug: string }>();
    return data ?? null;
  }
  const slug = opts.slug?.trim();
  if (!slug) return null;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string }>();
  return data ?? null;
}

/**
 * GET /api/shop/cua-hang/mat-hang?slug=…
 * Mặt tiền theo loại hàng (`nhomCards`). `items` giữ legacy từng SP (kiosk / fallback).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = await resolveOwner({
    userId: url.searchParams.get("userId"),
    slug: url.searchParams.get("slug"),
  });
  if (!owner) {
    return NextResponse.json({ error: "Không tìm thấy cửa hàng." }, { status: 404 });
  }

  const session = await getCurrentSessionAndProfile();
  const asOwner = session?.profile?.id === owner.id;

  try {
    const shop = await getShopCuaHangByUserId(owner.id);
    const shopSlug = shopSlugFromTen(shop?.ten, owner.slug);
    const [nhomCards, items] = await Promise.all([
      listShopStorefrontNhomCards({
        sellerId: owner.id,
        ownerSlug: owner.slug,
        shopSlug,
        asOwner,
      }),
      listShopStorefrontItems({
        sellerId: owner.id,
        ownerSlug: owner.slug,
        asOwner,
      }),
    ]);
    return NextResponse.json({ nhomCards, items, shopSlug });
  } catch (e) {
    console.error("[api/shop/cua-hang/mat-hang]", e);
    return NextResponse.json({ error: "Không tải được hàng." }, { status: 500 });
  }
}

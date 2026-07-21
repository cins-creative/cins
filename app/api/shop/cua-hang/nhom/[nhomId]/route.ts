import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getShopStorefrontNhomDetail } from "@/lib/shop/storefront";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ nhomId: string }> };

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
 * GET /api/shop/cua-hang/nhom/[nhomId]?slug=…
 * Chi tiết loại hàng + danh sách mẫu / biến thể.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { nhomId: rawId } = await ctx.params;
  const nhomId = rawId?.trim();
  if (!nhomId) {
    return NextResponse.json({ error: "Thiếu id loại hàng." }, { status: 422 });
  }

  const url = new URL(request.url);
  const owner = await resolveOwner({
    userId: url.searchParams.get("userId"),
    slug: url.searchParams.get("slug"),
  });
  if (!owner) {
    return NextResponse.json(
      { error: "Không tìm thấy cửa hàng." },
      { status: 404 },
    );
  }

  const session = await getCurrentSessionAndProfile();
  const asOwner = session?.profile?.id === owner.id;

  try {
    const detail = await getShopStorefrontNhomDetail({
      sellerId: owner.id,
      ownerSlug: owner.slug,
      nhomIdOrKhac: nhomId,
      asOwner,
    });
    if (!detail) {
      return NextResponse.json(
        { error: "Không tìm thấy loại hàng." },
        { status: 404 },
      );
    }
    return NextResponse.json({ detail });
  } catch (e) {
    console.error("[api/shop/cua-hang/nhom]", e);
    return NextResponse.json(
      { error: "Không tải được loại hàng." },
      { status: 500 },
    );
  }
}

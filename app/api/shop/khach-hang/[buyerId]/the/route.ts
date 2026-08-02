import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { setShopKhachHangTags } from "@/lib/shop/khach-hang";
import { getBanHangEnabled } from "@/lib/shop/settings";

type Ctx = { params: Promise<{ buyerId: string }> };

/** PUT /api/shop/khach-hang/[buyerId]/the — gán thẻ cho khách. */
export async function PUT(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const enabled = await getBanHangEnabled(session.profile.id);
  if (!enabled) {
    return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
  }

  const { buyerId } = await ctx.params;
  let body: { tagIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const tagIds = Array.isArray(body.tagIds)
    ? body.tagIds.filter((id): id is string => typeof id === "string")
    : [];

  const result = await setShopKhachHangTags(
    session.profile.id,
    buyerId,
    tagIds,
  );
  if (!result.ok) {
    const status = result.error.includes("chưa mua")
      ? 403
      : result.error.includes("không hợp lệ")
        ? 400
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ tagIds: result.tagIds });
}

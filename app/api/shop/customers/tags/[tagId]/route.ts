import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  deleteShopKhachHangTag,
  updateShopKhachHangTag,
} from "@/lib/shop/khach-hang";
import { getBanHangEnabled } from "@/lib/shop/settings";

type Ctx = { params: Promise<{ tagId: string }> };

/** PATCH /api/shop/khach-hang/the/[tagId] — đổi tên/màu. */
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const enabled = await getBanHangEnabled(session.profile.id);
  if (!enabled) {
    return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
  }

  const { tagId } = await ctx.params;
  let body: { ten?: unknown; mau?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const patch: { ten?: string; mau?: string | null } = {};
  if (typeof body.ten === "string") patch.ten = body.ten;
  if (body.mau === null) patch.mau = null;
  else if (typeof body.mau === "string") patch.mau = body.mau;

  if (patch.ten === undefined && patch.mau === undefined) {
    return NextResponse.json(
      { error: "Không có trường nào để cập nhật." },
      { status: 400 },
    );
  }

  const result = await updateShopKhachHangTag(
    session.profile.id,
    tagId,
    patch,
  );
  if (!result.ok) {
    const status = result.error.includes("Không tìm thấy") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ tag: result.tag });
}

/** DELETE /api/shop/khach-hang/the/[tagId] — xóa thẻ (kể cả mặc định). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const enabled = await getBanHangEnabled(session.profile.id);
  if (!enabled) {
    return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
  }

  const { tagId } = await ctx.params;
  const result = await deleteShopKhachHangTag(session.profile.id, tagId);
  if (!result.ok) {
    const status = result.error.includes("Không tìm thấy") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}

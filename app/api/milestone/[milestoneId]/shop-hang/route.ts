import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listPostHang, setPostHang } from "@/lib/shop/post-hang";
import { getBanHangEnabled } from "@/lib/shop/settings";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ milestoneId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { milestoneId } = await ctx.params;
  const admin = createServiceRoleClient();
  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id_nguoi_dung")
    .eq("id", milestoneId)
    .maybeSingle<{ id_nguoi_dung: string | null }>();
  const ownerId = moc?.id_nguoi_dung?.trim() ?? "";
  if (!ownerId) {
    return NextResponse.json({ items: [], banHangEnabled: false });
  }

  /* Opt-in L33: tắt bán hàng → kiosk ẩn (không lộ hàng gắn post). */
  const banHangEnabled = await getBanHangEnabled(ownerId);
  if (!banHangEnabled) {
    return NextResponse.json({ items: [], banHangEnabled: false });
  }

  const items = await listPostHang(milestoneId);
  return NextResponse.json({ items, banHangEnabled: true });
}

export async function PUT(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { milestoneId } = await ctx.params;
  let body: { items?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "Thiếu items." }, { status: 422 });
  }
  const items: Array<{
    idBienThe: string;
    idBangGia: string;
    thuTu?: number;
  }> = [];
  for (const raw of body.items) {
    const o = raw as Record<string, unknown>;
    if (typeof o.idBienThe !== "string" || typeof o.idBangGia !== "string") {
      continue;
    }
    items.push({
      idBienThe: o.idBienThe,
      idBangGia: o.idBangGia,
      thuTu: typeof o.thuTu === "number" ? o.thuTu : undefined,
    });
  }

  try {
    const saved = await setPostHang(session.profile.id, milestoneId, items);
    return NextResponse.json({ items: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
    if (msg === "GIA_NOT_FOUND") {
      return NextResponse.json(
        { error: "Thiếu giá cho biến thể trong bảng giá đã chọn." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}

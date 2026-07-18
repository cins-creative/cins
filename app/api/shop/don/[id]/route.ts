import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  cancelDonHang,
  confirmDonHang,
  donHangToChatContext,
  getDonHang,
} from "@/lib/shop/don-hang";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const don = await getDonHang(id);
  if (!don) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (
    don.idNguoiMua !== session.profile.id &&
    don.idNguoiBan !== session.profile.id
  ) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  return NextResponse.json({
    don,
    chatContext: donHangToChatContext(don),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { action?: unknown; lyDo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  try {
    if (body.action === "da_nhan_tien" || body.action === "da_giao_tai_su_kien") {
      const don = await confirmDonHang(
        session.profile.id,
        id,
        body.action,
      );
      return NextResponse.json({ don, chatContext: donHangToChatContext(don) });
    }
    if (body.action === "huy") {
      const don = await cancelDonHang(session.profile.id, id);
      return NextResponse.json({ don });
    }
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 422 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    }
    if (msg === "INVALID_STATE" || msg === "INVALID_ACTION") {
      return NextResponse.json(
        { error: "Trạng thái đơn không cho phép thao tác này." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }
}

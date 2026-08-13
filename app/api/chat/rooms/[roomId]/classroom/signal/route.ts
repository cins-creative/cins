import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { updateCuocGoiTrangThai } from "@/lib/media/call-history";
import type { ChatCuocGoiTrangThai } from "@/lib/media/call-signal-types";

type Ctx = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    callMessageId?: unknown;
    action?: unknown;
  } | null;

  const callMessageId =
    typeof body?.callMessageId === "string" ? body.callMessageId.trim() : "";
  if (!callMessageId) {
    return NextResponse.json({ error: "Thiếu callMessageId." }, { status: 400 });
  }

  const action = body?.action;
  let trangThai: ChatCuocGoiTrangThai;
  if (action === "decline") trangThai = "tu_choi";
  else if (action === "miss") trangThai = "nho";
  else if (action === "end") trangThai = "ket_thuc";
  else if (action === "accept") trangThai = "dang_dien_ra";
  else {
    return NextResponse.json(
      { error: "action phải là end | decline | miss | accept." },
      { status: 400 },
    );
  }

  try {
    const message = await updateCuocGoiTrangThai({
      roomId,
      messageId: callMessageId,
      viewerId: session.profile.id,
      trangThai,
    });
    return NextResponse.json({ ok: true, message });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Không cập nhật được tín hiệu gọi.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

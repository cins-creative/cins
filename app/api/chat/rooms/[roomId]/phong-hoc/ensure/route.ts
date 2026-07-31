import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { ensureCloudflareMeetingForRoom } from "@/lib/media/cloudflare-realtimekit";
import {
  assertCanJoinPhongHoc,
  MediaGateError,
} from "@/lib/media/gate";
import { isMediaConfigured } from "@/lib/media/config";

type Ctx = { params: Promise<{ roomId: string }> };

/**
 * Bước 3.1 — tạo meeting Cloudflare sớm khi mở phòng chat.
 * Fallback vẫn nằm trong issuePhongHocJoinToken.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  if (!isMediaConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const gate = await assertCanJoinPhongHoc(roomId, session.profile.id);
    const meetingId = await ensureCloudflareMeetingForRoom({
      chatPhongId: gate.chatPhongId,
      title: gate.titleHint,
    });
    return NextResponse.json({ ok: true, meetingId });
  } catch (e) {
    if (e instanceof MediaGateError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg =
      e instanceof Error ? e.message : "Không đảm bảo được phòng họp.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

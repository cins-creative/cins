import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  issuePhongHocJoinToken,
  MediaGateError,
} from "@/lib/media/provider";

type Ctx = { params: Promise<{ roomId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  const displayName = session.profile.ten_hien_thi?.trim() || "Thành viên";

  try {
    const join = await issuePhongHocJoinToken({
      roomId,
      userId: session.profile.id,
      displayName,
    });
    return NextResponse.json(join);
  } catch (e) {
    if (e instanceof MediaGateError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "Không tạo được token phòng học.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

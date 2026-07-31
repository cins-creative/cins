import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  insertCuocGoiDangGoi,
  updateCuocGoiTrangThai,
} from "@/lib/media/call-history";
import type { MediaCallMode } from "@/lib/media/call-mode";
import {
  issuePhongHocJoinToken,
  MediaGateError,
} from "@/lib/media/provider";

type Ctx = { params: Promise<{ roomId: string }> };

function parseMode(raw: unknown): MediaCallMode {
  if (raw === "video" || raw === "screen" || raw === "audio") return raw;
  return "audio";
}

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
    mode?: unknown;
    action?: unknown;
    callMessageId?: unknown;
  } | null;

  const action =
    body?.action === "join" || body?.action === "start"
      ? body.action
      : "start";
  const mode = parseMode(body?.mode);
  const callMessageId =
    typeof body?.callMessageId === "string" ? body.callMessageId.trim() : "";

  const displayName = session.profile.ten_hien_thi?.trim() || "Thành viên";

  try {
    let messageId = callMessageId;

    if (action === "start") {
      // Song song: ghi tín hiệu chuông + lấy token SFU.
      const [signal, join] = await Promise.all([
        insertCuocGoiDangGoi({
          roomId,
          callerId: session.profile.id,
          displayName,
          mode,
        }),
        issuePhongHocJoinToken({
          roomId,
          userId: session.profile.id,
          displayName,
        }),
      ]);
      return NextResponse.json({
        ...join,
        mode,
        callMessageId: signal.messageId,
      });
    }

    if (action === "join") {
      if (!messageId) {
        return NextResponse.json(
          { error: "Thiếu callMessageId khi bắt máy." },
          { status: 400 },
        );
      }
      const [, join] = await Promise.all([
        updateCuocGoiTrangThai({
          roomId,
          messageId,
          viewerId: session.profile.id,
          trangThai: "dang_dien_ra",
        }),
        issuePhongHocJoinToken({
          roomId,
          userId: session.profile.id,
          displayName,
        }),
      ]);
      return NextResponse.json({
        ...join,
        mode,
        callMessageId: messageId,
      });
    }

    const join = await issuePhongHocJoinToken({
      roomId,
      userId: session.profile.id,
      displayName,
    });

    return NextResponse.json({
      ...join,
      mode,
      callMessageId: messageId || null,
    });
  } catch (e) {
    if (e instanceof MediaGateError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg =
      e instanceof Error ? e.message : "Không tạo được token phòng học.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

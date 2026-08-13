import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getDmPeerUserId } from "@/lib/chat/dm-peer";
import {
  insertCuocGoiDangGoi,
  updateCuocGoiTrangThai,
} from "@/lib/media/call-history";
import type { MediaCallMode } from "@/lib/media/call-mode";
import {
  CUOC_GOI_JOIN_TOKEN_TTL_MS,
} from "@/lib/media/call-signal-types";
import {
  createCloudflareParticipantToken,
  ensureCloudflareMeetingForRoom,
} from "@/lib/media/cloudflare-realtimekit";
import { assertCanJoinPhongHoc } from "@/lib/media/gate";
import {
  issuePhongHocJoinToken,
  MediaGateError,
} from "@/lib/media/provider";
import type { MediaJoinToken, PhongHocTokenServerTrace } from "@/lib/media/types";

type Ctx = { params: Promise<{ roomId: string }> };

function parseMode(raw: unknown): MediaCallMode {
  if (raw === "video" || raw === "screen" || raw === "audio") return raw;
  return "audio";
}

function formatServerTiming(parts: Record<string, number>): string {
  return Object.entries(parts)
    .map(([name, dur]) => `${name};dur=${dur.toFixed(1)}`)
    .join(", ");
}

function jsonWithServerTiming(
  body: Record<string, unknown>,
  trace: PhongHocTokenServerTrace | undefined,
  extraHeaderParts?: Record<string, number>,
) {
  const headers = new Headers();
  if (trace) {
    const parts: Record<string, number> = {
      gate: trace.gateMs,
      ensure_meeting: trace.ensureMeetingMs,
      create_participant: trace.createParticipantMs,
      issue_token_total: trace.totalMs,
      ...extraHeaderParts,
    };
    headers.set("Server-Timing", formatServerTiming(parts));
    headers.set("Access-Control-Expose-Headers", "Server-Timing");
  }
  return NextResponse.json(body, { headers });
}

function stripTrace(join: MediaJoinToken): Omit<MediaJoinToken, "serverTrace"> {
  const { serverTrace: _s, ...rest } = join;
  return rest;
}

function elapsedMs(t0: number): number {
  return Math.round((performance.now() - t0) * 10) / 10;
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
  const userId = session.profile.id;

  try {
    let messageId = callMessageId;

    if (action === "start") {
      const t0 = performance.now();
      const tGate = performance.now();
      const gate = await assertCanJoinPhongHoc(roomId, userId);
      const gateMs = elapsedMs(tGate);

      // Tra peer DM song song với ensure meeting — hai việc độc lập.
      const tEnsure = performance.now();
      const [meetingId, peerId] = await Promise.all([
        ensureCloudflareMeetingForRoom({
          chatPhongId: gate.chatPhongId,
          title: gate.titleHint,
        }),
        getDmPeerUserId(roomId, userId),
      ]);
      const ensureMeetingMs = elapsedMs(tEnsure);

      const tPart = performance.now();
      const [callerToken, calleeToken] = await Promise.all([
        createCloudflareParticipantToken({
          meetingId,
          userId,
          displayName,
          role: gate.role,
        }),
        peerId
          ? createCloudflareParticipantToken({
              meetingId,
              userId: peerId,
              displayName: "Thành viên",
              role: "staff",
            }).catch(() => null)
          : Promise.resolve(null),
      ]);
      const createParticipantMs = elapsedMs(tPart);

      const joinTokenExp = calleeToken
        ? new Date(Date.now() + CUOC_GOI_JOIN_TOKEN_TTL_MS).toISOString()
        : null;

      const tSignal = performance.now();
      const signal = await insertCuocGoiDangGoi({
        roomId,
        callerId: userId,
        displayName,
        mode,
        joinToken: calleeToken,
        joinTokenExp,
      });
      const signalMs = elapsedMs(tSignal);
      const totalMs = elapsedMs(t0);

      const serverTrace: PhongHocTokenServerTrace = {
        gateMs,
        ensureMeetingMs,
        createParticipantMs,
        totalMs,
      };
      console.info("[call-trace:server] token start", {
        roomId,
        hasCalleeToken: Boolean(calleeToken),
        serverTrace,
        signalMs,
      });

      return jsonWithServerTiming(
        {
          provider: "cloudflare",
          token: callerToken,
          externalRoomId: meetingId,
          chatPhongId: gate.chatPhongId,
          role: gate.role,
          mode,
          callMessageId: signal.messageId,
        },
        serverTrace,
        { signal: signalMs, callee_token: calleeToken ? 1 : 0 },
      );
    }

    if (action === "join") {
      if (!messageId) {
        return NextResponse.json(
          { error: "Thiếu callMessageId khi bắt máy." },
          { status: 400 },
        );
      }
      const tJoin = performance.now();
      const [, join] = await Promise.all([
        updateCuocGoiTrangThai({
          roomId,
          messageId,
          viewerId: userId,
          trangThai: "dang_dien_ra",
        }),
        issuePhongHocJoinToken({
          roomId,
          userId,
          displayName,
        }),
      ]);
      const statusMs = elapsedMs(tJoin);
      console.info("[call-trace:server] token join", {
        roomId,
        statusParallelMs: statusMs,
        serverTrace: join.serverTrace,
      });
      return jsonWithServerTiming(
        {
          ...stripTrace(join),
          mode,
          callMessageId: messageId,
        },
        join.serverTrace,
        { status_parallel: statusMs },
      );
    }

    const join = await issuePhongHocJoinToken({
      roomId,
      userId,
      displayName,
    });

    return jsonWithServerTiming(
      {
        ...stripTrace(join),
        mode,
        callMessageId: messageId || null,
      },
      join.serverTrace,
    );
  } catch (e) {
    if (e instanceof MediaGateError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg =
      e instanceof Error ? e.message : "Không tạo được token phòng học.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

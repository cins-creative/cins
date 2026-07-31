import "server-only";

import {
  createCloudflareParticipantToken,
  ensureCloudflareMeetingForRoom,
} from "@/lib/media/cloudflare-realtimekit";
import {
  getActiveMediaProvider,
  isMediaConfigured,
} from "@/lib/media/config";
import { assertCanJoinPhongHoc, MediaGateError } from "@/lib/media/gate";
import type { MediaJoinToken } from "@/lib/media/types";

export { MediaGateError, isMediaConfigured, getActiveMediaProvider };

export async function issuePhongHocJoinToken(input: {
  roomId: string;
  userId: string;
  displayName: string;
}): Promise<MediaJoinToken> {
  if (!isMediaConfigured()) {
    throw new MediaGateError(
      "Cuộc gọi chưa được cấu hình trên server (thiếu env media).",
      503,
    );
  }

  const gate = await assertCanJoinPhongHoc(input.roomId, input.userId);
  const provider = getActiveMediaProvider();

  if (provider === "livekit") {
    throw new MediaGateError(
      "Provider LiveKit chưa kích hoạt — đang dùng Cloudflare (Phase A).",
      501,
    );
  }

  const meetingId = await ensureCloudflareMeetingForRoom({
    chatPhongId: gate.chatPhongId,
    title: gate.titleHint,
  });

  const token = await createCloudflareParticipantToken({
    meetingId,
    userId: input.userId,
    displayName: input.displayName,
    role: gate.role,
  });

  return {
    provider: "cloudflare",
    token,
    externalRoomId: meetingId,
    chatPhongId: gate.chatPhongId,
    role: gate.role,
  };
}

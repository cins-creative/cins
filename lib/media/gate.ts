import "server-only";

import { assertRoomMember } from "@/lib/chat/direct-message";
import { getLopRoomAccess } from "@/lib/co-so/lop-room-access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export class MediaGateError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MediaGateError";
    this.status = status;
  }
}

export type MediaGateOk = {
  chatPhongId: string;
  lopId: string | null;
  orgId: string | null;
  isStaff: boolean;
  role: "staff" | "student";
  /** Tiêu đề meeting phía CF. */
  titleHint: string;
};

/**
 * Gate vào cuộc gọi A/V trong mọi chat_phong (bạn bè / nhóm / lớp / org):
 * - phải là member phòng
 * - phòng lớp: HV freeze / hết kỳ → 403; staff vẫn vào
 * - phòng khác: mọi member vào được (preset host để share màn)
 */
export async function assertCanJoinPhongHoc(
  roomId: string,
  userId: string,
): Promise<MediaGateOk> {
  try {
    await assertRoomMember(roomId, userId);
  } catch {
    throw new MediaGateError("Bạn không thuộc phòng chat này.", 403);
  }

  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id, ten_phong, loai_phong, id_org_dai_dien")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) {
    throw new MediaGateError("Không tìm thấy phòng chat.", 404);
  }

  const access = await getLopRoomAccess(roomId, userId);
  if (access.isLopRoom) {
    if (!access.isStaff && (access.frozen || !access.canSend)) {
      throw new MediaGateError(
        "Kỳ học đang freeze — gia hạn để vào phòng học.",
        403,
      );
    }
    let titleHint = "Phòng học";
    if (access.lopId) {
      const { data: lop } = await admin
        .from("org_lop_hoc")
        .select("ten")
        .eq("id", access.lopId)
        .maybeSingle();
      if (lop?.ten) titleHint = String(lop.ten);
    }
    return {
      chatPhongId: roomId,
      lopId: access.lopId,
      orgId: access.orgId,
      isStaff: access.isStaff,
      role: access.isStaff ? "staff" : "student",
      titleHint,
    };
  }

  const titleHint =
    (typeof room.ten_phong === "string" && room.ten_phong.trim()) ||
    "Cuộc gọi";

  return {
    chatPhongId: roomId,
    lopId: null,
    orgId: (room.id_org_dai_dien as string | null) ?? null,
    isStaff: true,
    role: "staff",
    titleHint,
  };
}

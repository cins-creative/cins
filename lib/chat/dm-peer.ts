import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const DM_ROOM = "1_1";

/** Peer còn lại trong phòng DM 1-1; null nếu nhóm / self / không tìm thấy. */
export async function getDmPeerUserId(
  roomId: string,
  viewerId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong")
    .eq("id", roomId)
    .maybeSingle();

  if (!room || room.loai_phong !== DM_ROOM) return null;

  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null);

  const ids = (members ?? [])
    .map((r) => r.id_nguoi_dung as string)
    .filter(Boolean);
  if (ids.length !== 2) return null;
  return ids.find((id) => id !== viewerId) ?? null;
}

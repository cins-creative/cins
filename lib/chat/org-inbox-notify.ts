import "server-only";

import type { OrgTinNhanMoiNotification } from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ORG_ADMIN_ROLES } from "@/lib/truong/org-admin";

import { loadOrgAdvisoryRoom } from "@/lib/chat/org-reply-perspective";

export const ORG_TIN_NHAN_MOI_LOAI = "org_tin_nhan_moi";

export type { OrgTinNhanMoiNotification };

async function listOrgInboxAdminIds(
  admin: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_nguoi_dung")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "active")
    .is("den_ngay", null)
    .in("vai_tro", [...ORG_ADMIN_ROLES]);

  return [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { id_nguoi_dung?: string }).id_nguoi_dung)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/**
 * Trước đây: coalesce 1 thông báo chuông / admin / phòng khi HV nhắn.
 *
 * **Tắt (2026-08-03):** chat org không đẩy popup/chuông tài khoản cá nhân.
 * Tín hiệu đủ ở overlay node «Tổ chức» (chưa đọc / chưa trả lời) + trang QL.
 * Call-site trong `sendRoomMessage` giữ nguyên — no-op ở đây.
 */
export async function notifyOrgAdminsOfStudentMessage(_params: {
  roomId: string;
  senderId: string;
  messagePreview: string;
}): Promise<void> {
  return;
}

/** Đánh dấu đã đọc thông báo org_tin_nhan_moi cũ (khi staff mở/đọc phòng). */
export async function markOrgInboxNotifyRead(params: {
  roomId: string;
  viewerId: string;
}): Promise<void> {
  const room = await loadOrgAdvisoryRoom(params.roomId);
  if (!room) {
    const admin = createServiceRoleClient();
    await admin
      .from("social_thong_bao")
      .update({ da_doc: true })
      .eq("nguoi_nhan", params.viewerId)
      .eq("loai_doi_tuong", ORG_TIN_NHAN_MOI_LOAI)
      .eq("id_doi_tuong", params.roomId)
      .eq("da_doc", false);
    return;
  }

  const { getOrgThongBaoChung } = await import(
    "@/lib/chat/org-notify-settings"
  );
  const thongBaoChung = await getOrgThongBaoChung(room.orgId);
  const admin = createServiceRoleClient();

  if (!thongBaoChung) {
    await admin
      .from("social_thong_bao")
      .update({ da_doc: true })
      .eq("nguoi_nhan", params.viewerId)
      .eq("loai_doi_tuong", ORG_TIN_NHAN_MOI_LOAI)
      .eq("id_doi_tuong", params.roomId)
      .eq("da_doc", false);
    return;
  }

  /* Dùng chung: một admin xem → mark read cho mọi admin của phòng. */
  const recipients = await listOrgInboxAdminIds(admin, room.orgId);
  if (recipients.length === 0) return;
  await admin
    .from("social_thong_bao")
    .update({ da_doc: true })
    .in("nguoi_nhan", recipients)
    .eq("loai_doi_tuong", ORG_TIN_NHAN_MOI_LOAI)
    .eq("id_doi_tuong", params.roomId)
    .eq("da_doc", false);
}

/**
 * Không còn hiện trên chuông cá nhân — trả rỗng.
 * Row DB cũ vẫn được `markOrgInboxNotifyRead` dọn khi staff mở phòng.
 */
export async function listOrgTinNhanMoiNotifications(
  _viewerId: string,
  _options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<OrgTinNhanMoiNotification[]> {
  return [];
}

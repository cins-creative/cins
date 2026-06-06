import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Đánh dấu thông báo lời mời kết bạn đã xử lý (chấp nhận / từ chối). */
export async function markKetBanMoiNotificationHandled(
  recordId: string,
  recipientId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("social_thong_bao")
    .update({
      da_doc: true,
      xu_ly_luc: new Date().toISOString(),
    })
    .eq("nguoi_nhan", recipientId)
    .eq("loai_doi_tuong", "ket_ban_moi")
    .eq("id_doi_tuong", recordId);
  if (error) {
    console.error("[markKetBanMoiNotificationHandled]", error.message);
  }
}

/** Ghi lịch sử khi user chấp nhận/từ chối lời mời kết nối (tab Lịch sử). */
export async function logFollowRequestHandled(
  viewerId: string,
  requesterId: string,
  action: "accept" | "decline",
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", "follow_request_handled")
    .eq("id_doi_tuong", requesterId)
    .eq("noi_dung_ai", action)
    .maybeSingle();

  if (existing?.id) return;

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: viewerId,
    loai: "thong_tin",
    noi_dung:
      action === "accept"
        ? "Bạn đã chấp nhận lời mời kết nối"
        : "Bạn đã từ chối lời mời kết nối",
    loai_doi_tuong: "follow_request_handled",
    id_doi_tuong: requesterId,
    noi_dung_ai: action,
    da_doc: true,
    xu_ly_luc: new Date().toISOString(),
  });
  if (!result.ok) console.error("[logFollowRequestHandled]", result.error);
}

/** Thông báo người gửi lời mời: đối phương đã chấp nhận. */
export async function notifyFriendAccepted(
  requesterId: string,
  accepterId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", requesterId)
    .eq("loai_doi_tuong", "follow_accepted")
    .eq("id_doi_tuong", accepterId)
    .maybeSingle();

  if (existing?.id) return;

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: requesterId,
    loai: "thong_tin",
    noi_dung: "Đã chấp nhận kết bạn",
    noi_dung_ai: accepterId,
    loai_doi_tuong: "follow_accepted",
    id_doi_tuong: accepterId,
    da_doc: false,
  });
  if (!result.ok) console.error("[notifyFriendAccepted]", result.error);
}

/** Lời mời kết bạn mới — người nhận. */
export async function notifyFriendRequest(
  recipientId: string,
  senderId: string,
  recordId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", recipientId)
    .eq("loai_doi_tuong", "ket_ban_moi")
    .eq("id_doi_tuong", recordId)
    .maybeSingle();

  if (existing?.id) return;

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: recipientId,
    loai: "hanh_dong",
    noi_dung: "Có lời mời kết nối mới",
    noi_dung_ai: senderId,
    loai_doi_tuong: "ket_ban_moi",
    id_doi_tuong: recordId,
    da_doc: false,
  });
  if (!result.ok) console.error("[notifyFriendRequest]", result.error);
}

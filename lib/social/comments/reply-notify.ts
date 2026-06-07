import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function parseReplyNotifyCount(noiDung: string | null | undefined): number {
  if (!noiDung) return 1;
  const match = noiDung.match(/^(\d+)\s+/);
  if (match) return Math.max(1, Number.parseInt(match[1] ?? "1", 10));
  return 1;
}

/** Người được trả lời — tối đa 1 thông báo chưa đọc / (người trả lời × cột mốc). */
export async function notifyCommentReply(params: {
  recipientId: string;
  replierId: string;
  milestoneId: string;
}): Promise<void> {
  if (params.recipientId === params.replierId) return;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id, noi_dung")
    .eq("nguoi_nhan", params.recipientId)
    .eq("loai_doi_tuong", "binh_luan_tra_loi")
    .eq("id_doi_tuong", params.milestoneId)
    .eq("noi_dung_ai", params.replierId)
    .eq("da_doc", false)
    .maybeSingle<{ id: string; noi_dung: string | null }>();

  if (existing?.id) {
    const next = parseReplyNotifyCount(existing.noi_dung) + 1;
    const { error } = await admin
      .from("social_thong_bao")
      .update({
        noi_dung: `${next} trả lời bình luận của bạn`,
        tao_luc: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) console.error("[notifyCommentReply] update", error.message);
    return;
  }

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: params.recipientId,
    loai: "thong_tin",
    noi_dung: "Trả lời bình luận của bạn",
    noi_dung_ai: params.replierId,
    loai_doi_tuong: "binh_luan_tra_loi",
    id_doi_tuong: params.milestoneId,
    da_doc: false,
  });
  if (!result.ok) console.error("[notifyCommentReply]", result.error);
}

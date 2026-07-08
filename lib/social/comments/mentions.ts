import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { prefixReplyMentionText } from "@/lib/social/comments/mention-parse";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MENTION_RE = /@([a-z0-9._-]{2,40})/gi;

function parseMentionNotifyCount(noiDung: string | null | undefined): number {
  if (!noiDung) return 1;
  const match = noiDung.match(/^(\d+)\s+/);
  if (match) return Math.max(1, Number.parseInt(match[1] ?? "1", 10));
  return 1;
}

export async function resolveMentionSlugs(text: string): Promise<string[]> {
  const slugs = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    const slug = match[1]?.trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

/**
 * Người được @gắn thẻ — tối đa 1 thông báo chưa đọc / (người gắn thẻ × bài viết).
 */
export async function notifyCommentMentions(params: {
  authorId: string;
  noiDung: string;
  milestoneId: string;
  excludeUserIds?: string[];
}): Promise<void> {
  const slugs = await resolveMentionSlugs(params.noiDung);
  if (slugs.length === 0) return;

  const excluded = new Set(params.excludeUserIds ?? []);

  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .in("slug", slugs)
    .returns<Array<{ id: string; slug: string }>>();

  for (const user of users ?? []) {
    if (user.id === params.authorId || excluded.has(user.id)) continue;
    await notifyMentionRecipient(admin, {
      recipientId: user.id,
      authorId: params.authorId,
      milestoneId: params.milestoneId,
    });
  }
}

async function notifyMentionRecipient(
  admin: ReturnType<typeof createServiceRoleClient>,
  params: {
    recipientId: string;
    authorId: string;
    milestoneId: string;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id, noi_dung")
    .eq("nguoi_nhan", params.recipientId)
    .eq("loai_doi_tuong", "mention_binh_luan")
    .eq("id_doi_tuong", params.milestoneId)
    .eq("noi_dung_ai", params.authorId)
    .eq("da_doc", false)
    .maybeSingle<{ id: string; noi_dung: string | null }>();

  if (existing?.id) {
    const next = parseMentionNotifyCount(existing.noi_dung) + 1;
    const { error } = await admin
      .from("social_thong_bao")
      .update({
        noi_dung: `${next} lần được gắn thẻ trong bình luận`,
        tao_luc: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) console.error("[notifyCommentMentions] update", error.message);
    return;
  }

  const { data: legacyComments } = await admin
    .from("social_binh_luan")
    .select("id")
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", params.milestoneId)
    .eq("nguoi_binh_luan", params.authorId)
    .returns<Array<{ id: string }>>();
  const legacyCommentIds = (legacyComments ?? []).map((row) => row.id);
  if (legacyCommentIds.length > 0) {
    const { data: legacyNotify } = await admin
      .from("social_thong_bao")
      .select("id, noi_dung")
      .eq("nguoi_nhan", params.recipientId)
      .eq("loai", "mention_binh_luan")
      .eq("noi_dung_ai", params.authorId)
      .eq("da_doc", false)
      .in("id_doi_tuong", legacyCommentIds)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; noi_dung: string | null }>();

    if (legacyNotify?.id) {
      const next = parseMentionNotifyCount(legacyNotify.noi_dung) + 1;
      const { error } = await admin
        .from("social_thong_bao")
        .update({
          loai_doi_tuong: "mention_binh_luan",
          id_doi_tuong: params.milestoneId,
          noi_dung: `${next} lần được gắn thẻ trong bình luận`,
          tao_luc: new Date().toISOString(),
        })
        .eq("id", legacyNotify.id);
      if (error) console.error("[notifyCommentMentions] migrate", error.message);
      return;
    }
  }

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: params.recipientId,
    loai: "mention_binh_luan",
    noi_dung: "Bạn được gắn thẻ trong bình luận",
    noi_dung_ai: params.authorId,
    loai_doi_tuong: "mention_binh_luan",
    id_doi_tuong: params.milestoneId,
    da_doc: false,
  });
  if (!result.ok) console.error("[notifyCommentMentions]", result.error);
}

/** Prefix @slug khi trả lời reply (flatten về root). */
export function prefixReplyMention(
  text: string,
  replyToSlug: string | null | undefined,
): string {
  return prefixReplyMentionText(text, replyToSlug);
}

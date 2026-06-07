import "server-only";

import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MENTION_RE = /@([a-z0-9._-]{2,40})/gi;

export async function resolveMentionSlugs(text: string): Promise<string[]> {
  const slugs = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    const slug = match[1]?.trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

export async function notifyCommentMentions(params: {
  commentId: string;
  authorId: string;
  noiDung: string;
}): Promise<void> {
  const slugs = await resolveMentionSlugs(params.noiDung);
  if (slugs.length === 0) return;

  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .in("slug", slugs)
    .returns<Array<{ id: string; slug: string }>>();

  for (const user of users ?? []) {
    if (user.id === params.authorId) continue;
    await insertSocialThongBao(admin, {
      nguoi_nhan: user.id,
      loai: "mention_binh_luan",
      noi_dung: "Bạn được nhắc trong một bình luận",
      noi_dung_ai: params.authorId,
      loai_doi_tuong: "binh_luan",
      id_doi_tuong: params.commentId,
    });
  }
}

/** Prefix @tên khi trả lời reply (flatten về root). */
export function prefixReplyMention(
  text: string,
  replyToName: string | null | undefined,
): string {
  const trimmed = text.trim();
  if (!replyToName?.trim()) return trimmed;
  const prefix = `@${replyToName.trim()} `;
  if (trimmed.toLowerCase().startsWith(prefix.trim().toLowerCase())) return trimmed;
  return `${prefix}${trimmed}`;
}

import {
  COMMENT_MENTION_RE,
  parseCommentMentionSegments,
} from "@/lib/social/comments/mention-parse";
import type { ChatMentionRef } from "@/lib/chat/types";

export {
  COMMENT_MENTION_RE,
  parseCommentMentionSegments,
} from "@/lib/social/comments/mention-parse";

export function extractMentionSlugs(text: string): string[] {
  if (!text.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(COMMENT_MENTION_RE)) {
    const slug = match[1]?.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/** Parse `ngu_canh.mentions` — không yêu cầu card ngữ cảnh. */
export function parseChatMentions(raw: unknown): ChatMentionRef[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as Record<string, unknown>).mentions;
  if (!Array.isArray(list) || list.length === 0) return [];

  const out: ChatMentionRef[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const slug =
      typeof r.slug === "string" ? r.slug.trim().toLowerCase() : "";
    const ten = typeof r.ten === "string" ? r.ten.trim() : "";
    if (!id || !slug || !/^[a-z0-9._-]{2,40}$/.test(slug)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, slug, ten: ten || slug });
  }
  return out;
}

export function mentionsIncludeUser(
  mentions: ChatMentionRef[] | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!userId || !mentions?.length) return false;
  return mentions.some((m) => m.id === userId);
}

export function countUnreadMentions(
  messages: ReadonlyArray<{
    id_nguoi_gui: string;
    tao_luc: string;
    ngu_canh?: unknown;
    da_xoa?: boolean;
  }>,
  viewerId: string,
  readAt: string | null,
): number {
  return messages.filter((msg) => {
    if (msg.da_xoa) return false;
    if (msg.id_nguoi_gui === viewerId) return false;
    if (readAt && msg.tao_luc <= readAt) return false;
    return mentionsIncludeUser(parseChatMentions(msg.ngu_canh), viewerId);
  }).length;
}

/** Gộp card ngữ cảnh + mentions vào jsonb `ngu_canh`. */
export function buildNguCanhPayload(
  card: Record<string, unknown> | null,
  mentions: ChatMentionRef[],
): Record<string, unknown> | null {
  if (!card && mentions.length === 0) return null;
  if (card && mentions.length === 0) return card;
  if (!card) return { mentions };
  return { ...card, mentions };
}

export type ChatMentionMember = {
  userId: string;
  slug: string;
  tenHienThi: string;
};

/** Resolve @slug trong text ∩ danh sách thành viên phòng (không tin ngoài phòng). */
export function resolveMentionsAgainstMembers(
  text: string,
  members: ReadonlyArray<ChatMentionMember>,
  options?: { excludeUserId?: string | null },
): ChatMentionRef[] {
  const slugs = extractMentionSlugs(text);
  if (slugs.length === 0 || members.length === 0) return [];

  const bySlug = new Map<string, ChatMentionMember>();
  for (const m of members) {
    const slug = m.slug.trim().toLowerCase();
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, m);
  }

  const exclude = options?.excludeUserId?.trim() || null;
  const out: ChatMentionRef[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    const member = bySlug.get(slug);
    if (!member) continue;
    if (exclude && member.userId === exclude) continue;
    if (seen.has(member.userId)) continue;
    seen.add(member.userId);
    out.push({
      id: member.userId,
      slug,
      ten: member.tenHienThi.trim() || slug,
    });
  }
  return out;
}

export function chatTextHasMentions(text: string): boolean {
  return parseCommentMentionSegments(text).some((s) => s.type === "mention");
}

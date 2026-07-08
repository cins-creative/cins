/** Parse @slug trong nội dung bình luận — dùng client & server. */
export const COMMENT_MENTION_RE = /@([a-z0-9._-]{2,40})/gi;

export type CommentTextSegment =
  | { type: "text"; value: string }
  | { type: "mention"; slug: string };

export function parseCommentMentionSegments(text: string): CommentTextSegment[] {
  if (!text) return [];

  const segments: CommentTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(COMMENT_MENTION_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const slug = match[1]?.trim().toLowerCase();
    if (slug) {
      segments.push({ type: "mention", slug });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

export function commentTextHasMentions(text: string): boolean {
  return parseCommentMentionSegments(text).some((s) => s.type === "mention");
}

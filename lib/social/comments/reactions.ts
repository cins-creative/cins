import type { CommentReactionSummary } from "@/lib/social/comments/types";

/** Một user chỉ giữ một emoji / comment — optimistic trước khi server trả về. */
export function applyViewerReactionToggle(
  reactions: CommentReactionSummary[],
  emoji: string,
  active: boolean,
): CommentReactionSummary[] {
  let next: CommentReactionSummary[] = [];

  for (const r of reactions) {
    if (!r.viewerReacted) {
      next.push(r);
      continue;
    }
    const count = r.count - 1;
    if (count > 0) {
      next.push({ ...r, count, viewerReacted: false });
    }
  }

  if (active) {
    const idx = next.findIndex((r) => r.emoji === emoji);
    if (idx >= 0) {
      const r = next[idx]!;
      next = next.slice();
      next[idx] = { ...r, count: r.count + 1, viewerReacted: true };
    } else {
      next = [...next, { emoji, count: 1, viewerReacted: true }];
    }
  }

  return next
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

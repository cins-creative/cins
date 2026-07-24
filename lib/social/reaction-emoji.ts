import { COMMENT_REACTION_EMOJIS } from "@/lib/social/comments/types";

/** Emoji lưu trong `social_reaction.emoji` — like / dislike trên cột mốc & org bài đăng. */
export const REACTION_EMOJI = {
  LIKE: "heart",
  DISLIKE: "dislike",
} as const;

export type ReactionEmoji = string;

/** Cảm xúc tích cực (thả tim / đổi emoji) — không gồm dislike. */
export const POSITIVE_REACTION_EMOJIS = COMMENT_REACTION_EMOJIS.filter(
  (e) => e.key !== REACTION_EMOJI.DISLIKE,
).map((e) => e.key);

export const POSITIVE_REACTION_EMOJI_SET = new Set<string>(
  POSITIVE_REACTION_EMOJIS,
);

export const ALLOWED_REACTION_EMOJIS = new Set<string>([
  ...POSITIVE_REACTION_EMOJIS,
  REACTION_EMOJI.DISLIKE,
]);

export function isPositiveReactionEmoji(emoji: string): boolean {
  return POSITIVE_REACTION_EMOJI_SET.has(emoji);
}

export function counterpartReactionEmoji(
  emoji: ReactionEmoji,
): typeof REACTION_EMOJI.LIKE | typeof REACTION_EMOJI.DISLIKE {
  return emoji === REACTION_EMOJI.DISLIKE
    ? REACTION_EMOJI.LIKE
    : REACTION_EMOJI.DISLIKE;
}

export function reactionEmojiLabel(key: string): string {
  return (
    COMMENT_REACTION_EMOJIS.find((e) => e.key === key)?.label ?? key
  );
}

/** Thứ tự ưu tiên hiển thị khi hòa số lượt — theo bảng emoji chuẩn. */
const REACTION_EMOJI_ORDER = new Map<string, number>(
  POSITIVE_REACTION_EMOJIS.map((key, index) => [key, index]),
);

/**
 * Emoji cảm xúc tích cực được thả nhiều nhất trên một đối tượng.
 * Hòa số lượt → ưu tiên theo `REACTION_EMOJI_ORDER` (tim trước).
 */
export function pickTopReactionEmoji(
  counts: Iterable<[string, number]>,
): string | null {
  let topEmoji: string | null = null;
  let topCount = 0;
  let topOrder = Number.POSITIVE_INFINITY;

  for (const [emoji, count] of counts) {
    if (count <= 0 || !isPositiveReactionEmoji(emoji)) continue;
    const order = REACTION_EMOJI_ORDER.get(emoji) ?? Number.MAX_SAFE_INTEGER;
    if (count > topCount || (count === topCount && order < topOrder)) {
      topEmoji = emoji;
      topCount = count;
      topOrder = order;
    }
  }

  return topEmoji;
}

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

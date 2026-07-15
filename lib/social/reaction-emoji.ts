/** Emoji lưu trong `social_reaction.emoji` — like / dislike trên cột mốc & org bài đăng. */
export const REACTION_EMOJI = {
  LIKE: "heart",
  DISLIKE: "dislike",
} as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[keyof typeof REACTION_EMOJI];

export const ALLOWED_REACTION_EMOJIS = new Set<string>([
  REACTION_EMOJI.LIKE,
  REACTION_EMOJI.DISLIKE,
]);

export function counterpartReactionEmoji(
  emoji: ReactionEmoji,
): ReactionEmoji {
  return emoji === REACTION_EMOJI.LIKE
    ? REACTION_EMOJI.DISLIKE
    : REACTION_EMOJI.LIKE;
}

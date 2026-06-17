/** Reaction emoji cho chat — giữ bộ gọn, không picker dài. */
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

/** Cửa sổ sửa / thu hồi tin (ms). */
export const CHAT_ACTION_WINDOW_MS = 15 * 60 * 1000;

/** Số tin ghim tối đa mỗi phòng 1-1. */
export const CHAT_PIN_LIMIT = 3;

export const SOCIAL_LOAI_CHAT_TIN_NHAN = "chat_tin_nhan";

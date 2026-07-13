/** Reaction emoji cho chat — giữ bộ gọn, không picker dài. */
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

/** Cửa sổ sửa / thu hồi tin (ms). */
export const CHAT_ACTION_WINDOW_MS = 15 * 60 * 1000;

/** Số tin ghim tối đa mỗi phòng 1-1. */
export const CHAT_PIN_LIMIT = 3;

/** Số bạn bè tối thiểu được chọn khi tạo nhóm (≥3 người gồm người tạo). */
export const MIN_GROUP_MEMBERS_SELECTED = 2;

/** Tổng thành viên tối đa mỗi nhóm chat bạn bè. */
export const MAX_GROUP_MEMBERS = 50;

/** Số phòng project con tối đa dưới một nhóm cha. */
export const MAX_PROJECT_ROOMS_PER_PARENT = 20;

/** Số ngày không hoạt động trước khi gợi ý admin ẩn phòng project. */
export const PROJECT_IDLE_DAYS_HINT = 45;

/** Số thẻ tài nguyên tối đa mỗi phòng. */
export const MAX_ROOM_RESOURCE_TAGS = 30;

/** Số mốc timeline tối đa mỗi phòng. */
export const MAX_ROOM_MOCS = 50;

export const SOCIAL_LOAI_CHAT_TIN_NHAN = "chat_tin_nhan";

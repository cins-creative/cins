/** Reaction emoji cho chat — giữ bộ gọn, không picker dài. */
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

/** Cửa sổ sửa tin (ms). Thu hồi tin của mình không giới hạn thời gian. */
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

/** Số node tối đa trên một canvas (chặn board phình vô hạn). */
export const MAX_CANVAS_NODES = 500;

/** Độ dài tối đa nội dung sticky / nhãn frame trên canvas. */
export const MAX_CANVAS_STICKY_LEN = 2000;

/** Độ dài tối đa JSON bảng / nét vẽ (`contentKind` table|draw). */
export const MAX_CANVAS_STRUCTURED_LEN = 48000;

/** Số tin nhắn gần nhất quét để auto-import lên canvas. */
export const CANVAS_SYNC_MESSAGE_LIMIT = 300;

export const SOCIAL_LOAI_CHAT_TIN_NHAN = "chat_tin_nhan";

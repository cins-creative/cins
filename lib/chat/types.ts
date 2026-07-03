export type ChatMessageKind = "text" | "media" | "context";

/** Loại đối tượng ngữ cảnh đính vào chat khi user nhắn tin org qua 1 nội dung. */
export type ChatContextLoai =
  | "tuyen_dung"
  | "su_kien"
  | "tuyen_sinh";

/** Snapshot card ngữ cảnh (lưu trong `chat_tin_nhan.ngu_canh`). */
export type ChatContextCard = {
  loai: ChatContextLoai | string;
  id: string;
  tieuDe: string;
  moTa?: string | null;
  anh?: string | null;
  href?: string | null;
  orgTen?: string | null;
};

export type ChatReactionSummary = {
  emoji: string;
  count: number;
  viewerReacted: boolean;
};

export type ChatMessageReplyPreview = {
  id: string;
  from: "me" | "them";
  body: string;
  kind?: ChatMessageKind;
  imageUrl?: string | null;
  deleted?: boolean;
};

export type ChatMessage = {
  id: string;
  from: "me" | "them";
  body: string;
  sentAt: string;
  kind?: ChatMessageKind;
  imageId?: string | null;
  imageUrl?: string | null;
  /** Optimistic: nhiều ảnh trong một bubble album khi đang gửi. */
  albumImages?: Array<{ imageId: string; imageUrl: string }>;
  deleted?: boolean;
  edited?: boolean;
  editedAt?: string | null;
  replyTo?: ChatMessageReplyPreview | null;
  reactions?: ChatReactionSummary[];
  pinned?: boolean;
  readByPeer?: boolean;
  /** Card ngữ cảnh (tuyển dụng/sự kiện/tuyển sinh) — hiển thị dạng card. */
  nguCanh?: ChatContextCard | null;
};

export type ChatParticipantKind = "user" | "org";

export type ChatThreadGroup = "ban_be" | "nguoi_la" | "to_chuc";

export type ChatOrgKind =
  | "co_so_dao_tao"
  | "truong_dai_hoc"
  | "cong_dong"
  | "studio";

export type ChatThread = {
  id: string;
  roomId: string;
  peerUserId?: string;
  name: string;
  group: ChatThreadGroup;
  kind: ChatParticipantKind;
  orgKind?: ChatOrgKind;
  verified?: boolean;
  role: string;
  avatarInitial: string;
  avatarHue: number;
  avatarUrl?: string | null;
  /** Org đại diện — dùng dedupe thread tab Tổ chức. */
  orgId?: string;
  preview: string;
  lastAt: string;
  unread: number;
  online?: boolean;
  typing?: boolean;
  messages: ChatMessage[];
};

export const CHAT_ORG_KIND_LABEL: Record<ChatOrgKind, string> = {
  co_so_dao_tao: "Cơ sở đào tạo",
  truong_dai_hoc: "Trường đại học",
  cong_dong: "Cộng đồng",
  studio: "Studio",
};

export const CHAT_PARTICIPANT_KIND_LABEL: Record<ChatParticipantKind, string> = {
  user: "Cá nhân",
  org: "Tổ chức",
};

export const CHAT_THREAD_GROUP_ORDER: ChatThreadGroup[] = [
  "ban_be",
  "nguoi_la",
  "to_chuc",
];

export const CHAT_THREAD_GROUP_LABEL: Record<ChatThreadGroup, string> = {
  ban_be: "Bạn bè",
  nguoi_la: "Người lạ",
  to_chuc: "Tổ chức",
};

export type ChatThreadsResponse = {
  threads: ChatThread[];
  totalUnread: number;
};

export type OpenDirectRoomResponse = {
  thread: ChatThread;
};

export type ChatPeerPreview = {
  userId: string;
  name: string;
  role?: string;
  avatarInitial?: string;
  avatarHue?: number;
  avatarUrl?: string | null;
};

export type ChatLaunchState = {
  thread: ChatThread;
  tab?: ChatThreadGroup;
  resolving?: boolean;
  /** Card ngữ cảnh chờ — chèn vào ô soạn, chỉ gửi khi user gửi tin. */
  nguCanh?: ChatContextCard | null;
};

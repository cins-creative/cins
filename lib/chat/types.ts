export type ChatMessage = {
  id: string;
  from: "me" | "them";
  body: string;
  sentAt: string;
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
};

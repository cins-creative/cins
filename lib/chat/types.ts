export type ChatMessageKind =
  | "text"
  | "media"
  | "sticker"
  | "context"
  | "binh_chon"
  | "moc_nhac";

export type ChatMocNoticeSuKien = "tao" | "nhac_truoc" | "den_han";

/** Tin hệ thống nhắc mốc trong phòng (`loai_tin=system`, `ngu_canh.loai=moc`). */
export type ChatMocNotice = {
  mocId: string;
  suKien: ChatMocNoticeSuKien;
  ten: string;
  thoiDiem: string;
  url?: string | null;
  moTa?: string | null;
};

export type ChatPollOption = {
  id: string;
  text: string;
  count: number;
};

export type ChatPollSummary = {
  id: string;
  question: string;
  allowMultiple: boolean;
  totalVotes: number;
  viewerOptionId: string | null;
  options: ChatPollOption[];
};

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

/** Người được @nhắc — lưu trong `chat_tin_nhan.ngu_canh.mentions`. */
export type ChatMentionRef = {
  id: string;
  slug: string;
  ten: string;
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
  /** Nhóm chat — hiển thị tên người gửi trên bubble. */
  senderUserId?: string;
  /** Slug Journey — click cụm avatar+tên → card user. */
  senderSlug?: string;
  senderName?: string;
  senderAvatarInitial?: string;
  senderAvatarHue?: number;
  senderAvatarUrl?: string | null;
  senderRole?: string;
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
  /** @deprecated Dùng readCursors watermark — giữ optional để tương thích cache cũ. */
  readByPeer?: boolean;
  /** Card ngữ cảnh (tuyển dụng/sự kiện/tuyển sinh) — hiển thị dạng card. */
  nguCanh?: ChatContextCard | null;
  /** @nhắc trong tin nhóm — từ `ngu_canh.mentions`. */
  mentions?: ChatMentionRef[];
  /** Bình chọn gắn tin (loai_tin=binh_chon). */
  poll?: ChatPollSummary | null;
  /** Nhắc mốc hệ thống trong phòng. */
  mocNhac?: ChatMocNotice | null;
};

/** Cursor «đã xem tới tin này» của một thành viên khác trong phòng. */
export type ChatReadCursor = {
  userId: string;
  messageId: string;
  name: string;
  slug?: string;
  avatarUrl?: string | null;
  initial: string;
  hue: number;
};

export type ChatParticipantKind = "user" | "org";

export type ChatThreadGroup = "ban_be" | "nguoi_la" | "to_chuc";

export type ChatOrgKind =
  | "co_so_dao_tao"
  | "truong_dai_hoc"
  | "cong_dong"
  | "studio";

export type ChatGroupMemberAvatar = {
  userId: string;
  initial: string;
  hue: number;
  avatarUrl?: string | null;
  slug?: string;
  name?: string;
};

import type { ChatGroupVaiTro } from "@/lib/chat/group-roles";

export type { ChatGroupVaiTro };

/** Thành viên trong bảng quản lý nhóm. */
export type ChatGroupMember = {
  membershipId: string;
  userId: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  avatarUrl: string | null;
  vaiTro: ChatGroupVaiTro;
  isViewer: boolean;
};

/** Yêu cầu xin gia nhập nhóm qua link mời. */
export type ChatGroupJoinRequest = {
  id: string;
  userId: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  avatarUrl: string | null;
  taoLuc: string;
};

/** Preview trang /chat/nhom/moi/[ma]. */
export type ChatGroupInvitePreview = {
  maMoi: string;
  roomId: string;
  tenPhong: string;
  avatarUrl: string | null;
  memberCount: number;
  alreadyMember: boolean;
  pendingRequest: boolean;
  canRequest: boolean;
  reason?: string;
};

export type ChatThread = {
  id: string;
  roomId: string;
  peerUserId?: string;
  /** Slug Journey của đối phương (DM cá nhân) — dùng «Xem người dùng». */
  peerSlug?: string;
  /** Phòng nhóm bạn bè (loai_phong = nhom). */
  isGroup?: boolean;
  memberCount?: number;
  memberIds?: string[];
  /** Mosaic mặc định khi chưa có avatar nhóm tuỳ chỉnh. */
  memberAvatars?: ChatGroupMemberAvatar[];
  /** Viewer là owner hoặc admin — quản lý nhóm (tên/avatar/thành viên). */
  isGroupAdmin?: boolean;
  /** Viewer là chủ nhóm — xóa nhóm / phân quyền admin. */
  isGroupOwner?: boolean;
  /** Phòng project con — id nhóm cha. */
  parentRoomId?: string | null;
  /** active | an (ẩn khỏi list, còn lịch sử). */
  roomTrangThai?: "active" | "an";
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
  /** Số tin chưa đọc có @nhắc viewer (nhóm/project). */
  unreadMentions?: number;
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
  slug?: string;
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

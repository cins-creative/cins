import type {
  ChatCuocGoiNotice,
  ChatCuocGoiTrangThai,
} from "@/lib/media/call-signal-types";

export type ChatMessageKind =
  | "text"
  | "media"
  | "sticker"
  | "context"
  | "binh_chon"
  | "moc_nhac"
  | "canvas_binh_luan"
  | "cuoc_goi"
  | "lop_bai";

/** Tin hệ thống pedagogy lớp (`ngu_canh.loai` = mo_bai | nop_bai | luu_bai | journey_da_dang). */
export type ChatLopBaiNotice = {
  loai: "mo_bai" | "nop_bai" | "luu_bai" | "journey_da_dang";
  idNguoiDung: string;
  idHocVienLop?: string;
  idBaiTap?: string;
  tenBai?: string;
  idNopBai?: string;
  idCotMoc?: string;
  slug?: string;
};

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

/** Tin hệ thống: có bình luận mới trên canvas (`ngu_canh.loai=canvas_binh_luan`). */
export type ChatCanvasBinhLuanNotice = {
  canvasId: string;
  soLuong: number;
  nodeIds: string[];
  tenNguoi: string;
  avatarUrl?: string | null;
};

export type { ChatCuocGoiNotice, ChatCuocGoiTrangThai };

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
  | "tuyen_sinh"
  | "don_hang"
  | "don_hoc_phi";

/** Ai đổi trạng thái đơn — quyết định cách gọi trong thông báo chat. */
export type ChatDonCapNhatBoi = "nguoi_ban" | "nguoi_mua" | "he_thong";

/**
 * Đơn vừa đổi trạng thái (`ngu_canh.capNhat`) — chat render dạng thông báo
 * hệ thống kèm lý do, không phải caption tin thường.
 */
export type ChatDonCapNhat = {
  /** Enum trạng thái mới, vd `huy`. */
  trangThai: string;
  /** Nhãn tiếng Việt của trạng thái, vd «Đã hủy». */
  nhan: string;
  /** Lý do hủy (chỉ khi `trangThai=huy`). */
  lyDo?: string | null;
  boi?: ChatDonCapNhatBoi | null;
  luc?: string | null;
};

/** Snapshot card ngữ cảnh (lưu trong `chat_tin_nhan.ngu_canh`). */
export type ChatContextCard = {
  loai: ChatContextLoai | string;
  id: string;
  tieuDe: string;
  moTa?: string | null;
  anh?: string | null;
  href?: string | null;
  orgTen?: string | null;
  /** Logo/avatar CSĐT — tách khỏi `anh` (VietQR trên đơn học phí). */
  orgAnh?: string | null;
  capNhat?: ChatDonCapNhat | null;
};

/** Người được @nhắc — lưu trong `chat_tin_nhan.ngu_canh.mentions`. */
export type ChatMentionRef = {
  id: string;
  slug: string;
  ten: string;
};

/** Người đã thả một emoji trên tin — dùng popover xem ai react. */
export type ChatReactionActor = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
};

export type ChatReactionSummary = {
  emoji: string;
  count: number;
  viewerReacted: boolean;
  /** Danh sách người thả (theo tao_luc mới → cũ). */
  actors?: ChatReactionActor[];
};

export type ChatMessageReplyPreview = {
  id: string;
  from: "me" | "them";
  body: string;
  kind?: ChatMessageKind;
  imageUrl?: string | null;
  deleted?: boolean;
};

/** Ai đã trả lời dưới danh nghĩa tổ chức — chỉ member org. */
export type ChatOrgReplyHint = {
  name: string;
  vaiTroLabel: string;
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
  /** Video chat trên R2 (loai_tin='media' + content_media.loai_media='video'). */
  videoKey?: string | null;
  videoUrl?: string | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoDurationS?: number | null;
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
  /** Pedagogy lớp — mở bài / nộp / lưu / Journey. */
  lopBai?: ChatLopBaiNotice | null;
  /** Bình luận trên canvas — dòng nhỏ trong feed. */
  canvasBinhLuan?: ChatCanvasBinhLuanNotice | null;
  /** Lịch sử / tín hiệu cuộc gọi trong phòng. */
  cuocGoi?: ChatCuocGoiNotice | null;
  /** Tin được chuyển tiếp từ hội thoại khác (`ngu_canh.chuyenTiep`). */
  forwarded?: boolean;
  /**
   * Hint nội bộ phòng tư vấn org — chỉ member org thấy ai trả lời dưới danh nghĩa tổ chức.
   * Không trả về cho khách/HV (server redact).
   */
  orgReplyHint?: ChatOrgReplyHint | null;
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
  /**
   * Phòng `1_org`: cursor phía tổ chức (watermark staff gộp thành 1).
   * UI hiện avatar/tên org — không lộ profile admin.
   */
  asOrg?: boolean;
  orgKind?: ChatOrgKind;
};

export type ChatParticipantKind = "user" | "org";

export type ChatThreadGroup = "ban_be" | "nguoi_la" | "to_chuc";

/**
 * Tab UI cấp 1 — «Mua bán» gom mua/bán (chiều phụ, không thay `ChatThreadGroup`).
 */
export type ChatThreadView = ChatThreadGroup | "mua_ban";

/** Sub-tab trong «Mua bán»: buyer | seller. */
export type ChatMuaBanSub = "mua_hang" | "khach_hang";

export const CHAT_MUA_BAN_SUB_ORDER: ChatMuaBanSub[] = [
  "mua_hang",
  "khach_hang",
];

export const CHAT_MUA_BAN_SUB_LABEL: Record<ChatMuaBanSub, string> = {
  mua_hang: "Mua hàng",
  khach_hang: "Khách hàng",
};

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
  /** Phòng «Gửi riêng cho tôi» — chat với chính mình, luôn ghim đầu danh sách. */
  isSelf?: boolean;
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
  /**
   * Logo org — branding node «Tổ chức của tôi».
   * Staff inbox giữ `avatarUrl` = học viên; dùng field này cho avatar org.
   */
  orgAvatarUrl?: string | null;
  /** Org đại diện — dùng dedupe thread tab Tổ chức. */
  orgId?: string;
  /** Slug org — nút «Mở» trang quản lý tin nhắn. */
  orgSlug?: string;
  /** Tên org đại diện — inbox staff: user nhắn tới org nào. */
  orgTen?: string | null;
  /** Phòng lớp (`loai_phong=lop_hoc`) — không dedupe với 1_org. */
  lopHocId?: string;
  /** Hub chat chung CSĐT (`loai_context=csdt_hub`) — cha của phòng lớp. */
  isOrgHub?: boolean;
  /** Phòng tư vấn 1_org (`org_student`) — tách UI với hub. */
  isOrgAdvisory?: boolean;
  /**
   * Viewer là member active của org đại diện — dùng realtime redact + badge vai trò.
   * Chỉ set khi đã xác nhận server-side.
   */
  viewerIsOrgMember?: boolean;
  /** Nhãn vai trò viewer trong org (vd. «Quản trị») — tab «Tổ chức của tôi». */
  viewerOrgVaiTroLabel?: string | null;
  /** Thread hộp thư staff (góc nhìn admin) — filter «Tổ chức của tôi». */
  isOrgStaffInbox?: boolean;
  /**
   * Trạng thái trả lời hộp thư staff (`open` = tin cuối từ HV).
   * Chỉ set trên `isOrgStaffInbox`.
   */
  orgInboxStatus?: "open" | "replied";
  preview: string;
  lastAt: string;
  unread: number;
  /** Số tin chưa đọc có @nhắc viewer (nhóm/project). */
  unreadMentions?: number;
  online?: boolean;
  typing?: boolean;
  messages: ChatMessage[];
  /**
   * Viewer là seller và peer đã mua hàng của viewer (chỉ seller thấy).
   * Chỉ gắn trên DM cá nhân↔cá nhân — không gắn inbox tư vấn org.
   * Không đụng `group` — khách hàng vẫn nằm ở ban_be/nguoi_la.
   */
  isKhachHang?: boolean;
  /** Số đơn (loại nháp) — tooltip/sort tab Khách hàng. */
  khachHangSoDon?: number;
  /** Mọi đơn đều hủy → UI hiện nhạt. */
  khachHangChiDonHuy?: boolean;
  /** Thẻ phân loại do seller gán (server chỉ trả cho seller). */
  khachHangTagIds?: string[];
  /**
   * Viewer là buyer và peer là seller đã bán cho viewer.
   * Chỉ gắn trên DM cá nhân↔cá nhân — không gắn inbox tư vấn org.
   * Không đụng `group` — vẫn nằm ở ban_be/nguoi_la.
   */
  isMuaHang?: boolean;
  /** Số đơn (loại nháp) với seller này. */
  muaHangSoDon?: number;
  /** Mọi đơn đều hủy → UI hiện nhạt. */
  muaHangChiDonHuy?: boolean;
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

/** Tên hiển thị phòng chat với chính mình. */
export const CHAT_SELF_THREAD_NAME = "Gửi riêng cho tôi";

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

/** Thứ tự tab UI cấp 1 (Mua bán = shop mua/bán). */
export const CHAT_THREAD_VIEW_ORDER: ChatThreadView[] = [
  "ban_be",
  "nguoi_la",
  "to_chuc",
  "mua_ban",
];

export const CHAT_THREAD_VIEW_LABEL: Record<ChatThreadView, string> = {
  ban_be: "Bạn bè",
  nguoi_la: "Người lạ",
  to_chuc: "Tổ chức",
  mua_ban: "Mua bán",
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
  /** Sub-filter tab Tổ chức khi mở overlay. */
  toChucFilter?: "all" | "cua_toi" | "tham_gia";
  resolving?: boolean;
  /** Card ngữ cảnh chờ — chèn vào ô soạn; gửi khi user gửi tin (hoặc autoSend). */
  nguCanh?: ChatContextCard | null;
  /** Tự gửi card ngữ cảnh ngay khi phòng sẵn sàng (vd. đơn shop). */
  autoSendNguCanh?: boolean;
  /** Cloudflare image id — tự gửi ảnh sau card (vd. biên lai thanh toán). */
  autoSendImageId?: string | null;
  autoSendImageUrl?: string | null;
};

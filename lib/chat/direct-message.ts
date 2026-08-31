import "server-only";

import type { GiaiDoan } from "@/lib/auth/session";
import { getAvatarUrl, getGiaiDoanLabel } from "@/lib/journey/profile";
import { getQuanHe, isFriend } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  avatarHueFromSeed,
  avatarInitialFromName,
} from "@/lib/chat/avatar";
import { ensureChatMediaId } from "@/lib/chat/chat-media";
import {
  chatImageDeliveryUrl,
  isCloudflareImageId,
} from "@/lib/chat/image-url";
import { buildChatVideoUrl, isChatVideoKey } from "@/lib/chat/video-url";
import {
  loadPinnedMessageIds,
  loadReactionsForMessages,
} from "@/lib/chat/message-enrich";
import {
  markOrgInboxNotifyRead,
  notifyOrgAdminsOfStudentMessage,
} from "@/lib/chat/org-inbox-notify";
import {
  applyOrgAdvisoryPerspective,
  applyOrgAdvisoryPerspectiveToMessage,
} from "@/lib/chat/org-reply-perspective";
import { listRoomReadCursors } from "@/lib/chat/read-cursors";
import { loadPollsForMessages } from "@/lib/chat/room-poll";
import { resolveOwnedUserEmojiMuc } from "@/lib/user-emoji/resolve-owned";
import { parseChatCanvasBinhLuan, parseChatCuocGoi, parseChatForwarded, parseChatMocNhac, parseChatNguCanh, parseChatMessageMentions } from "@/lib/chat/message-perspective";
import {
  noiDungLopBaiChoHocVien,
  parseLopBaiNguCanh,
} from "@/lib/chat/lop-bai-notice";
import {
  noiDungChaoLopChoHocVien,
  parseChatChaoLop,
} from "@/lib/chat/chao-lop-notice";
import { parseChatPhongLopInvite } from "@/lib/chat/phong-lop-invite";
import { parseChatShopDonKhaoSat } from "@/lib/chat/shop-don-khao-sat-notice";
import type {
  ChatContextCard,
  ChatMessage,
  ChatMessageKind,
  ChatMessageReplyPreview,
  ChatReactionSummary,
  ChatReadCursor,
  ChatThread,
  ChatThreadGroup,
} from "@/lib/chat/types";
import { CHAT_SELF_THREAD_NAME } from "@/lib/chat/types";
import {
  normalizeChiHienCho,
  tinHienVoiViewer,
} from "@/lib/chat/visibility";
import { insertChatMessageRow } from "@/lib/chat/insert-message";
import {
  buildNguCanhPayload,
  countUnreadMentions,
  resolveMentionsAgainstMembers,
  type ChatMentionMember,
} from "@/lib/chat/mentions";

const DM_ROOM = "1_1";
const MESSAGE_PAGE_SIZE = 30;

export type ListRoomMessagesOptions = {
  limit?: number;
  before?: string;
  /**
   * Catch-up delta: chỉ lấy tin **mới hơn** cursor (id tin). Loại trừ với `before`.
   * Nhánh này **không** trả `readCursors`/`pinnedMessages` và **không bao giờ**
   * mark read — client chỉ dùng để bù tin miss khi WS zombie / gap reconnect.
   */
  after?: string;
  markRead?: boolean;
};

export type ListRoomMessagesResult = {
  messages: ChatMessage[];
  hasMore: boolean;
  /** @deprecated Dùng readCursors. */
  peerReadUpToId?: string | null;
  readCursors?: ChatReadCursor[];
  pinnedMessages?: ChatMessage[];
};

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
  giai_doan: GiaiDoan | null;
};

export type MessageRow = {
  id: string;
  id_phong: string;
  id_nguoi_gui: string;
  noi_dung: string | null;
  loai_tin?: string | null;
  id_dinh_kem?: string | null;
  id_tin_tra_loi?: string | null;
  ngu_canh?: ChatContextCard | null;
  tao_luc: string;
  da_xoa?: boolean;
  da_sua?: boolean;
  sua_luc?: string | null;
  /** P3b: null = cả phòng; mảng = chỉ các id này thấy. */
  chi_hien_cho?: string[] | null;
  content_media?: ContentMediaRow | ContentMediaRow[] | null;
};

type ContentMediaRow = {
  cloudflare_id: string | null;
  loai_media?: string | null;
  width?: number | null;
  height?: number | null;
  duration_s?: number | null;
};

type NormalizedMessageRow = Omit<MessageRow, "content_media"> & {
  content_media?: ContentMediaRow | null;
};

function normalizeMessageRow(row: MessageRow): NormalizedMessageRow {
  const media = row.content_media;
  if (Array.isArray(media)) {
    return { ...row, content_media: media[0] ?? null };
  }
  return { ...row, content_media: media ?? null };
}

export const MESSAGE_SELECT =
  "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc, chi_hien_cho, content_media(cloudflare_id, loai_media, width, height, duration_s)";

type ReadRow = {
  id_phong: string;
  id_tin_nhan_cuoi_doc: string;
  cap_nhat_luc: string;
};

export function messagePreview(row: MessageRow): string {
  if (row.da_xoa) return "Đã thu hồi tin nhắn";
  const normalized = normalizeMessageRow(row);
  const canvasBinhLuan = parseChatCanvasBinhLuan(normalized.ngu_canh);
  if (canvasBinhLuan) {
    return (
      normalized.noi_dung?.trim() ||
      (canvasBinhLuan.soLuong <= 1
        ? `${canvasBinhLuan.tenNguoi} vừa có một bình luận`
        : `${canvasBinhLuan.tenNguoi} vừa có ${canvasBinhLuan.soLuong} bình luận`)
    );
  }
  const cuocGoi = parseChatCuocGoi(normalized.ngu_canh);
  if (cuocGoi) {
    return normalized.noi_dung?.trim() || "Cuộc gọi";
  }
  const mocNhac = parseChatMocNhac(normalized.ngu_canh);
  if (mocNhac) {
    return normalized.noi_dung?.trim() || `Nhắc mốc: ${mocNhac.ten}`;
  }
  const shopKhaoSat = parseChatShopDonKhaoSat(normalized.ngu_canh);
  if (shopKhaoSat) {
    return normalized.noi_dung?.trim() || "Xác nhận nhận hàng";
  }
  const phongLop = parseChatPhongLopInvite(normalized.ngu_canh);
  if (phongLop) {
    return normalized.noi_dung?.trim() || "Tham gia phòng học";
  }
  const chaoLop = parseChatChaoLop(normalized.ngu_canh);
  if (chaoLop) {
    return normalized.noi_dung?.trim() || noiDungChaoLopChoHocVien();
  }
  const nguCanh = parseNguCanh(normalized.ngu_canh);
  if (nguCanh) {
    return `Trao đổi về: ${nguCanh.tieuDe}`;
  }
  if (normalized.loai_tin === "media") {
    const isVideo = normalized.content_media?.loai_media === "video";
    const caption = normalized.noi_dung?.trim() || "";
    if (caption && !isCloudflareImageId(caption) && !isChatVideoKey(caption)) {
      return caption;
    }
    return isVideo ? "Video" : "Ảnh";
  }
  if (normalized.loai_tin === "sticker") return "Meme";
  if (normalized.loai_tin === "binh_chon") {
    return `Bình chọn: ${normalized.noi_dung?.trim() || ""}`;
  }
  if (normalized.loai_tin === "system") {
    return normalized.noi_dung?.trim() || "Nhắc mốc";
  }
  return normalized.noi_dung?.trim() || "";
}

function resolveImageId(row: NormalizedMessageRow): string | null {
  const fromMedia = row.content_media?.cloudflare_id?.trim();
  if (fromMedia && isCloudflareImageId(fromMedia)) return fromMedia;

  const fromBody = row.noi_dung?.trim() || "";
  if (isCloudflareImageId(fromBody)) return fromBody;

  return null;
}

type ResolvedChatVideo = {
  key: string;
  url: string | null;
  width: number | null;
  height: number | null;
  durationS: number | null;
};

/** Media video chat trên R2 — `loai_media='video'` + `cloudflare_id` là R2 key. */
function resolveVideo(row: NormalizedMessageRow): ResolvedChatVideo | null {
  const media = row.content_media;
  if (!media || media.loai_media !== "video") return null;
  const key = media.cloudflare_id?.trim() || "";
  if (!isChatVideoKey(key)) return null;
  return {
    key,
    url: buildChatVideoUrl(key),
    width: typeof media.width === "number" ? media.width : null,
    height: typeof media.height === "number" ? media.height : null,
    durationS: typeof media.duration_s === "number" ? media.duration_s : null,
  };
}

type MapMessageExtras = {
  reactions?: ChatReactionSummary[];
  pinned?: boolean;
  replyTo?: ChatMessageReplyPreview | null;
  readByPeer?: boolean;
};

function parseNguCanh(raw: unknown): ChatContextCard | null {
  return parseChatNguCanh(raw);
}

export function mapMessageFromRow(
  row: MessageRow,
  viewerId: string,
  extras: MapMessageExtras = {},
): ChatMessage {
  const normalized = normalizeMessageRow(row);
  const canvasBinhLuan = parseChatCanvasBinhLuan(normalized.ngu_canh);
  const cuocGoi = canvasBinhLuan
    ? null
    : parseChatCuocGoi(normalized.ngu_canh);
  const mocNhac = canvasBinhLuan || cuocGoi
    ? null
    : parseChatMocNhac(normalized.ngu_canh);
  const phongLop =
    canvasBinhLuan || cuocGoi || mocNhac
      ? null
      : parseChatPhongLopInvite(normalized.ngu_canh);
  const shopDonKhaoSat =
    canvasBinhLuan || cuocGoi || mocNhac || phongLop
      ? null
      : parseChatShopDonKhaoSat(normalized.ngu_canh);
  const chaoLop =
    canvasBinhLuan || cuocGoi || mocNhac || phongLop || shopDonKhaoSat
      ? null
      : parseChatChaoLop(normalized.ngu_canh);
  const lopBai =
    canvasBinhLuan || cuocGoi || mocNhac || phongLop || shopDonKhaoSat || chaoLop
      ? null
      : parseLopBaiNguCanh(normalized.ngu_canh);
  const nguCanh =
    canvasBinhLuan || cuocGoi || mocNhac || phongLop || shopDonKhaoSat || chaoLop || lopBai
      ? null
      : parseNguCanh(normalized.ngu_canh);
  const mentions =
    canvasBinhLuan || cuocGoi || mocNhac || phongLop || shopDonKhaoSat || chaoLop || lopBai
      ? []
      : parseChatMessageMentions(normalized.ngu_canh);
  const forwarded = parseChatForwarded(normalized.ngu_canh);
  const kind: ChatMessageKind = canvasBinhLuan
    ? "canvas_binh_luan"
    : cuocGoi
      ? "cuoc_goi"
      : mocNhac
        ? "moc_nhac"
        : shopDonKhaoSat
          ? "shop_don_khao_sat"
          : phongLop
            ? "phong_lop"
            : chaoLop
              ? "chao_lop"
              : lopBai
                ? "lop_bai"
                : nguCanh
                  ? "context"
                  : normalized.loai_tin === "sticker"
                    ? "sticker"
                    : normalized.loai_tin === "media"
                      ? "media"
                      : normalized.loai_tin === "binh_chon"
                        ? "binh_chon"
                        : normalized.loai_tin === "system"
                          ? "moc_nhac"
                          : "text";
  const video = kind === "media" ? resolveVideo(normalized) : null;
  const imageId =
    !video && (kind === "media" || kind === "sticker")
      ? resolveImageId(normalized)
      : null;
  let body = normalized.noi_dung?.trim() || "";

  if (kind === "sticker") {
    body = "";
  } else if (kind === "media" && imageId && body === imageId) {
    body = "";
  } else if (video && body === video.key) {
    body = "";
  } else if (chaoLop && normalized.id_nguoi_gui === viewerId) {
    body = noiDungChaoLopChoHocVien();
  } else if (lopBai && lopBai.idNguoiDung === viewerId) {
    body = noiDungLopBaiChoHocVien(lopBai.loai, lopBai.tenBai || "bài tập");
  }

  return {
    id: normalized.id,
    from: normalized.id_nguoi_gui === viewerId ? "me" : "them",
    senderUserId: normalized.id_nguoi_gui,
    body,
    sentAt: normalized.tao_luc,
    kind,
    imageId,
    imageUrl: imageId ? chatImageDeliveryUrl(imageId) : null,
    videoKey: video?.key ?? null,
    videoUrl: video?.url ?? null,
    videoWidth: video?.width ?? null,
    videoHeight: video?.height ?? null,
    videoDurationS: video?.durationS ?? null,
    deleted: Boolean(normalized.da_xoa),
    edited: Boolean(normalized.da_sua),
    editedAt: normalized.sua_luc ?? null,
    replyTo: extras.replyTo ?? null,
    reactions: extras.reactions,
    pinned: extras.pinned,
    readByPeer: extras.readByPeer,
    nguCanh,
    mentions: mentions.length > 0 ? mentions : undefined,
    poll: null,
    mocNhac,
    shopDonKhaoSat,
    phongLop,
    chaoLop,
    lopBai,
    canvasBinhLuan,
    cuocGoi,
    forwarded: forwarded || undefined,
  };
}

function mapMessage(row: MessageRow, viewerId: string): ChatMessage {
  return mapMessageFromRow(row, viewerId);
}

function buildReplyPreview(
  row: MessageRow,
  viewerId: string,
): ChatMessageReplyPreview {
  const msg = mapMessageFromRow(row, viewerId);
  return {
    id: msg.id,
    from: msg.from,
    body: msg.deleted ? "" : msg.body,
    kind: msg.kind,
    imageUrl: msg.deleted ? null : msg.imageUrl,
    deleted: msg.deleted,
  };
}

export async function enrichMessages(
  rows: MessageRow[],
  viewerId: string,
  roomId: string,
  _peerReadUpToId?: string | null,
): Promise<ChatMessage[]> {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const messageIds = rows.map((row) => row.id);
  const pollMessageIds = rows
    .filter((row) => row.loai_tin === "binh_chon")
    .map((row) => row.id);
  const [reactionsByMessage, pinnedIds, pollsByMessage] = await Promise.all([
    loadReactionsForMessages(messageIds, viewerId),
    loadPinnedMessageIds(roomId),
    loadPollsForMessages(pollMessageIds, viewerId),
  ]);

  const missingReplyIds = [
    ...new Set(
      rows
        .map((row) => row.id_tin_tra_loi)
        .filter((id): id is string => Boolean(id && !rowById.has(id))),
    ),
  ];

  const admin = createServiceRoleClient();
  if (missingReplyIds.length > 0) {
    const { data: replyRows } = await admin
      .from("chat_tin_nhan")
      .select(MESSAGE_SELECT)
      .in("id", missingReplyIds);
    for (const replyRow of replyRows ?? []) {
      rowById.set(replyRow.id, replyRow as MessageRow);
    }
  }

  return rows.map((row) => {
    const replyId = row.id_tin_tra_loi;
    const replyRow = replyId ? rowById.get(replyId) : undefined;

    const mapped = mapMessageFromRow(row, viewerId, {
      reactions: reactionsByMessage.get(row.id),
      pinned: pinnedIds.has(row.id),
      replyTo: replyId
        ? replyRow
          ? buildReplyPreview(replyRow, viewerId)
          : { id: replyId, from: "them", body: "", deleted: true }
        : null,
    });
    const poll = pollsByMessage.get(row.id);
    if (poll) mapped.poll = poll;
    return mapped;
  });
}

export async function fetchMessageById(
  messageId: string,
  viewerId: string,
): Promise<ChatMessage | null> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .maybeSingle<MessageRow>();

  if (!row) return null;
  return enrichMessageFromRow(row, viewerId);
}

/**
 * Phần làm giàu tin (reactions / ghim / tin trả lời) tách khỏi `fetchMessageById`.
 * Đường gửi tin đã có sẵn row từ `INSERT ... RETURNING` (cùng `MESSAGE_SELECT`),
 * nên gọi trực tiếp vào đây để **bỏ một round-trip đọc lại tin vừa ghi**.
 */
export async function enrichMessageFromRow(
  row: MessageRow,
  viewerId: string,
): Promise<ChatMessage | null> {
  const admin = createServiceRoleClient();
  const messageId = row.id;

  if (!tinHienVoiViewer(row.chi_hien_cho, viewerId)) return null;

  const [reactions, pinnedIds] = await Promise.all([
    loadReactionsForMessages([messageId], viewerId),
    loadPinnedMessageIds(row.id_phong),
  ]);

  let replyTo: ChatMessageReplyPreview | null = null;
  if (row.id_tin_tra_loi) {
    const { data: replyRow } = await admin
      .from("chat_tin_nhan")
      .select(MESSAGE_SELECT)
      .eq("id", row.id_tin_tra_loi)
      .maybeSingle<MessageRow>();
    if (replyRow) {
      replyTo = buildReplyPreview(replyRow, viewerId);
    }
  }

  return mapMessageFromRow(row, viewerId, {
    reactions: reactions.get(messageId),
    pinned: pinnedIds.has(messageId),
    replyTo,
  });
}

function buildUserThread(
  roomId: string,
  peer: ProfileRow,
  group: ChatThreadGroup,
  preview: string,
  lastAt: string,
  unread: number,
  messages: ChatMessage[] = [],
): ChatThread {
  const name = peer.ten_hien_thi?.trim() || peer.slug;
  return {
    id: roomId,
    roomId,
    peerUserId: peer.id,
    peerSlug: peer.slug?.trim() || undefined,
    name,
    group,
    kind: "user",
    role: getGiaiDoanLabel(peer.giai_doan),
    avatarInitial: avatarInitialFromName(name),
    avatarHue: avatarHueFromSeed(peer.id),
    avatarUrl: getAvatarUrl(peer.avatar_id),
    preview,
    lastAt,
    unread,
    messages,
  };
}

/**
 * Thread «Gửi riêng cho tôi» — phòng 1_1 chỉ có 1 membership của chính viewer.
 * Kho lưu cá nhân (link, ảnh, ghi chú); luôn ghim đầu danh sách phía client.
 */
function buildSelfThread(
  roomId: string,
  me: ProfileRow,
  preview: string,
  lastAt: string,
): ChatThread {
  return {
    id: roomId,
    roomId,
    peerUserId: me.id,
    peerSlug: me.slug?.trim() || undefined,
    isSelf: true,
    name: CHAT_SELF_THREAD_NAME,
    group: "ban_be",
    kind: "user",
    role: "Chỉ mình bạn thấy",
    avatarInitial: avatarInitialFromName(me.ten_hien_thi?.trim() || me.slug),
    avatarHue: avatarHueFromSeed(me.id),
    avatarUrl: getAvatarUrl(me.avatar_id),
    preview,
    lastAt,
    unread: 0,
    messages: [],
  };
}

const SELF_THREAD_EMPTY_PREVIEW = "Lưu ghi chú, link và ảnh cho riêng bạn";

/**
 * Tìm phòng self của viewer: phòng 1_1 mà viewer là thành viên, và phòng đó
 * chỉ có đúng 1 membership (kể cả đã rời) — phân biệt với DM mà peer đã rời.
 */
async function findSelfRoomId(viewerId: string): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: myMemberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, chat_phong!inner(loai_phong)")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", DM_ROOM);

  const roomIds = (myMemberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return null;

  const { data: allRows } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, id_nguoi_dung")
    .in("id_phong", roomIds);

  const membersByRoom = new Map<string, Set<string>>();
  for (const row of allRows ?? []) {
    const set = membersByRoom.get(row.id_phong) ?? new Set<string>();
    set.add(row.id_nguoi_dung);
    membersByRoom.set(row.id_phong, set);
  }

  for (const roomId of roomIds) {
    const members = membersByRoom.get(roomId);
    if (members && members.size === 1 && members.has(viewerId)) {
      return roomId;
    }
  }
  return null;
}

/** Mở (hoặc tạo) phòng «Gửi riêng cho tôi». */
export async function openSelfRoom(
  viewerId: string,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: me } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .eq("id", viewerId)
    .maybeSingle<ProfileRow>();

  if (!me) {
    return { ok: false, error: "Không tìm thấy người dùng." };
  }

  let roomId = await findSelfRoomId(viewerId);

  if (!roomId) {
    const { data: room, error: roomError } = await admin
      .from("chat_phong")
      .insert({ loai_phong: DM_ROOM })
      .select("id")
      .single<{ id: string }>();

    if (roomError || !room) {
      return { ok: false, error: "Không tạo được phòng chat." };
    }

    roomId = room.id;
    const { error: memberError } = await admin
      .from("chat_thanh_vien")
      .insert([{ id_phong: roomId, id_nguoi_dung: viewerId }]);

    if (memberError) {
      return { ok: false, error: "Không thêm thành viên phòng chat." };
    }
  }

  const { data: lastMessage } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<MessageRow>();

  return {
    ok: true,
    thread: buildSelfThread(
      roomId,
      me,
      lastMessage ? messagePreview(lastMessage) : SELF_THREAD_EMPTY_PREVIEW,
      lastMessage?.tao_luc ?? new Date().toISOString(),
    ),
  };
}

async function loadAcceptedFriendIds(viewerId: string): Promise<Set<string>> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_ket_ban")
    .select("id_nguoi_gui, id_nguoi_nhan, trang_thai")
    .or(`id_nguoi_gui.eq.${viewerId},id_nguoi_nhan.eq.${viewerId}`)
    .eq("trang_thai", "accepted");

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const other =
      row.id_nguoi_gui === viewerId ? row.id_nguoi_nhan : row.id_nguoi_gui;
    if (other) ids.add(other);
  }
  return ids;
}

export async function assertRoomMember(roomId: string, viewerId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .maybeSingle();

  if (!data) {
    throw new Error("FORBIDDEN");
  }
}

async function findDirectRoomId(
  viewerId: string,
  targetUserId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: myMemberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null);

  const roomIds = (myMemberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) return null;

  const { data: sharedRows } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, chat_phong!inner(loai_phong, cap_nhat_luc)")
    .eq("id_nguoi_dung", targetUserId)
    .in("id_phong", roomIds)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", DM_ROOM);

  if (!sharedRows?.length) return null;
  if (sharedRows.length === 1) return sharedRows[0].id_phong;

  // Trùng phòng 1_1 cùng peer (race tạo) → chọn phòng cập nhật gần nhất.
  let bestId = sharedRows[0].id_phong as string;
  let bestAt = 0;
  for (const row of sharedRows) {
    const room = row.chat_phong as
      | { cap_nhat_luc?: string }
      | { cap_nhat_luc?: string }[]
      | null;
    const meta = Array.isArray(room) ? room[0] : room;
    const at = meta?.cap_nhat_luc
      ? new Date(meta.cap_nhat_luc).getTime()
      : 0;
    if (at >= bestAt) {
      bestAt = at;
      bestId = row.id_phong as string;
    }
  }
  return bestId;
}

/** Một peer = một thread DM; giữ phòng mới nhất, cộng unread. */
function dedupeDirectThreadsByPeer(threads: ChatThread[]): ChatThread[] {
  const byPeer = new Map<string, ChatThread>();
  for (const thread of threads) {
    const peerId = thread.peerUserId;
    if (!peerId || thread.isSelf) continue;
    const existing = byPeer.get(peerId);
    if (!existing) {
      byPeer.set(peerId, thread);
      continue;
    }
    const keepIncoming =
      new Date(thread.lastAt).getTime() >= new Date(existing.lastAt).getTime();
    const primary = keepIncoming ? thread : existing;
    const secondary = keepIncoming ? existing : thread;
    byPeer.set(peerId, {
      ...primary,
      unread: primary.unread + secondary.unread,
    });
  }
  return [...byPeer.values()];
}

export async function assertCanDirectMessage(
  viewerId: string,
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!viewerId || !targetUserId) {
    return { ok: false, error: "Thiếu thông tin người dùng." };
  }
  if (viewerId === targetUserId) {
    return { ok: false, error: "Không thể nhắn tin cho chính mình." };
  }

  const admin = createServiceRoleClient();
  const { data: target } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "Không tìm thấy người dùng." };
  }

  const quanHe = await getQuanHe(viewerId, targetUserId);
  if (quanHe === "blocked") {
    return { ok: false, error: "Không thể nhắn tin với người này." };
  }

  return { ok: true };
}

export async function openDirectRoom(
  viewerId: string,
  targetUserId: string,
): Promise<{ ok: true; thread: ChatThread } | { ok: false; error: string }> {
  // Chat với chính mình = phòng «Gửi riêng cho tôi» (nhánh riêng, 1 membership).
  if (viewerId === targetUserId) {
    return openSelfRoom(viewerId);
  }

  const allowed = await assertCanDirectMessage(viewerId, targetUserId);
  if (!allowed.ok) return allowed;

  const admin = createServiceRoleClient();
  let roomId = await findDirectRoomId(viewerId, targetUserId);

  if (!roomId) {
    const { data: room, error: roomError } = await admin
      .from("chat_phong")
      .insert({ loai_phong: DM_ROOM })
      .select("id")
      .single<{ id: string }>();

    if (roomError || !room) {
      return { ok: false, error: "Không tạo được phòng chat." };
    }

    roomId = room.id;
    const { error: memberError } = await admin.from("chat_thanh_vien").insert([
      { id_phong: roomId, id_nguoi_dung: viewerId },
      { id_phong: roomId, id_nguoi_dung: targetUserId },
    ]);

    if (memberError) {
      return { ok: false, error: "Không thêm thành viên phòng chat." };
    }

    // Bước 3.1 — tạo meeting CF sớm (fire-and-forget; ensure lúc gọi vẫn fallback).
    void import("@/lib/media/cloudflare-realtimekit")
      .then(({ ensureCloudflareMeetingForRoom }) =>
        ensureCloudflareMeetingForRoom({
          chatPhongId: roomId!,
          title: "Cuộc gọi",
        }),
      )
      .catch(() => {});
  }

  const thread = await getDirectThread(roomId, viewerId);
  if (!thread) {
    return { ok: false, error: "Không tải được hội thoại." };
  }

  return {
    ok: true,
    thread: {
      ...thread,
      messages: [],
    },
  };
}

async function getDirectThread(
  roomId: string,
  viewerId: string,
): Promise<ChatThread | null> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, cap_nhat_luc")
    .eq("id", roomId)
    .eq("loai_phong", DM_ROOM)
    .maybeSingle<{ id: string; loai_phong: string; cap_nhat_luc: string }>();

  if (!room) return null;

  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null);

  const memberIds = (members ?? []).map((row) => row.id_nguoi_dung);
  const peerId = memberIds.find((id) => id !== viewerId);

  // Phòng self: đúng 1 membership (kể cả đã rời) của chính viewer —
  // phân biệt với DM mà peer đã rời phòng.
  const { count: totalMemberships } = !peerId
    ? await admin
        .from("chat_thanh_vien")
        .select("id", { count: "exact", head: true })
        .eq("id_phong", roomId)
    : { count: null };

  if (
    !peerId &&
    memberIds.length === 1 &&
    memberIds[0] === viewerId &&
    totalMemberships === 1
  ) {
    const { data: me } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
      .eq("id", viewerId)
      .maybeSingle<ProfileRow>();
    if (!me) return null;

    const { data: lastSelf } = await admin
      .from("chat_tin_nhan")
      .select(MESSAGE_SELECT)
      .eq("id_phong", roomId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<MessageRow>();

    return buildSelfThread(
      roomId,
      me,
      lastSelf ? messagePreview(lastSelf) : SELF_THREAD_EMPTY_PREVIEW,
      lastSelf?.tao_luc ?? room.cap_nhat_luc,
    );
  }

  if (!peerId) return null;

  const { data: peer } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .eq("id", peerId)
    .maybeSingle<ProfileRow>();

  if (!peer) return null;

  const friend = await isFriend(viewerId, peerId);
  const group: ChatThreadGroup = friend ? "ban_be" : "nguoi_la";

  const { data: lastMessage } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<MessageRow>();

  const unread = await countUnreadInRoom(roomId, viewerId);

  return buildUserThread(
    roomId,
    peer,
    group,
    lastMessage ? messagePreview(lastMessage) : "Bắt đầu trò chuyện",
    lastMessage?.tao_luc ?? room.cap_nhat_luc,
    unread,
  );
}

export async function countUnreadInRoom(roomId: string, viewerId: string): Promise<number> {
  const admin = createServiceRoleClient();

  const { data: readState } = await admin
    .from("chat_da_doc")
    .select("cap_nhat_luc")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .maybeSingle<{ cap_nhat_luc: string }>();

  const readAt = readState?.cap_nhat_luc ?? null;

  let query = admin
    .from("chat_tin_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .neq("id_nguoi_gui", viewerId)
    .or("ngu_canh.is.null,ngu_canh->>loai.neq.chao_lop");

  if (readAt) {
    query = query.gt("tao_luc", readAt);
  }

  const { count } = await query;
  return count ?? 0;
}

async function loadGroupMentionMembers(
  roomId: string,
): Promise<ChatMentionMember[]> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong")
    .eq("id", roomId)
    .maybeSingle<{ loai_phong: string }>();

  if (!room || room.loai_phong === DM_ROOM) return [];

  const { data: memberships } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null);

  const userIds = [...new Set((memberships ?? []).map((m) => m.id_nguoi_dung))];
  if (userIds.length === 0) return [];

  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .in("id", userIds)
    .returns<Array<{ id: string; slug: string; ten_hien_thi: string }>>();

  return (profiles ?? []).map((p) => ({
    userId: p.id,
    slug: p.slug,
    tenHienThi: p.ten_hien_thi?.trim() || p.slug,
  }));
}

export async function countUnreadMentionsInRoom(
  roomId: string,
  viewerId: string,
): Promise<number> {
  const admin = createServiceRoleClient();

  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong")
    .eq("id", roomId)
    .maybeSingle<{ loai_phong: string }>();
  if (!room || room.loai_phong === DM_ROOM) return 0;

  const { data: readState } = await admin
    .from("chat_da_doc")
    .select("cap_nhat_luc")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .maybeSingle<{ cap_nhat_luc: string }>();

  const readAt = readState?.cap_nhat_luc ?? null;

  let query = admin
    .from("chat_tin_nhan")
    .select("id_nguoi_gui, tao_luc, ngu_canh, da_xoa")
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .neq("id_nguoi_gui", viewerId);

  if (readAt) {
    query = query.gt("tao_luc", readAt);
  }

  const { data: rows } = await query;
  return countUnreadMentions(rows ?? [], viewerId, null);
}

function countUnreadForRoom(
  roomId: string,
  viewerId: string,
  messages: MessageRow[],
  readAt: string | null,
): number {
  return messages.filter(
    (msg) =>
      msg.id_phong === roomId &&
      msg.id_nguoi_gui !== viewerId &&
      tinHienVoiViewer(msg.chi_hien_cho, viewerId) &&
      (!readAt || msg.tao_luc > readAt) &&
      parseChatChaoLop(msg.ngu_canh) == null,
  ).length;
}

export async function listDirectThreads(viewerId: string): Promise<ChatThread[]> {
  const admin = createServiceRoleClient();
  const friendIds = await loadAcceptedFriendIds(viewerId);

  const { data: memberships } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, chat_phong!inner(id, loai_phong, cap_nhat_luc)")
    .eq("id_nguoi_dung", viewerId)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", DM_ROOM);

  const roomIds = (memberships ?? []).map((row) => row.id_phong);
  if (roomIds.length === 0) {
    const created = await openSelfRoom(viewerId);
    return created.ok ? [created.thread] : [];
  }

  const { data: allMembers } = await admin
    .from("chat_thanh_vien")
    .select("id_phong, id_nguoi_dung")
    .in("id_phong", roomIds)
    .is("roi_luc", null);

  const peerByRoom = new Map<string, string>();
  for (const row of allMembers ?? []) {
    if (row.id_nguoi_dung === viewerId) continue;
    peerByRoom.set(row.id_phong, row.id_nguoi_dung);
  }

  const peerIds = [...new Set(peerByRoom.values())];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .in("id", peerIds)
    .returns<ProfileRow[]>();

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: messages } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .in("id_phong", roomIds)
    .eq("da_xoa", false)
    .or(`chi_hien_cho.is.null,chi_hien_cho.cs.{${viewerId}}`)
    .order("tao_luc", { ascending: false });

  const lastByRoom = new Map<string, MessageRow>();
  for (const msg of messages ?? []) {
    if (!tinHienVoiViewer(msg.chi_hien_cho, viewerId)) continue;
    if (!lastByRoom.has(msg.id_phong)) {
      lastByRoom.set(msg.id_phong, msg);
    }
  }

  const { data: reads } = await admin
    .from("chat_da_doc")
    .select("id_phong, cap_nhat_luc")
    .eq("id_nguoi_dung", viewerId)
    .in("id_phong", roomIds)
    .returns<Array<{ id_phong: string; cap_nhat_luc: string }>>();

  const readAtByRoom = new Map<string, string>();
  for (const read of reads ?? []) {
    if (read.cap_nhat_luc) readAtByRoom.set(read.id_phong, read.cap_nhat_luc);
  }

  const roomUpdatedAt = new Map<string, string>();
  for (const row of memberships ?? []) {
    const room = row.chat_phong as { cap_nhat_luc?: string } | null;
    roomUpdatedAt.set(row.id_phong, room?.cap_nhat_luc ?? new Date(0).toISOString());
  }

  const threads: ChatThread[] = [];
  for (const roomId of roomIds) {
    const peerId = peerByRoom.get(roomId);
    const peer = peerId ? profileById.get(peerId) : null;
    if (!peer || !peerId) continue;

    const last = lastByRoom.get(roomId);
    const group: ChatThreadGroup = friendIds.has(peerId) ? "ban_be" : "nguoi_la";
    const readAt = readAtByRoom.get(roomId) ?? null;

    threads.push(
      buildUserThread(
        roomId,
        peer,
        group,
        last ? messagePreview(last) : "Bắt đầu trò chuyện",
        last?.tao_luc ?? roomUpdatedAt.get(roomId) ?? new Date().toISOString(),
        countUnreadForRoom(roomId, viewerId, messages ?? [], readAt),
      ),
    );
  }

  const deduped = dedupeDirectThreadsByPeer(threads);
  deduped.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  // «Gửi riêng cho tôi»: phòng 1_1 không có peer, đúng 1 membership của viewer.
  // Chưa có thì tạo — mỗi user luôn có đúng 1 phòng self, đứng đầu danh sách.
  let selfThread: ChatThread | null = null;
  const noPeerRoomIds = roomIds.filter((id) => !peerByRoom.has(id));
  if (noPeerRoomIds.length > 0) {
    const { data: totalRows } = await admin
      .from("chat_thanh_vien")
      .select("id_phong, id_nguoi_dung")
      .in("id_phong", noPeerRoomIds);

    const rowsByRoom = new Map<string, Array<string>>();
    for (const row of totalRows ?? []) {
      const list = rowsByRoom.get(row.id_phong) ?? [];
      list.push(row.id_nguoi_dung);
      rowsByRoom.set(row.id_phong, list);
    }

    const selfRoomId = noPeerRoomIds.find((id) => {
      const rows = rowsByRoom.get(id);
      return rows && rows.length === 1 && rows[0] === viewerId;
    });

    if (selfRoomId) {
      const { data: me } = await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
        .eq("id", viewerId)
        .maybeSingle<ProfileRow>();
      if (me) {
        const last = lastByRoom.get(selfRoomId);
        selfThread = buildSelfThread(
          selfRoomId,
          me,
          last ? messagePreview(last) : SELF_THREAD_EMPTY_PREVIEW,
          last?.tao_luc ??
            roomUpdatedAt.get(selfRoomId) ??
            new Date().toISOString(),
        );
      }
    }
  }

  if (!selfThread) {
    const created = await openSelfRoom(viewerId);
    if (created.ok) selfThread = created.thread;
  }

  return selfThread ? [selfThread, ...deduped] : deduped;
}

export async function listRoomMessages(
  roomId: string,
  viewerId: string,
  options: ListRoomMessagesOptions = {},
): Promise<ListRoomMessagesResult> {
  await assertRoomMember(roomId, viewerId);
  const admin = createServiceRoleClient();
  const limit = Math.min(Math.max(options.limit ?? MESSAGE_PAGE_SIZE, 1), 80);

  if (options.before && options.after) {
    throw new Error("CURSOR_CONFLICT");
  }

  /**
   * Keyset cursor `(tao_luc, id)`. Chỉ dùng `tao_luc` là **sót/trùng tin** ở biên
   * trang khi nhiều tin cùng timestamp (gửi dồn, tin hệ thống bulk).
   */
  const cursorId = options.after ?? options.before;
  let cursor: { tao_luc: string; id: string } | null = null;
  if (cursorId) {
    const { data: cursorRow } = await admin
      .from("chat_tin_nhan")
      .select("id, tao_luc")
      .eq("id", cursorId)
      .eq("id_phong", roomId)
      .maybeSingle<{ id: string; tao_luc: string }>();
    cursor = cursorRow ?? null;
  }

  /* Cursor không còn (xoá cứng / sai phòng) → coi như không có cursor, trả tail. */
  const isDelta = Boolean(options.after) && cursor !== null;
  const ascending = isDelta;

  let query = admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id_phong", roomId)
    .or(`chi_hien_cho.is.null,chi_hien_cho.cs.{${viewerId}}`)
    .order("tao_luc", { ascending })
    .order("id", { ascending })
    .limit(limit + 1);

  if (cursor) {
    const at = `"${cursor.tao_luc}"`;
    query = isDelta
      ? query.or(`tao_luc.gt.${at},and(tao_luc.eq.${at},id.gt.${cursor.id})`)
      : query.or(`tao_luc.lt.${at},and(tao_luc.eq.${at},id.lt.${cursor.id})`);
  }

  const { data, error } = await query.returns<MessageRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  /* Delta đã asc; nhánh lùi lấy desc rồi đảo. */
  const chronological = ascending ? pageRows : pageRows.slice().reverse();

  /**
   * Delta rỗng (đa số lần gọi catch-up) → thoát trước khi làm phần đắt:
   * ghim, read cursors, enrich, và các dynamic import bên dưới.
   */
  if (isDelta && chronological.length === 0) {
    return { messages: [], hasMore: false };
  }

  const [readCursors, pinnedRaw] = isDelta
    ? ([undefined, []] as [ChatReadCursor[] | undefined, ChatMessage[]])
    : await Promise.all([
        listRoomReadCursors(roomId, viewerId),
        listPinnedMessagesForRoom(roomId, viewerId, admin),
      ]);

  let messages = await enrichMessages(chronological, viewerId, roomId);

  const { isGroupRoomId, enrichGroupMessageSenders } = await import(
    "@/lib/chat/group-message"
  );
  const { isCsdtHubRoom } = await import("@/lib/co-so/org-hub-phong");
  const showNamedSenders =
    (await isGroupRoomId(roomId)) || (await isCsdtHubRoom(roomId));
  if (showNamedSenders) {
    messages = await enrichGroupMessageSenders(messages, chronological);
  }

  messages = await applyOrgAdvisoryPerspective(messages, viewerId, roomId);

  let pinnedMessages = pinnedRaw;
  const {
    getLopRoomAccess,
    loadKyIntervalsForViewerInLop,
    filterMessagesForKyVisibility,
  } = await import("@/lib/co-so/lop-room-access");
  const { shouldShowLopBaiTin } = await import("@/lib/chat/lop-bai-notice");
  const { shouldShowChaoLopTin } = await import("@/lib/chat/chao-lop-notice");
  const lopAccess = await getLopRoomAccess(roomId, viewerId);

  if (lopAccess.isLopRoom) {
    const filterLopBai = (list: ChatMessage[]) =>
      list.filter((m) =>
        shouldShowLopBaiTin({
          lopBai: m.lopBai,
          viewerId,
          isStaff: lopAccess.isStaff,
        }),
      );
    const filterChaoLop = (list: ChatMessage[]) =>
      list.filter((m) =>
        shouldShowChaoLopTin({
          chaoLop: m.chaoLop,
          senderUserId: m.senderUserId,
          viewerId,
        }),
      );
    messages = filterChaoLop(filterLopBai(messages));
    pinnedMessages = filterChaoLop(filterLopBai(pinnedMessages));
  }

  if (lopAccess.isLopRoom && !lopAccess.canReadGap && lopAccess.lopId) {
    const intervals = await loadKyIntervalsForViewerInLop(
      viewerId,
      lopAccess.lopId,
    );
    messages = filterMessagesForKyVisibility(
      messages,
      intervals,
      (m) => m.sentAt,
    );
    pinnedMessages = filterMessagesForKyVisibility(
      pinnedMessages,
      intervals,
      (m) => m.sentAt,
    );
  }

  /**
   * Delta **không bao giờ** mark read — kể cả khi caller truyền `markRead`.
   * `markRoomRead()` đánh dấu đọc **cả phòng** (lấy tin mới nhất, không theo
   * cursor truyền vào), nên catch-up mà mark read sẽ xoá sạch unread của phòng.
   */
  const shouldMarkRead = isDelta ? false : (options.markRead ?? !options.before);
  if (shouldMarkRead) {
    const last = messages.at(-1);
    if (last) {
      await markRoomRead(roomId, viewerId, last.id);
    }
  }

  return {
    messages,
    hasMore,
    readCursors,
    /* Delta không trả ghim — tránh client ghi đè danh sách ghim bằng mảng rỗng. */
    pinnedMessages: isDelta ? undefined : pinnedMessages,
  };
}

async function listPinnedMessagesForRoom(
  roomId: string,
  viewerId: string,
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<ChatMessage[]> {
  const { data: pins } = await admin
    .from("chat_ghim")
    .select("id_tin_nhan")
    .eq("id_phong", roomId)
    .order("ghim_luc", { ascending: false });

  const ids = (pins ?? []).map((p) => p.id_tin_nhan as string);
  if (ids.length === 0) return [];

  const { data: rows } = await admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .in("id", ids)
    .eq("da_xoa", false)
    .or(`chi_hien_cho.is.null,chi_hien_cho.cs.{${viewerId}}`);

  if (!rows?.length) return [];

  let enriched = await enrichMessages(rows as MessageRow[], viewerId, roomId, null);
  enriched = await applyOrgAdvisoryPerspective(enriched, viewerId, roomId);
  const byId = new Map(enriched.map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as ChatMessage[];
}

export async function sendRoomMessage(
  roomId: string,
  viewerId: string,
  input:
    | string
    | {
        body?: string;
        cloudflareImageId?: string;
        videoMediaId?: string;
        emojiMucId?: string;
        /** Ảnh CF gửi như meme (GIF) — `loai_tin=sticker`, canvas bỏ qua. */
        asSticker?: boolean;
        replyToId?: string;
        nguCanh?: unknown;
        /**
         * Server-only (P3b): giới hạn người thấy tin.
         * API client không được truyền — chỉ lib nội bộ.
         */
        chiHienCho?: string[] | null;
        /** Server-only: `system` cho nhắc khảo sát / hệ thống. */
        loaiTin?: "text" | "system";
      },
): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const body =
    typeof input === "string" ? input.trim() : (input.body?.trim() ?? "");
  const cloudflareImageId =
    typeof input === "string"
      ? undefined
      : input.cloudflareImageId?.trim();
  const videoMediaId =
    typeof input === "string" ? undefined : input.videoMediaId?.trim();
  const emojiMucId =
    typeof input === "string" ? undefined : input.emojiMucId?.trim();
  const asSticker =
    typeof input === "string" ? false : Boolean(input.asSticker);
  const replyToId =
    typeof input === "string" ? undefined : input.replyToId?.trim();
  const contextCard =
    typeof input === "string" ? null : parseNguCanh(input.nguCanh);
  const chuyenTiep =
    typeof input !== "string" && parseChatForwarded(input.nguCanh);
  const chiHienCho =
    typeof input === "string"
      ? null
      : normalizeChiHienCho(input.chiHienCho ?? null);
  const loaiTinForce =
    typeof input === "string" ? null : (input.loaiTin ?? null);

  if (!body && !cloudflareImageId && !videoMediaId && !emojiMucId && !contextCard) {
    return { ok: false, error: "Tin nhắn trống." };
  }

  if ([cloudflareImageId, videoMediaId, emojiMucId].filter(Boolean).length > 1) {
    return { ok: false, error: "Chỉ gửi một loại đính kèm mỗi lần." };
  }

  if (cloudflareImageId && !isCloudflareImageId(cloudflareImageId)) {
    return { ok: false, error: "Ảnh đính kèm không hợp lệ." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền gửi tin." };
  }

  const { getLopRoomAccess } = await import("@/lib/co-so/lop-room-access");
  const lopAccess = await getLopRoomAccess(roomId, viewerId);
  if (lopAccess.isLopRoom && !lopAccess.canSend) {
    return {
      ok: false,
      error: "Kỳ học đã hết — phòng lớp tạm khóa. Gia hạn để tiếp tục nhắn.",
    };
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const mentionMembers = body
    ? await loadGroupMentionMembers(roomId)
    : [];
  const mentions = resolveMentionsAgainstMembers(body, mentionMembers, {
    excludeUserId: viewerId,
  });
  const baseNguCanh = buildNguCanhPayload(
    (contextCard as Record<string, unknown> | null) ??
      (typeof input !== "string" &&
      input.nguCanh &&
      typeof input.nguCanh === "object" &&
      !Array.isArray(input.nguCanh)
        ? (input.nguCanh as Record<string, unknown>)
        : null),
    mentions,
  );
  const nguCanhPayload = chuyenTiep
    ? { ...(baseNguCanh ?? {}), chuyenTiep: true }
    : baseNguCanh;

  if (replyToId) {
    const { data: replyRow } = await admin
      .from("chat_tin_nhan")
      .select("id, id_phong, da_xoa")
      .eq("id", replyToId)
      .maybeSingle<{ id: string; id_phong: string; da_xoa: boolean }>();

    if (!replyRow || replyRow.id_phong !== roomId || replyRow.da_xoa) {
      return { ok: false, error: "Tin trả lời không hợp lệ." };
    }
  }

  let mediaId: string | null = null;
  let stickerCloudflareId: string | null = null;
  let videoKey: string | null = null;

  if (emojiMucId) {
    const resolved = await resolveOwnedUserEmojiMuc(emojiMucId, viewerId);
    if (!resolved) {
      return { ok: false, error: "Meme không hợp lệ hoặc không thuộc tài khoản bạn." };
    }
    stickerCloudflareId = resolved.cloudflareId;
    mediaId = await ensureChatMediaId(stickerCloudflareId, viewerId);
    if (!mediaId) {
      return { ok: false, error: "Không lưu được meme." };
    }
  } else if (cloudflareImageId) {
    mediaId = await ensureChatMediaId(cloudflareImageId, viewerId);
    if (!mediaId) {
      return { ok: false, error: "Không lưu được ảnh đính kèm." };
    }
    if (asSticker) stickerCloudflareId = cloudflareImageId;
  } else if (videoMediaId) {
    /* videoMediaId là content_media.id đã tạo bởi API upload video chat.
       Xác minh là video của chính viewer trước khi đính kèm. */
    const { data: mediaRow } = await admin
      .from("content_media")
      .select("id, cloudflare_id, loai_media, content_tac_pham(id_nguoi_dung)")
      .eq("id", videoMediaId)
      .maybeSingle<{
        id: string;
        cloudflare_id: string | null;
        loai_media: string | null;
        content_tac_pham:
          | { id_nguoi_dung: string | null }
          | { id_nguoi_dung: string | null }[]
          | null;
      }>();
    const owner = Array.isArray(mediaRow?.content_tac_pham)
      ? mediaRow?.content_tac_pham[0]?.id_nguoi_dung
      : mediaRow?.content_tac_pham?.id_nguoi_dung;
    if (
      !mediaRow ||
      mediaRow.loai_media !== "video" ||
      owner !== viewerId ||
      !mediaRow.cloudflare_id
    ) {
      return { ok: false, error: "Video đính kèm không hợp lệ." };
    }
    mediaId = mediaRow.id;
    videoKey = mediaRow.cloudflare_id;
  }

  const insertRow = stickerCloudflareId
    ? {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        loai_tin: "sticker" as const,
        id_dinh_kem: mediaId,
        noi_dung: stickerCloudflareId,
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
        ...(chiHienCho ? { chi_hien_cho: chiHienCho } : {}),
      }
    : cloudflareImageId
    ? {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        loai_tin: "media" as const,
        id_dinh_kem: mediaId,
        noi_dung: body || cloudflareImageId,
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
        ...(nguCanhPayload ? { ngu_canh: nguCanhPayload } : {}),
        ...(chiHienCho ? { chi_hien_cho: chiHienCho } : {}),
      }
    : videoKey
    ? {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        loai_tin: "media" as const,
        id_dinh_kem: mediaId,
        noi_dung: body || videoKey,
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
        ...(nguCanhPayload ? { ngu_canh: nguCanhPayload } : {}),
        ...(chiHienCho ? { chi_hien_cho: chiHienCho } : {}),
      }
    : {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        noi_dung: body || null,
        loai_tin: (loaiTinForce === "system" ? "system" : "text") as
          | "text"
          | "system",
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
        ...(nguCanhPayload ? { ngu_canh: nguCanhPayload } : {}),
        ...(chiHienCho ? { chi_hien_cho: chiHienCho } : {}),
      };

  /* Một cửa ghi tin (kèm bump `cap_nhat_luc`) — xem `insert-message.ts`. */
  const { data, error } = await insertChatMessageRow<MessageRow>(insertRow, {
    select: MESSAGE_SELECT,
    bumpRoomAt: now,
    admin,
  });

  if (error || !data) {
    return { ok: false, error: "Không gửi được tin nhắn." };
  }

  /* Người gửi không nằm trong chi_hien_cho → không mark-read / không bắt buộc fetch. */
  const visibleToSender = tinHienVoiViewer(chiHienCho, viewerId);

  /**
   * Hai việc độc lập nhau — chạy song song để cắt round-trip khỏi đường gửi tin.
   * `markRoomRead` vẫn `await` (vẫn ném lỗi ra ngoài như trước) để tránh tình
   * huống watermark chưa kịp ghi mà client đã gọi lại danh sách hội thoại.
   */
  const [, enriched] = await Promise.all([
    visibleToSender
      ? markRoomRead(roomId, viewerId, data.id)
      : Promise.resolve(undefined),
    visibleToSender
      ? enrichMessageFromRow(data, viewerId)
      : Promise.resolve(null),
  ]);

  let message = visibleToSender ? enriched : mapMessageFromRow(data, viewerId);
  if (!message) {
    return { ok: false, error: "Không tải lại được tin nhắn." };
  }

  message = await applyOrgAdvisoryPerspectiveToMessage(
    message,
    viewerId,
    roomId,
  );

  /* Notify admin org khi HV/khách gửi tin vào phòng tư vấn (fire-and-forget). */
  if (visibleToSender) {
    void notifyOrgAdminsOfStudentMessage({
      roomId,
      senderId: viewerId,
      messagePreview: messagePreview(data),
    }).catch((err) => {
      console.error("[sendRoomMessage] org inbox notify", err);
    });
  }

  /* FCM tin nhắn mới — bỏ system / card đơn (đơn đẩy ở don-hang.ts). */
  const skipPush =
    loaiTinForce === "system" ||
    (contextCard &&
      typeof contextCard === "object" &&
      (contextCard as { loai?: string }).loai === "don_hang");
  if (visibleToSender && !skipPush) {
    void (async () => {
      try {
        const { firePushTinNhanMoi, listRoomMemberIdsExcept } = await import(
          "@/lib/push/su-kien"
        );
        const recipients = await listRoomMemberIdsExcept(roomId, viewerId);
        const visibleRecipients = chiHienCho?.length
          ? recipients.filter((id) => chiHienCho.includes(id))
          : recipients;
        firePushTinNhanMoi({
          roomId,
          senderId: viewerId,
          recipientIds: visibleRecipients,
          preview: messagePreview(data),
        });
      } catch (err) {
        console.error("[sendRoomMessage] push", err);
      }
    })();
  }

  return { ok: true, message };
}

export async function markRoomRead(
  roomId: string,
  viewerId: string,
  lastMessageId?: string,
): Promise<void> {
  await assertRoomMember(roomId, viewerId);
  const admin = createServiceRoleClient();

  const { data: last } = await admin
    .from("chat_tin_nhan")
    .select("id")
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  const messageId = last?.id ?? lastMessageId;
  if (!messageId) return;

  const { error } = await admin.from("chat_da_doc").upsert(
    {
      id_phong: roomId,
      id_nguoi_dung: viewerId,
      id_tin_nhan_cuoi_doc: messageId,
      cap_nhat_luc: new Date().toISOString(),
    },
    { onConflict: "id_phong,id_nguoi_dung" },
  );
  if (error) {
    console.error("[chat] markRoomRead", error);
    throw new Error("MARK_READ_FAILED");
  }

  void markOrgInboxNotifyRead({ roomId, viewerId }).catch(() => {});
}

export async function countTotalUnread(viewerId: string): Promise<number> {
  const { listAllChatThreads } = await import("@/lib/chat/org-message");
  const threads = await listAllChatThreads(viewerId);
  return threads.reduce((sum, thread) => sum + thread.unread, 0);
}

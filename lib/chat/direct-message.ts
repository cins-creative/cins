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
import {
  getPeerReadMessageId,
  loadPinnedMessageIds,
  loadReactionsForMessages,
} from "@/lib/chat/message-enrich";
import { resolveOwnedUserEmojiMuc } from "@/lib/user-emoji/resolve-owned";
import type {
  ChatContextCard,
  ChatMessage,
  ChatMessageKind,
  ChatMessageReplyPreview,
  ChatReactionSummary,
  ChatThread,
  ChatThreadGroup,
} from "@/lib/chat/types";

const DM_ROOM = "1_1";
const MESSAGE_PAGE_SIZE = 30;

export type ListRoomMessagesOptions = {
  limit?: number;
  before?: string;
  markRead?: boolean;
};

export type ListRoomMessagesResult = {
  messages: ChatMessage[];
  hasMore: boolean;
  peerReadUpToId?: string | null;
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
  content_media?: { cloudflare_id: string | null } | { cloudflare_id: string | null }[] | null;
};

type NormalizedMessageRow = Omit<MessageRow, "content_media"> & {
  content_media?: { cloudflare_id: string | null } | null;
};

function normalizeMessageRow(row: MessageRow): NormalizedMessageRow {
  const media = row.content_media;
  if (Array.isArray(media)) {
    return { ...row, content_media: media[0] ?? null };
  }
  return { ...row, content_media: media ?? null };
}

export const MESSAGE_SELECT =
  "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc, content_media(cloudflare_id)";

type ReadRow = {
  id_phong: string;
  id_tin_nhan_cuoi_doc: string;
};

export function messagePreview(row: MessageRow): string {
  if (row.da_xoa) return "Đã thu hồi tin nhắn";
  const normalized = normalizeMessageRow(row);
  const nguCanh = parseNguCanh(normalized.ngu_canh);
  if (nguCanh) {
    return `Trao đổi về: ${nguCanh.tieuDe}`;
  }
  if (normalized.loai_tin === "media") {
    const caption = normalized.noi_dung?.trim() || "";
    if (caption && !isCloudflareImageId(caption)) return caption;
    return "Ảnh";
  }
  if (normalized.loai_tin === "sticker") return "Meme";
  return normalized.noi_dung?.trim() || "";
}

function resolveImageId(row: NormalizedMessageRow): string | null {
  const fromMedia = row.content_media?.cloudflare_id?.trim();
  if (fromMedia && isCloudflareImageId(fromMedia)) return fromMedia;

  const fromBody = row.noi_dung?.trim() || "";
  if (isCloudflareImageId(fromBody)) return fromBody;

  return null;
}

type MapMessageExtras = {
  reactions?: ChatReactionSummary[];
  pinned?: boolean;
  replyTo?: ChatMessageReplyPreview | null;
  readByPeer?: boolean;
};

function parseNguCanh(raw: unknown): ChatContextCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const tieuDe = typeof r.tieuDe === "string" ? r.tieuDe : null;
  const loai = typeof r.loai === "string" ? r.loai : null;
  if (!id || !tieuDe || !loai) return null;
  return {
    loai,
    id,
    tieuDe,
    moTa: typeof r.moTa === "string" ? r.moTa : null,
    anh: typeof r.anh === "string" ? r.anh : null,
    href: typeof r.href === "string" ? r.href : null,
    orgTen: typeof r.orgTen === "string" ? r.orgTen : null,
  };
}

export function mapMessageFromRow(
  row: MessageRow,
  viewerId: string,
  extras: MapMessageExtras = {},
): ChatMessage {
  const normalized = normalizeMessageRow(row);
  const nguCanh = parseNguCanh(normalized.ngu_canh);
  const kind: ChatMessageKind = nguCanh
    ? "context"
    : normalized.loai_tin === "sticker"
      ? "sticker"
      : normalized.loai_tin === "media"
        ? "media"
        : "text";
  const imageId =
    kind === "media" || kind === "sticker" ? resolveImageId(normalized) : null;
  let body = normalized.noi_dung?.trim() || "";

  if (kind === "sticker") {
    body = "";
  } else if (kind === "media" && imageId && body === imageId) {
    body = "";
  }

  return {
    id: normalized.id,
    from: normalized.id_nguoi_gui === viewerId ? "me" : "them",
    body,
    sentAt: normalized.tao_luc,
    kind,
    imageId,
    imageUrl: imageId ? chatImageDeliveryUrl(imageId) : null,
    deleted: Boolean(normalized.da_xoa),
    edited: Boolean(normalized.da_sua),
    editedAt: normalized.sua_luc ?? null,
    replyTo: extras.replyTo ?? null,
    reactions: extras.reactions,
    pinned: extras.pinned,
    readByPeer: extras.readByPeer,
    nguCanh,
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
  peerReadUpToId: string | null,
): Promise<ChatMessage[]> {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const messageIds = rows.map((row) => row.id);
  const [reactionsByMessage, pinnedIds] = await Promise.all([
    loadReactionsForMessages(messageIds, viewerId),
    loadPinnedMessageIds(roomId),
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

  let readApplied = false;

  return rows.map((row) => {
    const replyId = row.id_tin_tra_loi;
    const replyRow = replyId ? rowById.get(replyId) : undefined;
    const peerReadIdx = peerReadUpToId
      ? rows.findIndex((r) => r.id === peerReadUpToId)
      : -1;
    const thisIdx = rows.findIndex((r) => r.id === row.id);
    const readByPeer =
      Boolean(peerReadUpToId) &&
      row.id_nguoi_gui === viewerId &&
      peerReadIdx >= 0 &&
      thisIdx >= 0 &&
      thisIdx <= peerReadIdx;

    return mapMessageFromRow(row, viewerId, {
      reactions: reactionsByMessage.get(row.id),
      pinned: pinnedIds.has(row.id),
      replyTo: replyId
        ? replyRow
          ? buildReplyPreview(replyRow, viewerId)
          : { id: replyId, from: "them", body: "", deleted: true }
        : null,
      readByPeer,
    });
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

  const [reactions, pinnedIds, peerReadUpToId] = await Promise.all([
    loadReactionsForMessages([messageId], viewerId),
    loadPinnedMessageIds(row.id_phong),
    getPeerReadMessageId(row.id_phong, viewerId),
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
    readByPeer: row.id_nguoi_gui === viewerId && peerReadUpToId === messageId,
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
    .select("id_phong, chat_phong!inner(loai_phong)")
    .eq("id_nguoi_dung", targetUserId)
    .in("id_phong", roomIds)
    .is("roi_luc", null)
    .eq("chat_phong.loai_phong", DM_ROOM)
    .limit(1);

  return sharedRows?.[0]?.id_phong ?? null;
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

  const peerId = (members ?? [])
    .map((row) => row.id_nguoi_dung)
    .find((id) => id !== viewerId);

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
    .select("id_tin_nhan_cuoi_doc")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", viewerId)
    .maybeSingle<Pick<ReadRow, "id_tin_nhan_cuoi_doc">>();

  let readAt: string | null = null;
  if (readState?.id_tin_nhan_cuoi_doc) {
    const { data: readMessage } = await admin
      .from("chat_tin_nhan")
      .select("tao_luc")
      .eq("id", readState.id_tin_nhan_cuoi_doc)
      .maybeSingle<{ tao_luc: string }>();
    readAt = readMessage?.tao_luc ?? null;
  }

  let query = admin
    .from("chat_tin_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId)
    .eq("da_xoa", false)
    .neq("id_nguoi_gui", viewerId);

  if (readAt) {
    query = query.gt("tao_luc", readAt);
  }

  const { count } = await query;
  return count ?? 0;
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
      (!readAt || msg.tao_luc > readAt),
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
  if (roomIds.length === 0) return [];

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
    .order("tao_luc", { ascending: false });

  const lastByRoom = new Map<string, MessageRow>();
  for (const msg of messages ?? []) {
    if (!lastByRoom.has(msg.id_phong)) {
      lastByRoom.set(msg.id_phong, msg);
    }
  }

  const { data: reads } = await admin
    .from("chat_da_doc")
    .select("id_phong, id_tin_nhan_cuoi_doc")
    .eq("id_nguoi_dung", viewerId)
    .in("id_phong", roomIds)
    .returns<ReadRow[]>();

  const readMessageIds = [...new Set((reads ?? []).map((r) => r.id_tin_nhan_cuoi_doc))];
  const readAtByRoom = new Map<string, string>();

  if (readMessageIds.length > 0) {
    const { data: readMessages } = await admin
      .from("chat_tin_nhan")
      .select("id, tao_luc")
      .in("id", readMessageIds)
      .returns<Array<{ id: string; tao_luc: string }>>();

    const readAtByMessageId = new Map(
      (readMessages ?? []).map((row) => [row.id, row.tao_luc]),
    );

    for (const read of reads ?? []) {
      const readAt = readAtByMessageId.get(read.id_tin_nhan_cuoi_doc);
      if (readAt) readAtByRoom.set(read.id_phong, readAt);
    }
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

  threads.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  return threads;
}

export async function listRoomMessages(
  roomId: string,
  viewerId: string,
  options: ListRoomMessagesOptions = {},
): Promise<ListRoomMessagesResult> {
  await assertRoomMember(roomId, viewerId);
  const admin = createServiceRoleClient();
  const limit = Math.min(Math.max(options.limit ?? MESSAGE_PAGE_SIZE, 1), 80);

  let beforeAt: string | null = null;
  if (options.before) {
    const { data: cursor } = await admin
      .from("chat_tin_nhan")
      .select("tao_luc")
      .eq("id", options.before)
      .eq("id_phong", roomId)
      .maybeSingle<{ tao_luc: string }>();
    beforeAt = cursor?.tao_luc ?? null;
  }

  let query = admin
    .from("chat_tin_nhan")
    .select(MESSAGE_SELECT)
    .eq("id_phong", roomId)
    .order("tao_luc", { ascending: false })
    .limit(limit + 1);

  if (beforeAt) {
    query = query.lt("tao_luc", beforeAt);
  }

  const { data, error } = await query.returns<MessageRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const chronological = pageRows.slice().reverse();

  const [peerReadUpToId, pinnedMessages] = await Promise.all([
    getPeerReadMessageId(roomId, viewerId),
    listPinnedMessagesForRoom(roomId, viewerId, admin),
  ]);

  let messages = await enrichMessages(
    chronological,
    viewerId,
    roomId,
    peerReadUpToId,
  );

  const { isGroupRoomId, enrichGroupMessageSenders } = await import(
    "@/lib/chat/group-message"
  );
  if (await isGroupRoomId(roomId)) {
    messages = await enrichGroupMessageSenders(messages, chronological);
  }

  const shouldMarkRead = options.markRead ?? !options.before;
  if (shouldMarkRead) {
    const last = messages.at(-1);
    if (last) {
      await markRoomRead(roomId, viewerId, last.id);
    }
  }

  return { messages, hasMore, peerReadUpToId, pinnedMessages };
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
    .eq("da_xoa", false);

  if (!rows?.length) return [];

  const enriched = await enrichMessages(rows as MessageRow[], viewerId, roomId, null);
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
        emojiMucId?: string;
        replyToId?: string;
        nguCanh?: unknown;
      },
): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const body =
    typeof input === "string" ? input.trim() : (input.body?.trim() ?? "");
  const cloudflareImageId =
    typeof input === "string"
      ? undefined
      : input.cloudflareImageId?.trim();
  const emojiMucId =
    typeof input === "string" ? undefined : input.emojiMucId?.trim();
  const replyToId =
    typeof input === "string" ? undefined : input.replyToId?.trim();
  const nguCanh =
    typeof input === "string" ? null : parseNguCanh(input.nguCanh);

  if (!body && !cloudflareImageId && !emojiMucId && !nguCanh) {
    return { ok: false, error: "Tin nhắn trống." };
  }

  if (cloudflareImageId && emojiMucId) {
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

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

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
  }

  const insertRow = stickerCloudflareId
    ? {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        loai_tin: "sticker" as const,
        id_dinh_kem: mediaId,
        noi_dung: stickerCloudflareId,
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
      }
    : cloudflareImageId
    ? {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        loai_tin: "media" as const,
        id_dinh_kem: mediaId,
        noi_dung: body || cloudflareImageId,
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
        ...(nguCanh ? { ngu_canh: nguCanh } : {}),
      }
    : {
        id_phong: roomId,
        id_nguoi_gui: viewerId,
        noi_dung: body || null,
        loai_tin: "text" as const,
        ...(replyToId ? { id_tin_tra_loi: replyToId } : {}),
        ...(nguCanh ? { ngu_canh: nguCanh } : {}),
      };

  const { data, error } = await admin
    .from("chat_tin_nhan")
    .insert(insertRow)
    .select(MESSAGE_SELECT)
    .single<MessageRow>();

  if (error || !data) {
    return { ok: false, error: "Không gửi được tin nhắn." };
  }

  await admin.from("chat_phong").update({ cap_nhat_luc: now }).eq("id", roomId);
  await markRoomRead(roomId, viewerId, data.id);

  const message = await fetchMessageById(data.id, viewerId);
  if (!message) {
    return { ok: false, error: "Không tải lại được tin nhắn." };
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

  let messageId = lastMessageId;
  if (!messageId) {
    const { data: last } = await admin
      .from("chat_tin_nhan")
      .select("id")
      .eq("id_phong", roomId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    messageId = last?.id;
  }

  if (!messageId) return;

  await admin.from("chat_da_doc").upsert(
    {
      id_phong: roomId,
      id_nguoi_dung: viewerId,
      id_tin_nhan_cuoi_doc: messageId,
      cap_nhat_luc: new Date().toISOString(),
    },
    { onConflict: "id_phong,id_nguoi_dung" },
  );
}

export async function countTotalUnread(viewerId: string): Promise<number> {
  const { listAllChatThreads } = await import("@/lib/chat/org-message");
  const threads = await listAllChatThreads(viewerId);
  return threads.reduce((sum, thread) => sum + thread.unread, 0);
}

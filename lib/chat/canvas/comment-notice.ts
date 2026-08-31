import "server-only";

import {
  assertRoomMember,
  mapMessageFromRow,
  type MessageRow,
} from "@/lib/chat/direct-message";
import {
  CHAT_MESSAGE_ROW_COLS,
  insertChatMessageRow,
} from "@/lib/chat/insert-message";
import type { ChatMessage } from "@/lib/chat/types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const AGGREGATE_WINDOW_MS = 30 * 60 * 1000;

export type CanvasCommentAuthor = {
  id: string;
  ten: string;
  slug?: string | null;
  avatarUrl?: string | null;
};

function noticeBody(
  ten: string,
  soLuong: number,
  hostTen?: string | null,
): string {
  if (hostTen) {
    if (soLuong <= 1) return `${ten} đã trả lời bình luận của ${hostTen}`;
    return `${ten} đã trả lời ${soLuong} lần bình luận của ${hostTen}`;
  }
  if (soLuong <= 1) return `${ten} vừa có một bình luận`;
  return `${ten} vừa có ${soLuong} bình luận`;
}

function buildNguCanh(input: {
  canvasId: string;
  soLuong: number;
  nodeIds: string[];
  tenNguoi: string;
  avatarUrl?: string | null;
  hostId?: string | null;
  hostTen?: string | null;
}) {
  return {
    loai: "canvas_binh_luan",
    id: input.canvasId,
    tieuDe: input.tenNguoi,
    soLuong: input.soLuong,
    nodeIds: input.nodeIds,
    avatarUrl: input.avatarUrl ?? null,
    isReply: Boolean(input.hostId),
    hostId: input.hostId ?? null,
    hostTen: input.hostTen ?? null,
  };
}

export async function loadCanvasCommentAuthor(
  viewerId: string,
): Promise<CanvasCommentAuthor> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", viewerId)
    .maybeSingle<{
      id: string;
      slug: string | null;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  const slug = data?.slug?.trim() || null;
  const ten =
    data?.ten_hien_thi?.trim() ||
    (slug ? slug.replace(/[-_]+/g, " ") : "") ||
    "Thành viên";
  return {
    id: viewerId,
    ten,
    slug,
    avatarUrl: getAvatarUrl(data?.avatar_id ?? null) ?? null,
  };
}

/**
 * Sau khi tạo node bình luận trên canvas — ghi / gộp tin system trong phòng
 * («X vừa có một bình luận» / «X vừa có N bình luận»).
 */
export async function notifyCanvasComment(input: {
  roomId: string;
  canvasId: string;
  nodeId: string;
  author: CanvasCommentAuthor;
  viewerId: string;
  host?: CanvasCommentAuthor | null;
}): Promise<ChatMessage | null> {
  const host =
    input.host && input.host.id !== input.author.id ? input.host : null;
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - AGGREGATE_WINDOW_MS).toISOString();

  const { data: recent } = await admin
    .from("chat_tin_nhan")
    .select(
      "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc",
    )
    .eq("id_phong", input.roomId)
    .eq("id_nguoi_gui", input.author.id)
    .eq("loai_tin", "system")
    .eq("da_xoa", false)
    .gte("tao_luc", since)
    .order("tao_luc", { ascending: false })
    .limit(8);

  type Row = {
    id: string;
    ngu_canh: unknown;
  };

  let target: (Row & Record<string, unknown>) | null = null;
  for (const row of (recent ?? []) as Row[]) {
    const ctx =
      row.ngu_canh && typeof row.ngu_canh === "object"
        ? (row.ngu_canh as Record<string, unknown>)
        : null;
    if (ctx?.loai !== "canvas_binh_luan") continue;
    if (ctx.id !== input.canvasId) continue;
    const rowHost = typeof ctx.hostId === "string" ? ctx.hostId : null;
    if (rowHost !== (host?.id ?? null)) continue;
    target = row as Row & Record<string, unknown>;
    break;
  }

  if (target) {
    const ctx =
      target.ngu_canh && typeof target.ngu_canh === "object"
        ? (target.ngu_canh as Record<string, unknown>)
        : {};
    const prevIds = Array.isArray(ctx.nodeIds)
      ? ctx.nodeIds.filter((id): id is string => typeof id === "string")
      : [];
    const nodeIds = [...prevIds, input.nodeId].slice(-40);
    const soLuong = Math.max(
      nodeIds.length,
      typeof ctx.soLuong === "number" ? ctx.soLuong + 1 : nodeIds.length,
    );
    const ngu_canh = buildNguCanh({
      canvasId: input.canvasId,
      soLuong,
      nodeIds,
      tenNguoi: input.author.ten,
      avatarUrl: input.author.avatarUrl,
      hostId: host?.id ?? null,
      hostTen: host?.ten ?? null,
    });
    const noi_dung = noticeBody(input.author.ten, soLuong, host?.ten ?? null);

    const { data: updated, error } = await admin
      .from("chat_tin_nhan")
      .update({
        noi_dung,
        ngu_canh,
        da_sua: true,
        sua_luc: new Date().toISOString(),
      })
      .eq("id", target.id)
      .select(
        "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc",
      )
      .single();

    if (error || !updated) return null;

    await admin
      .from("chat_phong")
      .update({ cap_nhat_luc: new Date().toISOString() })
      .eq("id", input.roomId);

    return mapMessageFromRow(updated, input.viewerId);
  }

  const ngu_canh = buildNguCanh({
    canvasId: input.canvasId,
    soLuong: 1,
    nodeIds: [input.nodeId],
    tenNguoi: input.author.ten,
    avatarUrl: input.author.avatarUrl,
    hostId: host?.id ?? null,
    hostTen: host?.ten ?? null,
  });

  /* Một cửa ghi tin — bump `cap_nhat_luc` như trước. */
  const { data: inserted, error } = await insertChatMessageRow<MessageRow>(
    {
      id_phong: input.roomId,
      id_nguoi_gui: input.author.id,
      noi_dung: noticeBody(input.author.ten, 1, host?.ten ?? null),
      loai_tin: "system",
      ngu_canh,
      da_xoa: false,
    },
    {
      select: CHAT_MESSAGE_ROW_COLS,
      bumpRoomAt: new Date().toISOString(),
      admin,
    },
  );

  if (error || !inserted) {
    console.error("[canvas-comment] notice insert failed", error);
    return null;
  }

  return mapMessageFromRow(inserted, input.viewerId);
}

/**
 * Thành viên phòng click xem bình luận trên canvas → soft-delete tin thông báo
 * (không hiện «đã thu hồi»; tin biến mất khỏi feed). Bình luận mới sau đó
 * tạo notice mới vì query chỉ lấy tin chưa xóa.
 */
export async function dismissCanvasCommentNotice(input: {
  roomId: string;
  messageId: string;
  viewerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertRoomMember(input.roomId, input.viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("chat_tin_nhan")
    .select("id, loai_tin, ngu_canh, da_xoa")
    .eq("id", input.messageId)
    .eq("id_phong", input.roomId)
    .maybeSingle<{
      id: string;
      loai_tin: string | null;
      ngu_canh: unknown;
      da_xoa: boolean;
    }>();

  if (!row) return { ok: false, error: "Không tìm thấy tin nhắn." };
  if (row.da_xoa) return { ok: true };

  const ctx =
    row.ngu_canh && typeof row.ngu_canh === "object"
      ? (row.ngu_canh as Record<string, unknown>)
      : null;
  if (row.loai_tin !== "system" || ctx?.loai !== "canvas_binh_luan") {
    return { ok: false, error: "Không phải thông báo bình luận canvas." };
  }

  const { error } = await admin
    .from("chat_tin_nhan")
    .update({ da_xoa: true })
    .eq("id", input.messageId)
    .eq("id_phong", input.roomId);

  if (error) return { ok: false, error: "Không xóa được thông báo." };
  return { ok: true };
}

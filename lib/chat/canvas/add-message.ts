import "server-only";

import { assertCanvasWritable, loadCanvasContext } from "@/lib/chat/canvas/access";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import { createNode } from "@/lib/chat/canvas/nodes";
import type {
  CanvasNodeLayout,
  CanvasNodeLoai,
  CanvasResult,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import { MAX_CANVAS_NODES, MAX_CANVAS_STICKY_LEN } from "@/lib/chat/constants";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import { findFirstOgPreviewUrl } from "@/lib/link/og-preview";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const GRID_COLS = 4;
const CELL_W = 260;
const CELL_H = 210;
const GRID_GAP = 24;
const NODE_SELECT =
  "id, id_canvas, loai, id_tin_nhan, url, noi_dung, layout, id_nguoi_tao, tao_luc, cap_nhat_luc";
const NODE_LOAI: CanvasNodeLoai[] = ["anh", "link", "sticky", "frame", "connector"];

function gridLayout(position: number): CanvasNodeLayout {
  const col = position % GRID_COLS;
  const row = Math.floor(position / GRID_COLS);
  return {
    x: col * (CELL_W + GRID_GAP),
    y: row * (CELL_H + GRID_GAP),
    w: CELL_W,
    h: CELL_H,
    z: position,
  };
}

function coerceLayout(raw: unknown): CanvasNodeLayout {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const layout: CanvasNodeLayout = {
    x: num(obj.x),
    y: num(obj.y),
  };
  if (typeof obj.w === "number") layout.w = obj.w;
  if (typeof obj.h === "number") layout.h = obj.h;
  if (typeof obj.z === "number") layout.z = obj.z;
  if (typeof obj.rotation === "number") layout.rotation = obj.rotation;
  if (typeof obj.mau === "string") layout.mau = obj.mau;
  return layout;
}

type NodeRow = {
  id: string;
  id_canvas: string;
  loai: string;
  id_tin_nhan: string | null;
  url: string | null;
  noi_dung: string | null;
  layout: unknown;
  id_nguoi_tao: string;
  tao_luc: string;
  cap_nhat_luc: string;
};

function mapNode(row: NodeRow): ChatCanvasNode {
  return {
    id: row.id,
    canvasId: row.id_canvas,
    loai: (NODE_LOAI.includes(row.loai as CanvasNodeLoai)
      ? row.loai
      : "sticky") as CanvasNodeLoai,
    messageId: row.id_tin_nhan,
    url: row.url,
    noiDung: row.noi_dung,
    layout: coerceLayout(row.layout),
    idNguoiTao: row.id_nguoi_tao,
    taoLuc: row.tao_luc,
    capNhatLuc: row.cap_nhat_luc,
  };
}

type MessageRow = {
  id: string;
  id_phong: string;
  noi_dung: string | null;
  loai_tin: string | null;
  da_xoa: boolean | null;
  content_media: { cloudflare_id: string | null } | { cloudflare_id: string | null }[] | null;
};

function imageUrlFromRow(row: MessageRow): string | null {
  const media = row.content_media;
  const mediaRow = Array.isArray(media) ? media[0] : media;
  const cfId =
    mediaRow && typeof mediaRow === "object" && "cloudflare_id" in mediaRow
      ? mediaRow.cloudflare_id
      : null;
  return cfId ? chatImageDeliveryUrl(cfId) : null;
}

/**
 * Thêm một tin nhắn lên canvas phòng (idempotent theo id_tin_nhan).
 * - Ảnh → node `anh`; URL trong nội dung → `link`; còn lại → sticky text.
 * - Bỏ ẩn tin nếu trước đó đã bị ẩn khỏi canvas.
 */
export async function addMessageToCanvas(
  roomId: string,
  viewerId: string,
  messageId: string,
): Promise<CanvasResult<{ node: ChatCanvasNode; created: boolean }>> {
  const board = await getOrCreateRoomCanvas(roomId, viewerId);
  if (!board.ok) return board;

  const canvasId = board.canvas.id;
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const writable = assertCanvasWritable(loaded.ctx);
  if (!writable.ok) return writable;

  const admin = createServiceRoleClient();

  const { data: msg, error: msgError } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, noi_dung, loai_tin, da_xoa, content_media(cloudflare_id)")
    .eq("id", messageId)
    .maybeSingle<MessageRow>();

  if (msgError || !msg) return { ok: false, error: "Không tìm thấy tin nhắn." };
  if (msg.id_phong !== roomId) {
    return { ok: false, error: "Tin nhắn không thuộc phòng này." };
  }
  if (msg.da_xoa) return { ok: false, error: "Tin đã thu hồi." };
  if (msg.loai_tin === "sticker") {
    return { ok: false, error: "Không thêm sticker lên canvas." };
  }

  // Bỏ ẩn nếu có — cho phép thêm lại sau khi user gỡ khỏi board.
  await admin
    .from("chat_canvas_tin_an")
    .delete()
    .eq("id_canvas", canvasId)
    .eq("id_tin_nhan", messageId);

  const { data: existing } = await admin
    .from("chat_canvas_node")
    .select(NODE_SELECT)
    .eq("id_canvas", canvasId)
    .eq("id_tin_nhan", messageId)
    .maybeSingle<NodeRow>();

  if (existing) {
    return { ok: true, node: mapNode(existing), created: false };
  }

  const { count } = await admin
    .from("chat_canvas_node")
    .select("id", { count: "exact", head: true })
    .eq("id_canvas", canvasId);

  if ((count ?? 0) >= MAX_CANVAS_NODES) {
    return { ok: false, error: `Canvas tối đa ${MAX_CANVAS_NODES} block.` };
  }

  const body = typeof msg.noi_dung === "string" ? msg.noi_dung : "";
  const imageUrl = imageUrlFromRow(msg);
  const linkUrl = imageUrl ? null : findFirstOgPreviewUrl(body);
  const text = body.trim();

  let loai: "anh" | "link" | "sticky";
  let url: string | null = null;
  let noiDung: string | null = text || null;

  if (imageUrl) {
    loai = "anh";
    url = imageUrl;
  } else if (linkUrl) {
    loai = "link";
    url = linkUrl;
  } else if (text) {
    loai = "sticky";
    if (text.length > MAX_CANVAS_STICKY_LEN) {
      noiDung = text.slice(0, MAX_CANVAS_STICKY_LEN);
    }
  } else {
    return { ok: false, error: "Tin không có nội dung để đưa lên canvas." };
  }

  const created = await createNode(canvasId, viewerId, {
    loai,
    layout: gridLayout(count ?? 0),
    noiDung,
    url,
    messageId,
  });

  if (!created.ok) return created;
  return { ok: true, node: created.node, created: true };
}

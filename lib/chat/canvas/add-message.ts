import "server-only";

import { assertCanvasWritable, loadCanvasContext } from "@/lib/chat/canvas/access";
import { getOrCreateRoomCanvas } from "@/lib/chat/canvas/boards";
import { resolveCanvasMessageMedia } from "@/lib/chat/canvas/message-media";
import { createNode } from "@/lib/chat/canvas/nodes";
import {
  CANVAS_PACK_CELL_H,
  CANVAS_PACK_CELL_W,
  occupiedRectsFromNodes,
  maxLayoutZ,
  nextPackedLayout,
} from "@/lib/chat/canvas/pack-layout";
import type {
  CanvasNodeLayout,
  CanvasNodeLoai,
  CanvasResult,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import { fitCanvasImageSize, fitCanvasVideoLinkSize } from "@/lib/chat/canvas/video-layout";
import { MAX_CANVAS_NODES, MAX_CANVAS_STICKY_LEN } from "@/lib/chat/constants";
import { findFirstHttpUrl } from "@/lib/link/og-preview";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const NODE_SELECT =
  "id, id_canvas, loai, id_tin_nhan, url, noi_dung, layout, id_nguoi_tao, tao_luc, cap_nhat_luc";
const NODE_LOAI: CanvasNodeLoai[] = ["anh", "link", "sticky", "frame", "connector"];

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
  if (obj.imageFitted === true) layout.imageFitted = true;
  if (typeof obj.mediaW === "number" && Number.isFinite(obj.mediaW) && obj.mediaW > 0) {
    layout.mediaW = obj.mediaW;
  }
  if (typeof obj.mediaH === "number" && Number.isFinite(obj.mediaH) && obj.mediaH > 0) {
    layout.mediaH = obj.mediaH;
  }
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
  content_media:
    | {
        cloudflare_id: string | null;
        loai_media?: string | null;
        width?: number | null;
        height?: number | null;
      }
    | {
        cloudflare_id: string | null;
        loai_media?: string | null;
        width?: number | null;
        height?: number | null;
      }[]
    | null;
};

/**
 * Thêm một tin nhắn lên canvas phòng (idempotent theo id_tin_nhan).
 * - Ảnh → node `anh`; video chat R2 / URL (kể cả YouTube) → `link`; còn lại → sticky text.
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
    .select(
      "id, id_phong, noi_dung, loai_tin, da_xoa, content_media(cloudflare_id, loai_media, width, height)",
    )
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

  const body = typeof msg.noi_dung === "string" ? msg.noi_dung : "";
  const media = resolveCanvasMessageMedia(msg.content_media);
  const linkUrl =
    media?.kind === "video"
      ? media.url
      : media?.kind === "anh"
        ? null
        : findFirstHttpUrl(body);
  const text = body.trim();

  let loai: "anh" | "link" | "sticky";
  let url: string | null = null;
  let noiDung: string | null = text || null;

  if (media?.kind === "anh") {
    loai = "anh";
    url = media.url;
  } else if (media?.kind === "video") {
    loai = "link";
    url = media.url;
    noiDung = text && !text.startsWith("chat-video/") ? text : "Video";
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

  // Node cũ (vd. sticky do bỏ sót YouTube) → nâng lên anh/link đúng loại.
  if (existing) {
    const needsUpgrade =
      (loai === "link" || loai === "anh") &&
      (existing.loai !== loai || existing.url !== url);
    if (needsUpgrade) {
      const { data: upgraded, error: upgradeError } = await admin
        .from("chat_canvas_node")
        .update({
          loai,
          url,
          noi_dung: noiDung,
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select(NODE_SELECT)
        .maybeSingle<NodeRow>();
      if (!upgradeError && upgraded) {
        return { ok: true, node: mapNode(upgraded), created: false };
      }
    }
    return { ok: true, node: mapNode(existing), created: false };
  }

  const { data: boardNodes } = await admin
    .from("chat_canvas_node")
    .select("loai, layout")
    .eq("id_canvas", canvasId);

  const existingNodes = boardNodes ?? [];
  if (existingNodes.length >= MAX_CANVAS_NODES) {
    return { ok: false, error: `Canvas tối đa ${MAX_CANVAS_NODES} block.` };
  }

  const occupied = occupiedRectsFromNodes(existingNodes);
  let size = { w: CANVAS_PACK_CELL_W, h: CANVAS_PACK_CELL_H };
  let imageFitted = false;
  let mediaW: number | undefined;
  let mediaH: number | undefined;
  if (
    media?.kind === "anh" &&
    media.width &&
    media.height &&
    media.width > 0 &&
    media.height > 0
  ) {
    size = fitCanvasImageSize(media.width, media.height);
    imageFitted = true;
    mediaW = media.width;
    mediaH = media.height;
  } else if (
    media?.kind === "video" &&
    media.width &&
    media.height &&
    media.width > 0 &&
    media.height > 0
  ) {
    size = fitCanvasVideoLinkSize(media.width, media.height);
    imageFitted = true;
    mediaW = media.width;
    mediaH = media.height;
  }

  const layout = {
    ...nextPackedLayout(occupied, size, maxLayoutZ(existingNodes) + 1),
    ...(imageFitted ? { imageFitted: true as const } : {}),
    ...(mediaW != null ? { mediaW } : {}),
    ...(mediaH != null ? { mediaH } : {}),
  };

  const created = await createNode(canvasId, viewerId, {
    loai,
    layout,
    noiDung,
    url,
    messageId,
  });

  if (!created.ok) return created;
  return { ok: true, node: created.node, created: true };
}

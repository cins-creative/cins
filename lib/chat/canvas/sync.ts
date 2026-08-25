import "server-only";

import { loadCanvasContext } from "@/lib/chat/canvas/access";
import { resolveCanvasMessageMedia } from "@/lib/chat/canvas/message-media";
import {
  CANVAS_PACK_CELL_H,
  CANVAS_PACK_CELL_W,
  layoutToPackRect,
  maxLayoutZ,
  nextPackedLayout,
  occupiedRectsFromNodes,
} from "@/lib/chat/canvas/pack-layout";
import type { CanvasNodeLayout, CanvasResult } from "@/lib/chat/canvas/types";
import {
  fitCanvasImageSize,
  fitCanvasVideoLinkSize,
} from "@/lib/chat/canvas/video-layout";
import {
  CANVAS_SYNC_MESSAGE_LIMIT,
  MAX_CANVAS_NODES,
} from "@/lib/chat/constants";
import { findFirstHttpUrl } from "@/lib/link/og-preview";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type MessageRow = {
  id: string;
  noi_dung: string | null;
  loai_tin: string | null;
  tao_luc: string;
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
 * Đồng bộ tin nhắn ảnh/video/URL của phòng lên canvas dưới dạng node (idempotent).
 * - 1 tin ⇒ tối đa 1 node (ảnh ưu tiên; video chat R2 → link; không thì URL đầu tiên).
 * - Bỏ qua tin đã ẩn (chat_canvas_tin_an) và tin đã có node.
 * - Node mới xếp ô lưới trống; node user đã kéo giữ nguyên.
 */
export async function syncCanvasFromMessages(
  canvasId: string,
  viewerId: string,
): Promise<CanvasResult<{ created: number }>> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const admin = createServiceRoleClient();
  const roomId = loaded.ctx.roomId;

  const [messagesRes, existingRes, hiddenRes] = await Promise.all([
    admin
      .from("chat_tin_nhan")
      .select(
        "id, noi_dung, loai_tin, tao_luc, content_media(cloudflare_id, loai_media, width, height)",
      )
      .eq("id_phong", roomId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: true })
      .limit(CANVAS_SYNC_MESSAGE_LIMIT),
    admin
      .from("chat_canvas_node")
      .select("id_tin_nhan, loai, layout")
      .eq("id_canvas", canvasId),
    admin.from("chat_canvas_tin_an").select("id_tin_nhan").eq("id_canvas", canvasId),
  ]);

  if (messagesRes.error) return { ok: false, error: "Không tải được tin nhắn." };

  const existingMsgIds = new Set(
    (existingRes.data ?? [])
      .map((r) => (r as { id_tin_nhan: string | null }).id_tin_nhan)
      .filter((v): v is string => Boolean(v)),
  );
  const hiddenMsgIds = new Set(
    (hiddenRes.data ?? []).map((r) => (r as { id_tin_nhan: string }).id_tin_nhan),
  );

  const existingNodes = (existingRes.data ?? []) as Array<{
    id_tin_nhan: string | null;
    loai: string | null;
    layout: unknown;
  }>;
  if (existingNodes.length >= MAX_CANVAS_NODES) {
    return { ok: true, created: 0 };
  }

  const occupied = occupiedRectsFromNodes(existingNodes);
  let nextZ = maxLayoutZ(existingNodes) + 1;
  const rows: Array<{
    id_canvas: string;
    loai: "anh" | "link";
    id_tin_nhan: string;
    url: string;
    noi_dung: string | null;
    layout: CanvasNodeLayout;
    id_nguoi_tao: string;
  }> = [];

  const takeSlot = (size: { w: number; h: number }) => {
    const layout = nextPackedLayout(occupied, size, nextZ++);
    occupied.push(layoutToPackRect(layout));
    return layout;
  };

  for (const raw of (messagesRes.data ?? []) as MessageRow[]) {
    if (raw.loai_tin === "sticker") continue;
    if (existingMsgIds.has(raw.id) || hiddenMsgIds.has(raw.id)) continue;
    if (existingNodes.length + rows.length >= MAX_CANVAS_NODES) break;

    const body = typeof raw.noi_dung === "string" ? raw.noi_dung : "";
    const media = resolveCanvasMessageMedia(raw.content_media);

    if (media?.kind === "anh") {
      const size =
        media.width && media.height && media.width > 0 && media.height > 0
          ? fitCanvasImageSize(media.width, media.height)
          : { w: CANVAS_PACK_CELL_W, h: CANVAS_PACK_CELL_H };
      const layout = takeSlot(size);
      if (media.width && media.height) {
        layout.imageFitted = true;
        layout.mediaW = media.width;
        layout.mediaH = media.height;
      }
      rows.push({
        id_canvas: canvasId,
        loai: "anh",
        id_tin_nhan: raw.id,
        url: media.url,
        noi_dung: body.trim() || null,
        layout,
        id_nguoi_tao: viewerId,
      });
      continue;
    }

    if (media?.kind === "video") {
      const size =
        media.width && media.height && media.width > 0 && media.height > 0
          ? fitCanvasVideoLinkSize(media.width, media.height)
          : { w: CANVAS_PACK_CELL_W, h: CANVAS_PACK_CELL_H };
      const layout = takeSlot(size);
      if (media.width && media.height) {
        layout.imageFitted = true;
        layout.mediaW = media.width;
        layout.mediaH = media.height;
      }
      rows.push({
        id_canvas: canvasId,
        loai: "link",
        id_tin_nhan: raw.id,
        url: media.url,
        noi_dung:
          body.trim() && !body.trim().startsWith("chat-video/")
            ? body.trim()
            : "Video",
        layout,
        id_nguoi_tao: viewerId,
      });
      continue;
    }

    const linkUrl = findFirstHttpUrl(body);
    if (linkUrl) {
      rows.push({
        id_canvas: canvasId,
        loai: "link",
        id_tin_nhan: raw.id,
        url: linkUrl,
        noi_dung: body.trim() || null,
        layout: takeSlot({ w: CANVAS_PACK_CELL_W, h: CANVAS_PACK_CELL_H }),
        id_nguoi_tao: viewerId,
      });
    }
  }

  if (rows.length === 0) return { ok: true, created: 0 };

  const { error, data } = await admin
    .from("chat_canvas_node")
    .upsert(rows, { onConflict: "id_canvas,id_tin_nhan", ignoreDuplicates: true })
    .select("id");

  if (error) return { ok: false, error: "Không đồng bộ được canvas." };
  return { ok: true, created: data?.length ?? 0 };
}

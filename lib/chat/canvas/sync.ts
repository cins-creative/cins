import "server-only";

import { loadCanvasContext } from "@/lib/chat/canvas/access";
import { resolveCanvasMessageMedia } from "@/lib/chat/canvas/message-media";
import type { CanvasNodeLayout, CanvasResult } from "@/lib/chat/canvas/types";
import { fitCanvasVideoLinkSize } from "@/lib/chat/canvas/video-layout";
import { CANVAS_SYNC_MESSAGE_LIMIT } from "@/lib/chat/constants";
import { findFirstHttpUrl } from "@/lib/link/og-preview";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const GRID_COLS = 4;
const CELL_W = 260;
const CELL_H = 210;
const GRID_GAP = 24;

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
 * - Node mới xếp lưới nối tiếp sau các node hiện có; user kéo lại sẽ giữ nguyên.
 */
export async function syncCanvasFromMessages(
  canvasId: string,
  viewerId: string,
): Promise<CanvasResult<{ created: number }>> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const admin = createServiceRoleClient();
  const roomId = loaded.ctx.roomId;

  const [messagesRes, existingRes, hiddenRes, countRes] = await Promise.all([
    admin
      .from("chat_tin_nhan")
      .select(
        "id, noi_dung, loai_tin, tao_luc, content_media(cloudflare_id, loai_media, width, height)",
      )
      .eq("id_phong", roomId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: true })
      .limit(CANVAS_SYNC_MESSAGE_LIMIT),
    admin.from("chat_canvas_node").select("id_tin_nhan").eq("id_canvas", canvasId),
    admin.from("chat_canvas_tin_an").select("id_tin_nhan").eq("id_canvas", canvasId),
    admin
      .from("chat_canvas_node")
      .select("id", { count: "exact", head: true })
      .eq("id_canvas", canvasId),
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

  let position = countRes.count ?? 0;
  const rows: Array<{
    id_canvas: string;
    loai: "anh" | "link";
    id_tin_nhan: string;
    url: string;
    noi_dung: string | null;
    layout: CanvasNodeLayout;
    id_nguoi_tao: string;
  }> = [];

  for (const raw of (messagesRes.data ?? []) as MessageRow[]) {
    if (raw.loai_tin === "sticker") continue;
    if (existingMsgIds.has(raw.id) || hiddenMsgIds.has(raw.id)) continue;

    const body = typeof raw.noi_dung === "string" ? raw.noi_dung : "";
    const media = resolveCanvasMessageMedia(raw.content_media);

    if (media?.kind === "anh") {
      rows.push({
        id_canvas: canvasId,
        loai: "anh",
        id_tin_nhan: raw.id,
        url: media.url,
        noi_dung: body.trim() || null,
        layout: gridLayout(position),
        id_nguoi_tao: viewerId,
      });
      position += 1;
      continue;
    }

    if (media?.kind === "video") {
      let layout = gridLayout(position);
      if (media.width && media.height && media.width > 0 && media.height > 0) {
        const size = fitCanvasVideoLinkSize(media.width, media.height);
        layout = {
          ...layout,
          w: size.w,
          h: size.h,
          imageFitted: true,
          mediaW: media.width,
          mediaH: media.height,
        };
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
      position += 1;
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
        layout: gridLayout(position),
        id_nguoi_tao: viewerId,
      });
      position += 1;
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

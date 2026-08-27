import "server-only";

import { assertCanvasWritable, loadCanvasContext } from "@/lib/chat/canvas/access";
import type {
  CanvasClipboardNode,
  CanvasNodeLayout,
  CanvasResult,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import {
  CANVAS_PASTE_GROUP_NAME,
  MAX_CANVAS_PASTE_NODES,
} from "@/lib/chat/canvas/types";
import { MAX_CANVAS_NODES } from "@/lib/chat/constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const NODE_SELECT =
  "id, id_canvas, loai, id_tin_nhan, url, noi_dung, layout, id_nguoi_tao, tao_luc, cap_nhat_luc";

const GROUP_PAD = 24;
const GROUP_TITLE_H = 28;
const PASTE_OFFSET = 40;

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
  const layout =
    row.layout && typeof row.layout === "object"
      ? (row.layout as CanvasNodeLayout)
      : { x: 0, y: 0 };
  return {
    id: row.id,
    canvasId: row.id_canvas,
    loai: row.loai as ChatCanvasNode["loai"],
    messageId: row.id_tin_nhan,
    url: row.url,
    noiDung: row.noi_dung,
    layout,
    idNguoiTao: row.id_nguoi_tao,
    taoLuc: row.tao_luc,
    capNhatLuc: row.cap_nhat_luc,
  };
}

function nodeSize(layout: CanvasNodeLayout): { w: number; h: number } {
  return {
    w: typeof layout.w === "number" && layout.w > 0 ? layout.w : 240,
    h: typeof layout.h === "number" && layout.h > 0 ? layout.h : 200,
  };
}

/**
 * Paste clipboard vào board đích:
 * - không gắn id_tin_nhan
 * - bỏ frame nguồn trong payload
 * - tạo 1 frame «Nội dung được sao chép» + gắn mọi asset vào nhóm đó
 * - tái dùng url/noi_dung (không upload CDN)
 */
export async function pasteCanvasNodes(
  canvasId: string,
  viewerId: string,
  rawNodes: CanvasClipboardNode[],
): Promise<CanvasResult<{ nodes: ChatCanvasNode[] }>> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const writable = assertCanvasWritable(loaded.ctx);
  if (!writable.ok) return writable;

  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    return { ok: false, error: "Không có nội dung để dán." };
  }

  /* Bỏ frame nguồn — chỉ lấy asset / connector / sticky… */
  const assets = rawNodes.filter((n) => n && n.loai && n.loai !== "frame");
  if (assets.length === 0) {
    return { ok: false, error: "Không có nội dung để dán." };
  }

  /* Connector chỉ giữ khi cả from/to còn trong tập asset. */
  const keySet = new Set(assets.map((n) => n.clientKey).filter(Boolean));
  const filtered = assets.filter((n) => {
    if (n.loai !== "connector") return true;
    const from = n.layout?.from;
    const to = n.layout?.to;
    return (
      typeof from === "string" &&
      typeof to === "string" &&
      keySet.has(from) &&
      keySet.has(to)
    );
  });

  if (filtered.length === 0) {
    return { ok: false, error: "Không có nội dung để dán." };
  }

  /* +1 frame nhóm */
  if (filtered.length + 1 > MAX_CANVAS_PASTE_NODES) {
    return {
      ok: false,
      error: `Mỗi lần dán tối đa ${MAX_CANVAS_PASTE_NODES - 1} block.`,
    };
  }

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("chat_canvas_node")
    .select("id", { count: "exact", head: true })
    .eq("id_canvas", canvasId);

  const existing = count ?? 0;
  if (existing + filtered.length + 1 > MAX_CANVAS_NODES) {
    return { ok: false, error: `Canvas tối đa ${MAX_CANVAS_NODES} block.` };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of filtered) {
    if (n.loai === "connector") continue;
    const { w, h } = nodeSize(n.layout ?? { x: 0, y: 0 });
    const x = Number(n.layout?.x) || 0;
    const y = Number(n.layout?.y) || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 240;
    maxY = 200;
  }

  const frameLayout: CanvasNodeLayout = {
    x: minX - GROUP_PAD + PASTE_OFFSET,
    y: minY - GROUP_PAD - GROUP_TITLE_H + PASTE_OFFSET,
    w: Math.max(120, maxX - minX + GROUP_PAD * 2),
    h: Math.max(80, maxY - minY + GROUP_PAD * 2 + GROUP_TITLE_H),
    mau: "#E8EEF7",
  };

  const { data: frameRow, error: frameErr } = await admin
    .from("chat_canvas_node")
    .insert({
      id_canvas: canvasId,
      loai: "frame",
      id_tin_nhan: null,
      url: null,
      noi_dung: CANVAS_PASTE_GROUP_NAME,
      layout: frameLayout,
      id_nguoi_tao: viewerId,
    })
    .select(NODE_SELECT)
    .single<NodeRow>();

  if (frameErr || !frameRow) {
    return { ok: false, error: "Không tạo được nhóm dán." };
  }

  const frameId = frameRow.id;
  const idMap = new Map<string, string>();

  /* Insert asset trước (không connector) để có idMap, rồi connector. */
  const nonConnectors = filtered.filter((n) => n.loai !== "connector");
  const connectors = filtered.filter((n) => n.loai === "connector");
  const created: ChatCanvasNode[] = [mapNode(frameRow)];

  /* Batch insert — tránh N round-trip khi dán nhiều block. */
  type AbsPos = { absX: number; absY: number; clientKey: string };
  const assetAbs: AbsPos[] = [];
  const assetRows: Array<Record<string, unknown>> = [];

  for (const n of nonConnectors) {
    const absX = (Number(n.layout?.x) || 0) + PASTE_OFFSET;
    const absY = (Number(n.layout?.y) || 0) + PASTE_OFFSET;
    const storedLayout: CanvasNodeLayout = {
      ...(n.layout ?? { x: 0, y: 0 }),
      x: absX - frameLayout.x,
      y: absY - frameLayout.y,
      groupId: frameId,
    };
    delete storedLayout.from;
    delete storedLayout.to;
    assetAbs.push({ absX, absY, clientKey: n.clientKey });
    assetRows.push({
      id_canvas: canvasId,
      loai: n.loai,
      id_tin_nhan: null,
      url: n.url?.trim() || null,
      noi_dung: n.noiDung?.trim() || null,
      layout: storedLayout,
      id_nguoi_tao: viewerId,
    });
  }

  if (assetRows.length > 0) {
    const { data: assetData, error: assetErr } = await admin
      .from("chat_canvas_node")
      .insert(assetRows)
      .select(NODE_SELECT);

    if (!assetErr && assetData?.length) {
      const rows = assetData as NodeRow[];
      /* PostgREST giữ thứ tự insert → map theo index. */
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const meta = assetAbs[i];
        if (meta) idMap.set(meta.clientKey, row.id);
        const mapped = mapNode(row);
        const abs = meta ?? {
          absX: mapped.layout.x,
          absY: mapped.layout.y,
          clientKey: "",
        };
        created.push({
          ...mapped,
          layout: {
            ...mapped.layout,
            x: abs.absX,
            y: abs.absY,
            groupId: frameId,
          },
        });
      }
    }
  }

  const connectorRows: Array<Record<string, unknown>> = [];
  const connectorAbs: Array<{ absX: number; absY: number; from: string; to: string }> =
    [];

  for (const n of connectors) {
    const fromKey = n.layout?.from;
    const toKey = n.layout?.to;
    if (typeof fromKey !== "string" || typeof toKey !== "string") continue;
    const from = idMap.get(fromKey);
    const to = idMap.get(toKey);
    if (!from || !to) continue;

    const absX = (Number(n.layout?.x) || 0) + PASTE_OFFSET;
    const absY = (Number(n.layout?.y) || 0) + PASTE_OFFSET;
    const storedLayout: CanvasNodeLayout = {
      ...(n.layout ?? { x: 0, y: 0 }),
      x: absX - frameLayout.x,
      y: absY - frameLayout.y,
      from,
      to,
      groupId: frameId,
    };
    connectorAbs.push({ absX, absY, from, to });
    connectorRows.push({
      id_canvas: canvasId,
      loai: "connector",
      id_tin_nhan: null,
      url: null,
      noi_dung: null,
      layout: storedLayout,
      id_nguoi_tao: viewerId,
    });
  }

  if (connectorRows.length > 0) {
    const { data: connData, error: connErr } = await admin
      .from("chat_canvas_node")
      .insert(connectorRows)
      .select(NODE_SELECT);

    if (!connErr && connData?.length) {
      const rows = connData as NodeRow[];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const meta = connectorAbs[i];
        const mapped = mapNode(row);
        created.push({
          ...mapped,
          layout: {
            ...mapped.layout,
            x: meta?.absX ?? mapped.layout.x,
            y: meta?.absY ?? mapped.layout.y,
            from: meta?.from,
            to: meta?.to,
            groupId: frameId,
          },
        });
      }
    }
  }

  return { ok: true, nodes: created };
}

/**
 * Clipboard copy/paste canvas (client) — text/plain với prefix (MIME custom hay bị chặn).
 *
 * System clipboard (`navigator.clipboard`) cần secure context + quyền đọc;
 * HTTP/LAN hoặc user từ chối → fallback bộ nhớ trong tab (copy→paste cùng phiên).
 */

import type {
  CanvasClipboardNode,
  CanvasClipboardPayload,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import { CANVAS_CLIPBOARD_PREFIX } from "@/lib/chat/canvas/types";

/** Bản copy gần nhất trong tab — không phụ thuộc quyền OS clipboard. */
let memoryClipboard: CanvasClipboardPayload | null = null;

/** Mở rộng selection: chọn frame → gồm mọi con groupId. */
export function expandNodesForCopy(
  all: ReadonlyArray<ChatCanvasNode>,
  selectedIds: ReadonlySet<string>,
): ChatCanvasNode[] {
  if (selectedIds.size === 0) return [];
  const byId = new Map(all.map((n) => [n.id, n]));
  const out = new Map<string, ChatCanvasNode>();

  for (const id of selectedIds) {
    const n = byId.get(id);
    if (!n) continue;
    out.set(n.id, n);
    if (n.loai === "frame") {
      for (const child of all) {
        if (child.layout.groupId === n.id) out.set(child.id, child);
      }
    }
  }

  /* Connector trong selection hoặc nối hai đầu đều nằm trong tập */
  for (const n of all) {
    if (n.loai !== "connector") continue;
    if (out.has(n.id)) continue;
    const from = n.layout.from;
    const to = n.layout.to;
    if (from && to && out.has(from) && out.has(to)) {
      out.set(n.id, n);
    }
  }

  return [...out.values()];
}

export function buildClipboardPayload(input: {
  canvasId: string;
  roomId: string;
  nodes: ReadonlyArray<ChatCanvasNode>;
}): CanvasClipboardPayload | null {
  if (input.nodes.length === 0) return null;
  const nodes: CanvasClipboardNode[] = input.nodes.map((n) => ({
    clientKey: n.id,
    loai: n.loai,
    url: n.url,
    noiDung: n.noiDung,
    layout: { ...n.layout },
  }));
  return {
    v: 1,
    sourceCanvasId: input.canvasId,
    sourceRoomId: input.roomId,
    copiedAt: new Date().toISOString(),
    nodes,
  };
}

export function serializeClipboardPayload(payload: CanvasClipboardPayload): string {
  return CANVAS_CLIPBOARD_PREFIX + JSON.stringify(payload);
}

export function parseClipboardPayload(text: string): CanvasClipboardPayload | null {
  const raw = text.trim();
  if (!raw.startsWith(CANVAS_CLIPBOARD_PREFIX)) return null;
  try {
    const json = JSON.parse(raw.slice(CANVAS_CLIPBOARD_PREFIX.length)) as unknown;
    if (!json || typeof json !== "object") return null;
    const o = json as Record<string, unknown>;
    if (o.v !== 1 || !Array.isArray(o.nodes)) return null;
    return o as unknown as CanvasClipboardPayload;
  } catch {
    return null;
  }
}

export function rememberCanvasClipboard(payload: CanvasClipboardPayload): void {
  memoryClipboard = payload;
}

export function getMemoryCanvasClipboard(): CanvasClipboardPayload | null {
  return memoryClipboard;
}

export async function writeCanvasClipboard(
  payload: CanvasClipboardPayload,
): Promise<boolean> {
  rememberCanvasClipboard(payload);
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return true; /* memory đủ cho Dán trong tab */
  }
  try {
    await navigator.clipboard.writeText(serializeClipboardPayload(payload));
    return true;
  } catch {
    /* Vẫn OK — paste nút dùng memory */
    return true;
  }
}

/**
 * Đọc clipboard: ưu tiên OS, rồi memory trong tab.
 * `denied` = OS chặn đọc và không có memory.
 */
export async function readCanvasClipboard(): Promise<{
  payload: CanvasClipboardPayload | null;
  denied: boolean;
}> {
  let denied = false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseClipboardPayload(text);
      if (parsed) {
        rememberCanvasClipboard(parsed);
        return { payload: parsed, denied: false };
      }
      /* Có text nhưng không phải canvas — vẫn thử memory (copy trong app) */
    } catch {
      denied = true;
    }
  } else {
    denied = true;
  }

  if (memoryClipboard) {
    return { payload: memoryClipboard, denied: false };
  }
  return { payload: null, denied };
}

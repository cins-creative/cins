import "server-only";

import { loadCanvasContext, assertCanvasWritable } from "@/lib/chat/canvas/access";
import type {
  CanvasNodeLayout,
  CanvasNodeLoai,
  CanvasResult,
  CanvasVoidResult,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import { MAX_CANVAS_NODES, MAX_CANVAS_STICKY_LEN, MAX_CANVAS_STRUCTURED_LEN } from "@/lib/chat/constants";
import {
  loadCanvasCommentAuthor,
  notifyCanvasComment,
} from "@/lib/chat/canvas/comment-notice";
import { cloudflareImageIdFromUrlOrId } from "@/lib/chat/image-url";
import type { ChatMessage } from "@/lib/chat/types";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const NODE_SELECT =
  "id, id_canvas, loai, id_tin_nhan, url, noi_dung, layout, id_nguoi_tao, tao_luc, cap_nhat_luc";

const NODE_LOAI: CanvasNodeLoai[] = ["anh", "link", "sticky", "frame", "connector"];

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
  if ("groupId" in obj) {
    layout.groupId = typeof obj.groupId === "string" ? obj.groupId : null;
  }
  if (typeof obj.from === "string") layout.from = obj.from;
  if (typeof obj.to === "string") layout.to = obj.to;
  if (obj.wireStyle === "curve" || obj.wireStyle === "straight" || obj.wireStyle === "elbow") {
    layout.wireStyle = obj.wireStyle;
  }
  if (obj.wireArrow === "end" || obj.wireArrow === "both" || obj.wireArrow === "none") {
    layout.wireArrow = obj.wireArrow;
  }
  if (
    obj.wireFromSide === "n" ||
    obj.wireFromSide === "s" ||
    obj.wireFromSide === "e" ||
    obj.wireFromSide === "w"
  ) {
    layout.wireFromSide = obj.wireFromSide;
  }
  if (
    obj.wireToSide === "n" ||
    obj.wireToSide === "s" ||
    obj.wireToSide === "e" ||
    obj.wireToSide === "w"
  ) {
    layout.wireToSide = obj.wireToSide;
  }
  if (typeof obj.wireFromOffset === "number" && Number.isFinite(obj.wireFromOffset)) {
    layout.wireFromOffset = obj.wireFromOffset;
  }
  if (typeof obj.wireToOffset === "number" && Number.isFinite(obj.wireToOffset)) {
    layout.wireToOffset = obj.wireToOffset;
  }
  if (obj.wireMid && typeof obj.wireMid === "object") {
    const mid = obj.wireMid as Record<string, unknown>;
    if (
      typeof mid.x === "number" &&
      Number.isFinite(mid.x) &&
      typeof mid.y === "number" &&
      Number.isFinite(mid.y)
    ) {
      layout.wireMid = { x: mid.x, y: mid.y };
    }
  }
  if (Array.isArray(obj.wireAnchors)) {
    const anchors: Array<{ x: number; y: number }> = [];
    for (const item of obj.wireAnchors) {
      if (!item || typeof item !== "object") continue;
      const pt = item as Record<string, unknown>;
      if (
        typeof pt.x === "number" &&
        Number.isFinite(pt.x) &&
        typeof pt.y === "number" &&
        Number.isFinite(pt.y)
      ) {
        anchors.push({ x: pt.x, y: pt.y });
      }
    }
    if (anchors.length > 0) layout.wireAnchors = anchors;
  }
  if (
    obj.shapeKind === "rect" ||
    obj.shapeKind === "ellipse" ||
    obj.shapeKind === "diamond"
  ) {
    layout.shapeKind = obj.shapeKind;
  }
  if (
    obj.contentKind === "table" ||
    obj.contentKind === "draw" ||
    obj.contentKind === "comment"
  ) {
    layout.contentKind = obj.contentKind;
  }
  if (obj.commentAuthor && typeof obj.commentAuthor === "object") {
    const a = obj.commentAuthor as Record<string, unknown>;
    if (typeof a.id === "string" && typeof a.ten === "string") {
      layout.commentAuthor = {
        id: a.id,
        ten: a.ten,
        slug: typeof a.slug === "string" ? a.slug : null,
        avatarUrl: typeof a.avatarUrl === "string" ? a.avatarUrl : null,
      };
    }
  }
  if (obj.imageFitted === true) layout.imageFitted = true;
  return layout;
}

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

/** Danh sách node của một board. */
export async function listCanvasNodes(
  canvasId: string,
  viewerId: string,
): Promise<CanvasResult<{ nodes: ChatCanvasNode[] }>> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("chat_canvas_node")
    .select(NODE_SELECT)
    .eq("id_canvas", canvasId)
    .order("tao_luc", { ascending: true });

  if (error) return { ok: false, error: "Không tải được node." };
  return { ok: true, nodes: (data ?? []).map((r) => mapNode(r as NodeRow)) };
}

export type CreateNodeInput = {
  loai: CanvasNodeLoai;
  layout: CanvasNodeLayout;
  noiDung?: string | null;
  url?: string | null;
  messageId?: string | null;
};

/** Tạo node tự do (sticky / frame / connector) hoặc block trỏ tin. */
export async function createNode(
  canvasId: string,
  viewerId: string,
  input: CreateNodeInput,
): Promise<CanvasResult<{ node: ChatCanvasNode; notice?: ChatMessage | null }>> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const writable = assertCanvasWritable(loaded.ctx);
  if (!writable.ok) return writable;

  if (!NODE_LOAI.includes(input.loai)) {
    return { ok: false, error: "Loại node không hợp lệ." };
  }

  const noiDung = input.noiDung?.trim() || null;
  let layout = { ...input.layout };
  if (layout.contentKind === "comment") {
    const author = await loadCanvasCommentAuthor(viewerId);
    layout = {
      ...layout,
      contentKind: "comment",
      commentAuthor: author,
    };
  }

  const structured =
    layout.contentKind === "table" || layout.contentKind === "draw";
  const maxLen = structured ? MAX_CANVAS_STRUCTURED_LEN : MAX_CANVAS_STICKY_LEN;
  if (noiDung && noiDung.length > maxLen) {
    return { ok: false, error: `Nội dung tối đa ${maxLen} ký tự.` };
  }

  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("chat_canvas_node")
    .select("id", { count: "exact", head: true })
    .eq("id_canvas", canvasId);

  if ((count ?? 0) >= MAX_CANVAS_NODES) {
    return { ok: false, error: `Canvas tối đa ${MAX_CANVAS_NODES} block.` };
  }

  const { data, error } = await admin
    .from("chat_canvas_node")
    .insert({
      id_canvas: canvasId,
      loai: input.loai,
      id_tin_nhan: input.messageId ?? null,
      url: input.url?.trim() || null,
      noi_dung: noiDung,
      layout,
      id_nguoi_tao: viewerId,
    })
    .select(NODE_SELECT)
    .single<NodeRow>();

  if (error || !data) return { ok: false, error: "Không tạo được node." };

  const node = mapNode(data);

  let notice: ChatMessage | null = null;
  if (layout.contentKind === "comment" && layout.commentAuthor) {
    notice = await notifyCanvasComment({
      roomId: loaded.ctx.roomId,
      canvasId,
      nodeId: node.id,
      author: layout.commentAuthor,
      viewerId,
    });
  }

  return notice ? { ok: true, node, notice } : { ok: true, node };
}

export type UpdateNodeInput = {
  layout?: CanvasNodeLayout;
  noiDung?: string | null;
};

/** Cập nhật vị trí / nội dung node — mọi thành viên (board không khóa). */
export async function updateNode(
  nodeId: string,
  viewerId: string,
  patch: UpdateNodeInput,
): Promise<CanvasResult<{ node: ChatCanvasNode }>> {
  const admin = createServiceRoleClient();
  const { data: node } = await admin
    .from("chat_canvas_node")
    .select("id, id_canvas, layout")
    .eq("id", nodeId)
    .maybeSingle<{ id: string; id_canvas: string; layout: unknown }>();

  if (!node) return { ok: false, error: "Không tìm thấy node." };

  const loaded = await loadCanvasContext(node.id_canvas, viewerId);
  if (!loaded.ok) return loaded;

  const writable = assertCanvasWritable(loaded.ctx);
  if (!writable.ok) return writable;

  const update: Record<string, unknown> = {};
  if (patch.layout !== undefined) update.layout = patch.layout;
  if (patch.noiDung !== undefined) {
    const noiDung = patch.noiDung?.trim() || null;
    const existingKind = coerceLayout(node.layout).contentKind;
    const kind = patch.layout?.contentKind ?? existingKind;
    const maxLen =
      kind === "table" || kind === "draw"
        ? MAX_CANVAS_STRUCTURED_LEN
        : MAX_CANVAS_STICKY_LEN;
    if (noiDung && noiDung.length > maxLen) {
      return { ok: false, error: `Nội dung tối đa ${maxLen} ký tự.` };
    }
    update.noi_dung = noiDung;
  }
  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const { data, error } = await admin
    .from("chat_canvas_node")
    .update(update)
    .eq("id", nodeId)
    .select(NODE_SELECT)
    .single<NodeRow>();

  if (error || !data) return { ok: false, error: "Không cập nhật được node." };
  return { ok: true, node: mapNode(data) };
}

/** Xóa node — mọi thành viên có quyền ghi board. */
export async function deleteNode(
  nodeId: string,
  viewerId: string,
): Promise<CanvasVoidResult> {
  const admin = createServiceRoleClient();
  const { data: node } = await admin
    .from("chat_canvas_node")
    .select("id, id_canvas, id_nguoi_tao, loai, url, id_tin_nhan")
    .eq("id", nodeId)
    .maybeSingle<{
      id: string;
      id_canvas: string;
      id_nguoi_tao: string;
      loai: string;
      url: string | null;
      id_tin_nhan: string | null;
    }>();

  if (!node) return { ok: false, error: "Không tìm thấy node." };

  const loaded = await loadCanvasContext(node.id_canvas, viewerId);
  if (!loaded.ok) return loaded;

  const writable = assertCanvasWritable(loaded.ctx);
  if (!writable.ok) return writable;

  // Board cộng tác: mọi thành viên ghi được đều xóa được block
  // (tránh UI gỡ local nhưng server giữ → F5 / remount hiện lại).

  const { error } = await admin.from("chat_canvas_node").delete().eq("id", nodeId);
  if (error) return { ok: false, error: "Không xóa được node." };

  // Ảnh/link từ tin chat — ẩn để sync không import lại.
  if (node.id_tin_nhan) {
    await admin.from("chat_canvas_tin_an").upsert(
      {
        id_canvas: node.id_canvas,
        id_tin_nhan: node.id_tin_nhan,
        id_nguoi_an: viewerId,
      },
      { onConflict: "id_canvas,id_tin_nhan" },
    );
  }

  // Ảnh chỉ tồn tại trên canvas (paste/drop) — xóa luôn trên Cloudflare.
  // Không đụng ảnh gắn tin chat (id_tin_nhan) vì tin gốc vẫn cần ảnh.
  if (node.loai === "anh" && !node.id_tin_nhan && node.url) {
    const cfId = cloudflareImageIdFromUrlOrId(node.url);
    if (cfId) void deleteCloudflareImage(cfId);
  }

  return { ok: true };
}

/** Ẩn một tin khỏi auto-import canvas (không xóa tin gốc). Đồng thời gỡ node auto nếu có. */
export async function hideMessageFromCanvas(
  canvasId: string,
  viewerId: string,
  messageId: string,
): Promise<CanvasVoidResult> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const writable = assertCanvasWritable(loaded.ctx);
  if (!writable.ok) return writable;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_canvas_tin_an")
    .upsert(
      { id_canvas: canvasId, id_tin_nhan: messageId, id_nguoi_an: viewerId },
      { onConflict: "id_canvas,id_tin_nhan" },
    );
  if (error) return { ok: false, error: "Không ẩn được tin khỏi canvas." };

  await admin
    .from("chat_canvas_node")
    .delete()
    .eq("id_canvas", canvasId)
    .eq("id_tin_nhan", messageId);

  return { ok: true };
}

/** Bỏ ẩn tin — lần sync sau sẽ auto-import lại. */
export async function unhideMessageFromCanvas(
  canvasId: string,
  viewerId: string,
  messageId: string,
): Promise<CanvasVoidResult> {
  const loaded = await loadCanvasContext(canvasId, viewerId);
  if (!loaded.ok) return loaded;

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("chat_canvas_tin_an")
    .delete()
    .eq("id_canvas", canvasId)
    .eq("id_tin_nhan", messageId);

  if (error) return { ok: false, error: "Không bỏ ẩn được tin." };
  return { ok: true };
}

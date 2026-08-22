/**
 * Sắp xếp lại block trên canvas — lưới ngang, giữ nhóm (frame) gom nội dung con.
 */

import {
  nodeRect,
  type BoardNode,
} from "@/components/cins/board/board-types";

export const AUTO_LAYOUT_GAP = 24;
export const AUTO_LAYOUT_ORIGIN = 40;
export const AUTO_LAYOUT_COLS = 3;

const FRAME_PAD = 24;
const FRAME_TITLE_H = 34;

type Cluster = {
  kind: "frame" | "node";
  frameId?: string;
  w: number;
  h: number;
  sortY: number;
  sortX: number;
  /** Vị trí thành viên frame — tương đối góc trên-trái frame. */
  memberRel?: Map<string, { x: number; y: number }>;
  nodeId?: string;
};

function layoutMembersInFrame(members: BoardNode[]): {
  memberRel: Map<string, { x: number; y: number }>;
  w: number;
  h: number;
} {
  const sorted = [...members].sort(
    (a, b) =>
      (a.layout.z ?? 0) - (b.layout.z ?? 0) || a.id.localeCompare(b.id),
  );
  const innerCols = Math.min(
    3,
    Math.max(1, Math.ceil(Math.sqrt(sorted.length))),
  );
  const memberRel = new Map<string, { x: number; y: number }>();
  let relX = FRAME_PAD;
  let relY = FRAME_PAD + FRAME_TITLE_H;
  let rowH = 0;
  let col = 0;
  let maxRight = FRAME_PAD;
  let maxBottom = relY;

  for (const m of sorted) {
    const r = nodeRect(m);
    if (col >= innerCols) {
      col = 0;
      relX = FRAME_PAD;
      relY += rowH + AUTO_LAYOUT_GAP;
      rowH = 0;
    }
    memberRel.set(m.id, { x: relX, y: relY });
    relX += r.w + AUTO_LAYOUT_GAP;
    rowH = Math.max(rowH, r.h);
    maxRight = Math.max(maxRight, relX - AUTO_LAYOUT_GAP + FRAME_PAD);
    maxBottom = Math.max(maxBottom, relY + r.h + FRAME_PAD);
    col += 1;
  }

  return {
    memberRel,
    w: Math.max(120, maxRight),
    h: Math.max(80, maxBottom),
  };
}

export type AutoLayoutOptions = {
  /**
   * Chỉ xếp các node này (+ cả nhóm nếu chọn frame hoặc thành viên nhóm).
   * Bỏ trống = xếp toàn board.
   */
  onlyIds?: Set<string>;
};

/** Trả bản nodes mới (connector giữ nguyên) — tọa độ tuyệt đối trong engine. */
export function applyAutoLayout(
  nodes: BoardNode[],
  options?: AutoLayoutOptions,
): BoardNode[] {
  const base = nodes.map((n) => ({ ...n, layout: { ...n.layout } }));
  const layoutNodes = base.filter((n) => n.loai !== "connector");
  const onlyIds = options?.onlyIds;
  const scoped = Boolean(onlyIds && onlyIds.size > 0);

  const allFrames = layoutNodes.filter((n) => n.loai === "frame");
  const frames = scoped
    ? allFrames.filter((f) => {
        if (onlyIds!.has(f.id)) return true;
        return layoutNodes.some(
          (n) => onlyIds!.has(n.id) && n.layout.groupId === f.id,
        );
      })
    : allFrames;
  const frameIds = new Set(frames.map((f) => f.id));
  const clusters: Cluster[] = [];

  for (const frame of frames) {
    const members = layoutNodes.filter(
      (n) => n.layout.groupId === frame.id && n.id !== frame.id,
    );
    const fr = nodeRect(frame);
    if (members.length === 0) {
      clusters.push({
        kind: "frame",
        frameId: frame.id,
        w: fr.w,
        h: fr.h,
        sortY: fr.y,
        sortX: fr.x,
        memberRel: new Map(),
      });
      continue;
    }
    const inner = layoutMembersInFrame(members);
    clusters.push({
      kind: "frame",
      frameId: frame.id,
      w: inner.w,
      h: inner.h,
      sortY: fr.y,
      sortX: fr.x,
      memberRel: inner.memberRel,
    });
  }

  for (const n of layoutNodes) {
    if (n.loai === "frame") continue;
    if (scoped && !onlyIds!.has(n.id)) continue;
    const gid = n.layout.groupId;
    if (gid && frameIds.has(gid)) continue;
    const r = nodeRect(n);
    clusters.push({
      kind: "node",
      nodeId: n.id,
      w: r.w,
      h: r.h,
      sortY: r.y,
      sortX: r.x,
    });
  }

  if (clusters.length === 0) return base;

  clusters.sort((a, b) => a.sortY - b.sortY || a.sortX - b.sortX);

  const originX = scoped
    ? Math.min(...clusters.map((c) => c.sortX))
    : AUTO_LAYOUT_ORIGIN;
  const originY = scoped
    ? Math.min(...clusters.map((c) => c.sortY))
    : AUTO_LAYOUT_ORIGIN;
  const cols = scoped
    ? Math.min(AUTO_LAYOUT_COLS, Math.max(1, clusters.length))
    : AUTO_LAYOUT_COLS;

  const updates = new Map<string, Partial<BoardNode["layout"]>>();
  let px = originX;
  let py = originY;
  let col = 0;
  let rowH = 0;

  for (const c of clusters) {
    if (col >= cols) {
      col = 0;
      px = originX;
      py += rowH + AUTO_LAYOUT_GAP;
      rowH = 0;
    }

    if (c.kind === "frame" && c.frameId) {
      updates.set(c.frameId, { x: px, y: py, w: c.w, h: c.h });
      if (c.memberRel) {
        for (const [mid, rel] of c.memberRel) {
          updates.set(mid, { x: px + rel.x, y: py + rel.y });
        }
      }
    } else if (c.nodeId) {
      updates.set(c.nodeId, { x: px, y: py });
    }

    px += c.w + AUTO_LAYOUT_GAP;
    rowH = Math.max(rowH, c.h);
    col += 1;
  }

  return base.map((n) => {
    const patch = updates.get(n.id);
    if (!patch) return n;
    return { ...n, layout: { ...n.layout, ...patch } };
  });
}

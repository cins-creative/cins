/**
 * Định tuyến dây nối giữa hai block trên board.
 * Neo theo cạnh + điểm giữa legacy (`mid`) + nhiều điểm neo (`anchors`).
 */

export type BoardRect = { x: number; y: number; w: number; h: number };
export type WireSide = "n" | "s" | "e" | "w";
export type WireStyle = "curve" | "straight" | "elbow";
export type WireArrow = "end" | "both" | "none";
export type WirePoint = { x: number; y: number };

export const WIRE_STYLES: readonly WireStyle[] = [
  "curve",
  "straight",
  "elbow",
] as const;

export const WIRE_ARROWS: readonly WireArrow[] = [
  "end",
  "both",
  "none",
] as const;

export const WIRE_SIDES: readonly WireSide[] = ["n", "s", "e", "w"] as const;

export type WireRouteOpts = {
  fromSide?: WireSide | null;
  toSide?: WireSide | null;
  fromOffset?: number | null;
  toOffset?: number | null;
  /** Điểm điều khiển giữa legacy (một điểm). Bỏ qua nếu có `anchors`. */
  mid?: WirePoint | null;
  /** Điểm neo đi qua đường (page coords), thứ tự từ đầu → đích. */
  anchors?: WirePoint[] | null;
};

export type WirePathResult = {
  d: string;
  from: WirePoint;
  to: WirePoint;
  /** Handle giữa legacy / neo đầu tiên — dùng vẽ nút khi chưa có anchors. */
  mid: WirePoint;
  /** Điểm neo đã resolve (không gồm from/to). */
  anchors: WirePoint[];
  fromSide: WireSide;
  toSide: WireSide;
  fromOffset: number;
  toOffset: number;
  /** Polyline densified — snap / hit gần path. */
  poly: WirePoint[];
};

export function normalizeWireStyle(
  value: string | null | undefined,
): WireStyle {
  if (value === "straight" || value === "elbow") return value;
  return "curve";
}

export function normalizeWireArrow(
  value: string | null | undefined,
): WireArrow {
  if (value === "both" || value === "none") return value;
  return "end";
}

export function normalizeWireSide(
  value: string | null | undefined,
): WireSide | null {
  if (value === "n" || value === "s" || value === "e" || value === "w") {
    return value;
  }
  return null;
}

function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0.5;
  return Math.min(1, Math.max(0, t));
}

export function sideAnchor(
  r: BoardRect,
  side: WireSide,
  offset = 0.5,
): WirePoint {
  const t = clamp01(offset);
  switch (side) {
    case "n":
      return { x: r.x + r.w * t, y: r.y };
    case "s":
      return { x: r.x + r.w * t, y: r.y + r.h };
    case "e":
      return { x: r.x + r.w, y: r.y + r.h * t };
    case "w":
      return { x: r.x, y: r.y + r.h * t };
  }
}

function outward(side: WireSide, dist: number): WirePoint {
  switch (side) {
    case "n":
      return { x: 0, y: -dist };
    case "s":
      return { x: 0, y: dist };
    case "e":
      return { x: dist, y: 0 };
    case "w":
      return { x: -dist, y: 0 };
  }
}

/**
 * Chọn cặp cạnh đối diện hợp lý theo khoảng cách / hướng giữa hai khối.
 * Ưu tiên trục có khe hở rõ (không chồng); chồng thì theo delta tâm.
 */
export function preferredSides(
  a: BoardRect,
  b: BoardRect,
): [WireSide, WireSide] {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;

  const gapX = bcx >= acx ? b.x - (a.x + a.w) : a.x - (b.x + b.w);
  const gapY = bcy >= acy ? b.y - (a.y + a.h) : a.y - (b.y + b.h);

  if (gapX >= gapY && gapX > 8) {
    return bcx >= acx ? ["e", "w"] : ["w", "e"];
  }
  if (gapY > 8) {
    return bcy >= acy ? ["s", "n"] : ["n", "s"];
  }

  const dx = bcx - acx;
  const dy = bcy - acy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ["e", "w"] : ["w", "e"];
  }
  return dy >= 0 ? ["s", "n"] : ["n", "s"];
}

/**
 * Chiếu điểm lên cạnh gần nhất của rect — dùng khi kéo neo đầu/cuối dây.
 */
export function nearestEdgeAttachment(
  r: BoardRect,
  p: WirePoint,
): { side: WireSide; offset: number; point: WirePoint } {
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  const candidates: Array<{
    side: WireSide;
    offset: number;
    point: WirePoint;
    dist: number;
  }> = [];

  const nx = clamp(p.x, r.x, right);
  candidates.push({
    side: "n",
    offset: r.w > 0 ? (nx - r.x) / r.w : 0.5,
    point: { x: nx, y: r.y },
    dist: Math.hypot(p.x - nx, p.y - r.y),
  });
  const sx = clamp(p.x, r.x, right);
  candidates.push({
    side: "s",
    offset: r.w > 0 ? (sx - r.x) / r.w : 0.5,
    point: { x: sx, y: bottom },
    dist: Math.hypot(p.x - sx, p.y - bottom),
  });
  const ey = clamp(p.y, r.y, bottom);
  candidates.push({
    side: "e",
    offset: r.h > 0 ? (ey - r.y) / r.h : 0.5,
    point: { x: right, y: ey },
    dist: Math.hypot(p.x - right, p.y - ey),
  });
  const wy = clamp(p.y, r.y, bottom);
  candidates.push({
    side: "w",
    offset: r.h > 0 ? (wy - r.y) / r.h : 0.5,
    point: { x: r.x, y: wy },
    dist: Math.hypot(p.x - r.x, p.y - wy),
  });

  let best = candidates[0]!;
  for (const c of candidates) {
    if (c.dist < best.dist) best = c;
  }
  return { side: best.side, offset: best.offset, point: best.point };
}

function controlOffset(p1: WirePoint, p2: WirePoint): number {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  return Math.max(36, Math.min(140, dist * 0.45));
}

function isHorizontal(side: WireSide): boolean {
  return side === "e" || side === "w";
}

function autoCurveMid(
  p1: WirePoint,
  p2: WirePoint,
  s1: WireSide,
  s2: WireSide,
): WirePoint {
  const offset = controlOffset(p1, p2);
  const o1 = outward(s1, offset);
  const o2 = outward(s2, offset);
  return {
    x: (p1.x + o1.x + p2.x + o2.x) / 2,
    y: (p1.y + o1.y + p2.y + o2.y) / 2,
  };
}

function pathCurve(
  p1: WirePoint,
  p2: WirePoint,
  s1: WireSide,
  s2: WireSide,
  mid: WirePoint,
  midCustom: boolean,
): string {
  if (midCustom) {
    return `M ${p1.x} ${p1.y} Q ${mid.x} ${mid.y}, ${p2.x} ${p2.y}`;
  }
  const offset = controlOffset(p1, p2);
  const o1 = outward(s1, offset);
  const o2 = outward(s2, offset);
  return `M ${p1.x} ${p1.y} C ${p1.x + o1.x} ${p1.y + o1.y}, ${p2.x + o2.x} ${p2.y + o2.y}, ${p2.x} ${p2.y}`;
}

function pathStraight(
  p1: WirePoint,
  p2: WirePoint,
  mid: WirePoint,
  midCustom: boolean,
): string {
  if (midCustom) {
    return `M ${p1.x} ${p1.y} L ${mid.x} ${mid.y} L ${p2.x} ${p2.y}`;
  }
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
}

/** Orthogonal: ra khỏi mép rồi gập góc giữa hai neo. */
function pathElbow(
  p1: WirePoint,
  p2: WirePoint,
  s1: WireSide,
  mid: WirePoint,
  midCustom: boolean,
): string {
  if (isHorizontal(s1)) {
    const midX = midCustom ? mid.x : (p1.x + p2.x) / 2;
    return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
  }
  const midY = midCustom ? mid.y : (p1.y + p2.y) / 2;
  return `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
}

function defaultMidForStyle(
  style: WireStyle,
  p1: WirePoint,
  p2: WirePoint,
  s1: WireSide,
  s2: WireSide,
): WirePoint {
  if (style === "curve") return autoCurveMid(p1, p2, s1, s2);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function normalizePointList(raw: WirePoint[] | null | undefined): WirePoint[] {
  if (!raw || raw.length === 0) return [];
  const out: WirePoint[] = [];
  for (const p of raw) {
    if (
      p &&
      typeof p.x === "number" &&
      Number.isFinite(p.x) &&
      typeof p.y === "number" &&
      Number.isFinite(p.y)
    ) {
      out.push({ x: p.x, y: p.y });
    }
  }
  return out;
}

/** Đường thẳng qua các điểm. */
function pathPolyline(pts: WirePoint[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i]!.x} ${pts[i]!.y}`;
  }
  return d;
}

/** Orthogonal nối từng cặp điểm liên tiếp. */
function pathElbowThrough(pts: WirePoint[], s1: WireSide): string {
  if (pts.length < 2) return pathPolyline(pts);
  const corners: WirePoint[] = [pts[0]!];
  let horiz = isHorizontal(s1);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) {
      corners.push(b);
    } else if (horiz) {
      corners.push({ x: b.x, y: a.y });
      corners.push(b);
    } else {
      corners.push({ x: a.x, y: b.y });
      corners.push(b);
    }
    horiz = !horiz;
  }
  return pathPolyline(corners);
}

/**
 * Catmull-Rom → cubic bezier qua các điểm (điểm nằm trên path).
 */
function pathCurveThrough(pts: WirePoint[]): string {
  if (pts.length < 2) return pathPolyline(pts);
  if (pts.length === 2) {
    return `M ${pts[0]!.x} ${pts[0]!.y} L ${pts[1]!.x} ${pts[1]!.y}`;
  }
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function lerp(a: WirePoint, b: WirePoint, t: number): WirePoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function sampleSegment(
  a: WirePoint,
  b: WirePoint,
  steps: number,
  out: WirePoint[],
): void {
  for (let i = 1; i <= steps; i++) {
    out.push(lerp(a, b, i / steps));
  }
}

function sampleQuadratic(
  p0: WirePoint,
  p1: WirePoint,
  p2: WirePoint,
  steps: number,
  out: WirePoint[],
): void {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
}

function sampleCubic(
  p0: WirePoint,
  c1: WirePoint,
  c2: WirePoint,
  p1: WirePoint,
  steps: number,
  out: WirePoint[],
): void {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x:
        u * u * u * p0.x +
        3 * u * u * t * c1.x +
        3 * u * t * t * c2.x +
        t * t * t * p1.x,
      y:
        u * u * u * p0.y +
        3 * u * u * t * c1.y +
        3 * u * t * t * c2.y +
        t * t * t * p1.y,
    });
  }
}

function densifyStraight(pts: WirePoint[]): WirePoint[] {
  if (pts.length === 0) return [];
  const out: WirePoint[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const steps = Math.max(
      4,
      Math.min(24, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24)),
    );
    sampleSegment(a, b, steps, out);
  }
  return out;
}

function densifyElbow(pts: WirePoint[], s1: WireSide): WirePoint[] {
  if (pts.length < 2) return densifyStraight(pts);
  const corners: WirePoint[] = [pts[0]!];
  let horiz = isHorizontal(s1);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) {
      corners.push(b);
    } else if (horiz) {
      corners.push({ x: b.x, y: a.y });
      corners.push(b);
    } else {
      corners.push({ x: a.x, y: b.y });
      corners.push(b);
    }
    horiz = !horiz;
  }
  return densifyStraight(corners);
}

function densifyCurveThrough(pts: WirePoint[]): WirePoint[] {
  if (pts.length < 2) return densifyStraight(pts);
  if (pts.length === 2) return densifyStraight(pts);
  const out: WirePoint[] = [pts[0]!];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const c2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };
    const steps = Math.max(
      6,
      Math.min(28, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 18)),
    );
    sampleCubic(p1, c1, c2, p2, steps, out);
  }
  return out;
}

function densifyLegacyCurve(
  p1: WirePoint,
  p2: WirePoint,
  s1: WireSide,
  s2: WireSide,
  mid: WirePoint,
  midCustom: boolean,
): WirePoint[] {
  const out: WirePoint[] = [p1];
  if (midCustom) {
    sampleQuadratic(p1, mid, p2, 28, out);
    return out;
  }
  const offset = controlOffset(p1, p2);
  const o1 = outward(s1, offset);
  const o2 = outward(s2, offset);
  sampleCubic(
    p1,
    { x: p1.x + o1.x, y: p1.y + o1.y },
    { x: p2.x + o2.x, y: p2.y + o2.y },
    p2,
    28,
    out,
  );
  return out;
}

function densifyLegacyElbow(
  p1: WirePoint,
  p2: WirePoint,
  s1: WireSide,
  mid: WirePoint,
  midCustom: boolean,
): WirePoint[] {
  if (isHorizontal(s1)) {
    const midX = midCustom ? mid.x : (p1.x + p2.x) / 2;
    return densifyStraight([
      p1,
      { x: midX, y: p1.y },
      { x: midX, y: p2.y },
      p2,
    ]);
  }
  const midY = midCustom ? mid.y : (p1.y + p2.y) / 2;
  return densifyStraight([
    p1,
    { x: p1.x, y: midY },
    { x: p2.x, y: midY },
    p2,
  ]);
}

/**
 * Chiếu điểm lên polyline densified — điểm snap chạy theo path.
 */
export function closestPointOnPoly(
  poly: WirePoint[],
  p: WirePoint,
): { point: WirePoint; dist: number; segIndex: number; t: number } | null {
  if (poly.length === 0) return null;
  if (poly.length === 1) {
    const only = poly[0]!;
    return {
      point: only,
      dist: Math.hypot(p.x - only.x, p.y - only.y),
      segIndex: 0,
      t: 0,
    };
  }
  let bestDist = Infinity;
  let bestPoint = poly[0]!;
  let bestSeg = 0;
  let bestT = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i]!;
    const b = poly[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t =
      len2 < 1e-8
        ? 0
        : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const dist = Math.hypot(p.x - q.x, p.y - q.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = q;
      bestSeg = i;
      bestT = t;
    }
  }
  return { point: bestPoint, dist: bestDist, segIndex: bestSeg, t: bestT };
}

/**
 * Chèn điểm neo mới đúng thứ tự dọc path (giữa from → anchors → to).
 * Tránh trùng quá gần neo/đầu/cuối đã có.
 */
export function insertWireAnchor(
  anchors: WirePoint[],
  from: WirePoint,
  to: WirePoint,
  point: WirePoint,
  minGap = 12,
): WirePoint[] | null {
  const keys = [from, ...anchors, to];
  for (const k of keys) {
    if (Math.hypot(k.x - point.x, k.y - point.y) < minGap) return null;
  }

  /* Chọn khe (i → i+1) gần điểm nhất trên polyline thô. */
  let bestI = 0;
  let bestDist = Infinity;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t =
      len2 < 1e-8
        ? 0
        : Math.min(
            1,
            Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2),
          );
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const dist = Math.hypot(point.x - q.x, point.y - q.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestI = i;
    }
  }

  const next = anchors.slice();
  next.splice(bestI, 0, { x: point.x, y: point.y });
  return next;
}

export function wirePathBetween(
  a: BoardRect,
  b: BoardRect,
  style: WireStyle = "curve",
  opts: WireRouteOpts = {},
): WirePathResult {
  const [autoFrom, autoTo] = preferredSides(a, b);
  const fromSide = opts.fromSide ?? autoFrom;
  const toSide = opts.toSide ?? autoTo;
  const fromOffset = clamp01(
    opts.fromOffset == null ? 0.5 : opts.fromOffset,
  );
  const toOffset = clamp01(opts.toOffset == null ? 0.5 : opts.toOffset);
  const p1 = sideAnchor(a, fromSide, fromOffset);
  const p2 = sideAnchor(b, toSide, toOffset);
  const anchors = normalizePointList(opts.anchors);

  if (anchors.length > 0) {
    const pts = [p1, ...anchors, p2];
    const d =
      style === "straight"
        ? pathPolyline(pts)
        : style === "elbow"
          ? pathElbowThrough(pts, fromSide)
          : pathCurveThrough(pts);
    const poly =
      style === "straight"
        ? densifyStraight(pts)
        : style === "elbow"
          ? densifyElbow(pts, fromSide)
          : densifyCurveThrough(pts);
    return {
      d,
      from: p1,
      to: p2,
      mid: anchors[0]!,
      anchors,
      fromSide,
      toSide,
      fromOffset,
      toOffset,
      poly,
    };
  }

  const midCustom = Boolean(
    opts.mid &&
      Number.isFinite(opts.mid.x) &&
      Number.isFinite(opts.mid.y),
  );
  let mid = midCustom
    ? { x: opts.mid!.x, y: opts.mid!.y }
    : defaultMidForStyle(style, p1, p2, fromSide, toSide);

  if (style === "elbow") {
    if (isHorizontal(fromSide)) {
      const midX = midCustom ? mid.x : (p1.x + p2.x) / 2;
      mid = { x: midX, y: (p1.y + p2.y) / 2 };
    } else {
      const midY = midCustom ? mid.y : (p1.y + p2.y) / 2;
      mid = { x: (p1.x + p2.x) / 2, y: midY };
    }
  }

  const d =
    style === "straight"
      ? pathStraight(p1, p2, mid, midCustom)
      : style === "elbow"
        ? pathElbow(p1, p2, fromSide, mid, midCustom)
        : pathCurve(p1, p2, fromSide, toSide, mid, midCustom);

  const poly =
    style === "straight"
      ? densifyStraight(midCustom ? [p1, mid, p2] : [p1, p2])
      : style === "elbow"
        ? densifyLegacyElbow(p1, p2, fromSide, mid, midCustom)
        : densifyLegacyCurve(p1, p2, fromSide, toSide, mid, midCustom);

  return {
    d,
    from: p1,
    to: p2,
    mid,
    anchors: [],
    fromSide,
    toSide,
    fromOffset,
    toOffset,
    poly,
  };
}

/** Draft khi kéo: tới cursor, hoặc tới khối đích nếu đang hover. */
export function wirePathDraft(
  fromRect: BoardRect,
  cursor: WirePoint,
  toRect?: BoardRect | null,
  style: WireStyle = "curve",
  opts: WireRouteOpts = {},
): string {
  if (toRect) {
    const toOpts = { ...opts };
    if (!toOpts.toSide) {
      const att = nearestEdgeAttachment(toRect, cursor);
      toOpts.toSide = att.side;
      toOpts.toOffset = att.offset;
    }
    return wirePathBetween(fromRect, toRect, style, toOpts).d;
  }

  const tip = { x: cursor.x - 1, y: cursor.y - 1, w: 2, h: 2 };
  return wirePathBetween(fromRect, tip, style, opts).d;
}

/** Đọc tùy chọn định tuyến từ layout connector. */
export function wireRouteOptsFromLayout(layout: {
  wireFromSide?: string | null;
  wireToSide?: string | null;
  wireFromOffset?: number | null;
  wireToOffset?: number | null;
  wireMid?: WirePoint | null;
  wireAnchors?: WirePoint[] | null;
}): WireRouteOpts {
  const anchors = normalizePointList(layout.wireAnchors ?? null);
  const mid =
    anchors.length === 0 &&
    layout.wireMid &&
    typeof layout.wireMid.x === "number" &&
    typeof layout.wireMid.y === "number"
      ? { x: layout.wireMid.x, y: layout.wireMid.y }
      : null;
  return {
    fromSide: normalizeWireSide(layout.wireFromSide),
    toSide: normalizeWireSide(layout.wireToSide),
    fromOffset:
      typeof layout.wireFromOffset === "number"
        ? layout.wireFromOffset
        : null,
    toOffset:
      typeof layout.wireToOffset === "number" ? layout.wireToOffset : null,
    mid,
    anchors: anchors.length > 0 ? anchors : null,
  };
}

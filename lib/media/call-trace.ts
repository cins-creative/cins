/**
 * Bước 0 — đo latency vào phòng (chỉ instrumentation).
 * Bật: localStorage.setItem("cins-call-trace", "1") hoặc mặc định bật trên localhost.
 * Xem bảng: console filter `[call-trace]`.
 */

export type CallTraceScenario = "caller" | "callee";

type MarkRow = { label: string; t: number };

type ActiveTrace = {
  scenario: CallTraceScenario;
  t0: number;
  wallT0: number;
  marks: MarkRow[];
  once: Set<string>;
  serverTiming: string | null;
  meta: Record<string, unknown>;
  flushed: boolean;
};

let active: ActiveTrace | null = null;

function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function isCallTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("cins-call-trace") === "0") return false;
    if (window.localStorage?.getItem("cins-call-trace") === "1") return true;
  } catch {
    /* private mode */
  }
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

/** Bắt đầu phiên đo caller/callee (media path). */
export function beginCallTrace(
  scenario: CallTraceScenario,
  meta: Record<string, unknown> = {},
): void {
  if (!isCallTraceEnabled()) return;
  active = {
    scenario,
    t0: now(),
    wallT0: Date.now(),
    marks: [{ label: "T0", t: 0 }],
    once: new Set(["T0"]),
    serverTiming: null,
    meta,
    flushed: false,
  };
  console.info("[call-trace] begin", scenario, meta);
}

export function callTraceMark(label: string, detail?: Record<string, unknown>): void {
  if (!isCallTraceEnabled() || !active || active.flushed) return;
  const t = now() - active.t0;
  active.marks.push({ label, t });
  console.info(`[call-trace] ${label}`, {
    ms: Math.round(t),
    scenario: active.scenario,
    ...detail,
  });
}

/** Chỉ ghi lần đầu (T1, T4, T7…). */
export function callTraceMarkOnce(
  label: string,
  detail?: Record<string, unknown>,
): void {
  if (!isCallTraceEnabled() || !active || active.flushed) return;
  if (active.once.has(label)) return;
  active.once.add(label);
  callTraceMark(label, detail);
}

export function callTraceAttachServerTiming(header: string | null): void {
  if (!isCallTraceEnabled() || !active || !header) return;
  active.serverTiming = header;
  console.info("[call-trace] Server-Timing", header);
}

/** Parse header Server-Timing → map name→dur ms. */
export function parseServerTiming(header: string | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!header) return out;
  for (const part of header.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const name = seg.split(";")[0]?.trim();
    const durMatch = /dur\s*=\s*([\d.]+)/i.exec(seg);
    if (name && durMatch) out[name] = Number(durMatch[1]);
  }
  return out;
}

function findMark(label: string): number | null {
  if (!active) return null;
  const hit = active.marks.find((m) => m.label === label);
  return hit ? hit.t : null;
}

/**
 * In bảng delta + cổng quyết định T0→T3 vs T3→T7.
 * Gọi khi có T7, hoặc thủ công `callTraceFlush()`.
 */
export function callTraceFlush(reason = "manual"): void {
  if (!isCallTraceEnabled() || !active || active.flushed) return;
  active.flushed = true;

  const t3 = findMark("T3");
  const t7 = findMark("T7");
  const t0b = findMark("T0b");
  const server = parseServerTiming(active.serverTiming);

  const rows = active.marks.map((m, i) => {
    const prev = i > 0 ? active!.marks[i - 1]!.t : 0;
    return {
      mark: m.label,
      at_ms: Math.round(m.t),
      delta_ms: Math.round(m.t - prev),
    };
  });

  const t0ToT3 = t3 != null ? t3 : null;
  const t3ToT7 = t3 != null && t7 != null ? t7 - t3 : null;
  const total = t7 != null ? t7 : findMark(active.marks[active.marks.length - 1]!.label);

  let gate: string = "CHƯA ĐỦ MỐC (thiếu T3 hoặc T7)";
  if (t0ToT3 != null && t3ToT7 != null && total != null && total > 0) {
    const pctEarly = (t0ToT3 / total) * 100;
    const pctLate = (t3ToT7 / total) * 100;
    if (pctEarly > 50) {
      gate = `→ LÀM Bước 1–5 (${pctEarly.toFixed(0)}% ở T0→T3)`;
    } else if (pctLate > 50) {
      gate = `→ DỪNG / Phụ lục A (${pctLate.toFixed(0)}% ở T3→T7)`;
    } else {
      gate = `→ hỗn hợp (T0→T3 ${pctEarly.toFixed(0)}% · T3→T7 ${pctLate.toFixed(0)}%)`;
    }
  }

  console.info("[call-trace] ════════ SUMMARY ════════", {
    scenario: active.scenario,
    reason,
    meta: active.meta,
    wallT0: active.wallT0,
    T0_T0b_ms: t0b != null ? Math.round(t0b) : null,
    T0_T3_ms: t0ToT3 != null ? Math.round(t0ToT3) : null,
    T3_T7_ms: t3ToT7 != null ? Math.round(t3ToT7) : null,
    T0_T7_ms: t7 != null ? Math.round(t7) : null,
    serverTiming: server,
    gate,
  });
  console.table(rows);

  active = null;
}

declare global {
  interface Window {
    __cinsCallTraceFlush?: (reason?: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.__cinsCallTraceFlush = callTraceFlush;
}

/** Kịch bản 3 — A gửi chuông (wall clock, đối chiếu máy B). */
export function callTraceRingSent(callMessageId: string): void {
  if (!isCallTraceEnabled()) return;
  const wall = Date.now();
  try {
    sessionStorage.setItem(
      "cins-call-ring-sent",
      JSON.stringify({ callMessageId, wall }),
    );
  } catch {
    /* */
  }
  console.info("[call-trace] RING_SENT", { callMessageId, wallMs: wall });
}

/**
 * Kịch bản 3 — B thấy chuông.
 * Nếu có `batDau` ISO từ tin hệ thống → delay ≈ now - batDau (đồng hồ server/client).
 */
export function callTraceRingSeen(input: {
  callMessageId: string;
  batDau?: string | null;
  source: "realtime" | "poll";
}): void {
  if (!isCallTraceEnabled()) return;
  const wall = Date.now();
  let fromBatDauMs: number | null = null;
  if (input.batDau) {
    const t = Date.parse(input.batDau);
    if (!Number.isNaN(t)) fromBatDauMs = wall - t;
  }
  console.info("[call-trace] RING_SEEN", {
    callMessageId: input.callMessageId,
    source: input.source,
    wallMs: wall,
    delayFromBatDau_ms: fromBatDauMs,
  });
}

/** Build Server-Timing value từ các đoạn ms. */
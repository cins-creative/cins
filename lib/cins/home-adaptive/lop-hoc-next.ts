/**
 * Tính buổi học kế tiếp từ `org_lop_hoc.lich_hoc` (chuỗi form ca học).
 * Client-safe — dùng chung loader server + countdown client.
 */

import {
  formatThuGroup,
  parseLichCaHocList,
  type LichCaHocDraft,
} from "@/lib/to-chuc/lich-ca-hoc-form";

const VN_OFFSET = "+07:00";
/** Cửa sổ «gần giờ» — ưu tiên + badge CTA. */
export const LOP_HOC_SOON_MS = 2 * 60 * 60 * 1000;

export type LopHocSessionStatus = "dang_dien_ra" | "sap_toi" | "khong_lich";

export type LopHocNextSession = {
  status: LopHocSessionStatus;
  /** ISO bắt đầu buổi kế / đang diễn ra. */
  startAt: string | null;
  /** ISO kết thúc nếu có giờ KT. */
  endAt: string | null;
  /** Nhãn ngắn: «Đang học» · «Còn 25 phút» · «Hôm nay · 19:00». */
  label: string;
  /** true nếu đang học hoặc bắt đầu trong LOP_HOC_SOON_MS. */
  isSoon: boolean;
};

export type LopHocCuaBanItem = {
  lopId: string;
  roomId: string | null;
  maLop: string;
  tenKhoa: string;
  orgTen: string;
  orgSlug: string | null;
  lichHoc: string | null;
  next: LopHocNextSession;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** JS weekday (0=CN) → mã thứ form (0=CN, 2=T2…7=T7). */
function jsDayToThu(jsDay: number): number {
  return jsDay === 0 ? 0 : jsDay + 1;
}

function vnYmdParts(date: Date): { y: number; m: number; d: number; jsDay: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    jsDay: weekdayMap[parts.weekday ?? ""] ?? 0,
  };
}

function vnLocalToIso(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
): string {
  return `${y}-${pad2(m)}-${pad2(d)}T${pad2(hh)}:${pad2(mm)}:00${VN_OFFSET}`;
}

function parseHm(raw: string): { h: number; m: number } | null {
  const t = raw.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) {
    return null;
  }
  return { h, m };
}

function addDaysYmd(
  y: number,
  m: number,
  d: number,
  delta: number,
): { y: number; m: number; d: number; jsDay: number } {
  // Neo UTC trưa để tránh lệch ngày khi cộng — rồi đọc lại theo VN.
  const utc = Date.parse(
    `${y}-${pad2(m)}-${pad2(d)}T12:00:00${VN_OFFSET}`,
  );
  return vnYmdParts(new Date(utc + delta * 86_400_000));
}

type Candidate = {
  startMs: number;
  endMs: number | null;
  startIso: string;
  endIso: string | null;
};

function candidatesForSlot(
  slot: LichCaHocDraft,
  nowMs: number,
  fromYmd: { y: number; m: number; d: number; jsDay: number },
): Candidate[] {
  const startHm = parseHm(slot.gioBatDau);
  if (!startHm) return [];

  const endHm = parseHm(slot.gioKetThuc);
  const thuSet =
    slot.thu.length > 0
      ? new Set(slot.thu)
      : null; /* không có thứ → mỗi ngày */

  const out: Candidate[] = [];
  for (let i = 0; i < 14; i++) {
    const day =
      i === 0 ? fromYmd : addDaysYmd(fromYmd.y, fromYmd.m, fromYmd.d, i);
    const thu = jsDayToThu(day.jsDay);
    if (thuSet && !thuSet.has(thu)) continue;

    const startIso = vnLocalToIso(day.y, day.m, day.d, startHm.h, startHm.m);
    const startMs = Date.parse(startIso);
    if (Number.isNaN(startMs)) continue;

    let endIso: string | null = null;
    let endMs: number | null = null;
    if (endHm) {
      endIso = vnLocalToIso(day.y, day.m, day.d, endHm.h, endHm.m);
      endMs = Date.parse(endIso);
      if (endMs != null && endMs <= startMs) {
        // Qua đêm — kết thúc ngày sau.
        const next = addDaysYmd(day.y, day.m, day.d, 1);
        endIso = vnLocalToIso(next.y, next.m, next.d, endHm.h, endHm.m);
        endMs = Date.parse(endIso);
      }
    }

    // Bỏ buổi đã kết thúc; giữ buổi đang diễn ra (start ≤ now < end).
    if (endMs != null && endMs <= nowMs) continue;
    if (endMs == null && startMs + 60 * 60 * 1000 <= nowMs) continue;

    out.push({ startMs, endMs, startIso, endIso });
  }
  return out;
}

function formatCountdownLabel(
  status: LopHocSessionStatus,
  startMs: number,
  nowMs: number,
): string {
  if (status === "dang_dien_ra") return "Đang học — vào ngay";

  const mins = Math.round((startMs - nowMs) / 60_000);
  if (mins <= 0) return "Sắp bắt đầu";
  if (mins < 60) return `Còn ${mins} phút`;
  if (mins < 120) return "Còn dưới 2 giờ";

  const start = new Date(startMs);
  const nowParts = vnYmdParts(new Date(nowMs));
  const startParts = vnYmdParts(start);
  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);

  const sameDay =
    nowParts.y === startParts.y &&
    nowParts.m === startParts.m &&
    nowParts.d === startParts.d;
  if (sameDay) return `Hôm nay · ${time}`;

  const thuLabel =
    formatThuGroup([jsDayToThu(startParts.jsDay)]) || "Sắp tới";
  return `${thuLabel} · ${time}`;
}

/**
 * Buổi kế tiếp gần nhất từ chuỗi `lich_hoc`.
 * Không parse được / không có giờ → `khong_lich`.
 */
export function resolveNextLopHocSession(
  lichHoc: string | null | undefined,
  nowMs = Date.now(),
): LopHocNextSession {
  const slots = parseLichCaHocList(lichHoc);
  if (slots.length === 0) {
    return {
      status: "khong_lich",
      startAt: null,
      endAt: null,
      label: lichHoc?.trim() || "Chưa có lịch",
      isSoon: false,
    };
  }

  const fromYmd = vnYmdParts(new Date(nowMs));
  const all: Candidate[] = [];
  for (const slot of slots) {
    all.push(...candidatesForSlot(slot, nowMs, fromYmd));
  }
  if (all.length === 0) {
    return {
      status: "khong_lich",
      startAt: null,
      endAt: null,
      label: lichHoc?.trim() || "Chưa có lịch",
      isSoon: false,
    };
  }

  all.sort((a, b) => a.startMs - b.startMs);
  const next = all[0]!;
  const inSession =
    next.startMs <= nowMs &&
    (next.endMs == null || next.endMs > nowMs);
  const status: LopHocSessionStatus = inSession
    ? "dang_dien_ra"
    : "sap_toi";
  const isSoon =
    inSession ||
    (next.startMs - nowMs >= 0 && next.startMs - nowMs <= LOP_HOC_SOON_MS);

  return {
    status,
    startAt: next.startIso,
    endAt: next.endIso,
    label: formatCountdownLabel(status, next.startMs, nowMs),
    isSoon,
  };
}

/** Sắp xếp: đang học → gần giờ → sắp tới → không lịch. */
export function compareLopHocByUrgency(
  a: LopHocCuaBanItem,
  b: LopHocCuaBanItem,
): number {
  const rank = (x: LopHocCuaBanItem) => {
    if (x.next.status === "dang_dien_ra") return 0;
    if (x.next.isSoon) return 1;
    if (x.next.status === "sap_toi") return 2;
    return 3;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  const sa = a.next.startAt ? Date.parse(a.next.startAt) : Number.POSITIVE_INFINITY;
  const sb = b.next.startAt ? Date.parse(b.next.startAt) : Number.POSITIVE_INFINITY;
  return sa - sb;
}

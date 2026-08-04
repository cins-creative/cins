/** Lịch lặp mốc chat — dùng chung create/update + tick notify (tránh circular import). */

export type ChatMocLoaiLap = "mot_lan" | "ngay" | "tuan" | "thang" | "nam";

const LOAI_LAP_SET = new Set<ChatMocLoaiLap>([
  "mot_lan",
  "ngay",
  "tuan",
  "thang",
  "nam",
]);

export function normalizeMocLoaiLap(raw: unknown): ChatMocLoaiLap {
  if (typeof raw === "string" && LOAI_LAP_SET.has(raw as ChatMocLoaiLap)) {
    return raw as ChatMocLoaiLap;
  }
  return "mot_lan";
}

/** Cộng tháng/năm giữ ngày hợp lệ (31/1 → 28/2). */
export function addCalendarMonths(base: Date, months: number): Date {
  const out = new Date(base.getTime());
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, lastDay));
  return out;
}

export function advanceMocThoiDiemOnce(
  iso: string,
  loaiLap: ChatMocLoaiLap,
): string | null {
  if (loaiLap === "mot_lan") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let next: Date;
  if (loaiLap === "ngay") {
    next = new Date(d.getTime());
    next.setDate(next.getDate() + 1);
  } else if (loaiLap === "tuan") {
    next = new Date(d.getTime());
    next.setDate(next.getDate() + 7);
  } else if (loaiLap === "thang") {
    next = addCalendarMonths(d, 1);
  } else {
    next = addCalendarMonths(d, 12);
  }
  return next.toISOString();
}

/** Kỳ kế tiếp sau `after` (bỏ qua các kỳ đã quá hạn — tránh spam tin). */
export function advanceMocThoiDiemPast(
  iso: string,
  loaiLap: ChatMocLoaiLap,
  after: Date,
): string | null {
  let current = iso;
  for (let i = 0; i < 500; i += 1) {
    const next = advanceMocThoiDiemOnce(current, loaiLap);
    if (!next) return null;
    const nextDate = new Date(next);
    if (nextDate.getTime() > after.getTime()) return next;
    current = next;
  }
  return advanceMocThoiDiemOnce(current, loaiLap);
}

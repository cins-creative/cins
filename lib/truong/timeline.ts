import type { TruongTuyenSinhNamRow } from "./types";

export type TimelineStepStatus = "done" | "active" | "upcoming";

export const TIMELINE_LIVE_LABEL = "Đang diễn ra";

/** Parse `YYYY-MM-DD` (hoặc chuỗi ISO) thành 00:00 theo giờ local. */
function parseCalendarDay(iso: string | null | undefined): Date | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const dayMatch = raw.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    const d = new Date(
      Number(dayMatch[1]),
      Number(dayMatch[2]) - 1,
      Number(dayMatch[3]),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calendarDayKey(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Trạng thái một mốc theo khoảng ngày (brief tab tuyển sinh). */
export function getStepStatus(
  from?: string | null,
  to?: string | null,
): TimelineStepStatus {
  const startDay = parseCalendarDay(from);
  if (!startDay) return "upcoming";

  const endDay = parseCalendarDay(to) ?? startDay;
  const todayKey = calendarDayKey(new Date());
  const startKey = calendarDayKey(startDay);
  const endKey = calendarDayKey(endDay);

  if (endKey < todayKey) return "done";
  if (startKey <= todayKey && todayKey <= endKey) return "active";
  if (startKey > todayKey) return "upcoming";
  return "done";
}

/** Trạng thái tổng thể (ưu tiên kỳ thi đang diễn ra). */
export function getTimelineStatus(row: TruongTuyenSinhNamRow): TimelineStepStatus {
  if (row.ngay_thi_tu || row.ngay_thi_den) {
    return getStepStatus(row.ngay_thi_tu, row.ngay_thi_den);
  }
  return getStepStatus(row.ngay_mo_ho_so, row.ngay_dong_ho_so);
}

/**
 * Hiển thị ngày timeline: `dd/mm/yyyy` (input thường là `YYYY-MM-DD`).
 * Nếu mốc có kèm giờ (`YYYY-MM-DDTHH:mm`) thì hiển thị `dd/mm/yyyy HH:mm`.
 */
export function formatTimelineDate(iso: string | null | undefined): string | null {
  const raw = iso?.trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) {
    const dateStr = `${m[3]}/${m[2]}/${m[1]}`;
    return m[4] != null ? `${dateStr} ${m[4]}:${m[5]}` : dateStr;
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

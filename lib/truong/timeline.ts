import type { TruongTuyenSinhNamRow } from "./types";

export type TimelineStepStatus = "done" | "active" | "upcoming";

/** Trạng thái một mốc theo khoảng ngày (brief tab tuyển sinh). */
export function getStepStatus(
  from?: string | null,
  to?: string | null,
): TimelineStepStatus {
  const now = new Date();
  const start = from?.trim() ? new Date(from) : null;
  const end = to?.trim() ? new Date(to) : null;
  if (!start || Number.isNaN(start.getTime())) return "upcoming";
  if (end && !Number.isNaN(end.getTime()) && end < now) return "done";
  if (start <= now && (!end || Number.isNaN(end.getTime()) || end >= now)) {
    return "active";
  }
  if (start > now) return "upcoming";
  return "done";
}

/** Trạng thái tổng thể (ưu tiên kỳ thi đang diễn ra). */
export function getTimelineStatus(row: TruongTuyenSinhNamRow): TimelineStepStatus {
  if (row.ngay_thi_tu || row.ngay_thi_den) {
    return getStepStatus(row.ngay_thi_tu, row.ngay_thi_den);
  }
  return getStepStatus(row.ngay_mo_ho_so, row.ngay_dong_ho_so);
}

/** Hiển thị ngày timeline: `dd/mm/yyyy` (input thường là `YYYY-MM-DD`). */
export function formatTimelineDate(iso: string | null | undefined): string | null {
  const raw = iso?.trim();
  if (!raw) return null;

  const isoDay = raw.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) {
    return `${isoDay[3]}/${isoDay[2]}/${isoDay[1]}`;
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

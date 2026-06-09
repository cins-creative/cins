import { baiDangDateInputValue } from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang } from "@/lib/truong/types";

/** Khoảng tối thiểu trước giờ hẹn (tránh lưu «ngay lập tức» do clock skew). */
export const ORG_BAI_DANG_SCHEDULE_MIN_LEAD_MS = 60_000;

export function baiDangTimeInputValue(
  iso: string | null | undefined,
  fallback = "09:00",
): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function baiDangScheduleFromDateAndTime(
  dateValue: string,
  timeValue: string,
): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const tm = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]) - 1;
  const day = Number(dm[3]);
  const hours = Number(tm[1]);
  const minutes = Number(tm[2]);
  const local = new Date(y, mo, day, hours, minutes, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

export function defaultOrgBaiDangScheduleParts(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return {
    date: baiDangDateInputValue(d.toISOString()),
    time: "09:00",
  };
}

export function isFutureOrgBaiDangSchedule(
  iso: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!iso?.trim()) return false;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return false;
  return ms > nowMs + ORG_BAI_DANG_SCHEDULE_MIN_LEAD_MS;
}

export function isTruongBaiDangScheduled(
  post: Pick<TruongBaiDang, "trang_thai" | "tao_luc">,
): boolean {
  return isOrgBaiDangScheduledDraft(post.trang_thai, post.tao_luc);
}

/** Bài hiển thị trên timeline công khai / đã đăng — không phải hẹn trong tương lai. */
export function isTruongBaiDangVisibleOnTimeline(
  post: Pick<TruongBaiDang, "trang_thai" | "tao_luc">,
): boolean {
  if (isTruongBaiDangScheduled(post)) return false;
  const status = post.trang_thai?.trim();
  if (status && status !== "da_dang") return false;
  return true;
}

export function isOrgBaiDangScheduledDraft(
  trangThai: string | null | undefined,
  taoLuc: string | null | undefined,
): boolean {
  if (trangThai !== "nhap") return false;
  return isFutureOrgBaiDangSchedule(taoLuc);
}

export function formatOrgBaiDangScheduleLabel(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type OrgBaiDangSchedulePreview = {
  weekday: string;
  dateLine: string;
  timeLine: string;
};

export function formatOrgBaiDangSchedulePreview(
  iso: string | null | undefined,
): OrgBaiDangSchedulePreview | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    weekday: d.toLocaleDateString("vi-VN", { weekday: "long" }),
    dateLine: d.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    timeLine: d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function orgBaiDangSchedulePartsFromOffsetDays(
  daysFromToday: number,
  hour = 9,
  minute = 0,
): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return {
    date: baiDangDateInputValue(d.toISOString()),
    time: `${hh}:${mm}`,
  };
}

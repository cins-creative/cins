/**
 * Hẹn đăng cột mốc cá nhân — tái dùng helper giờ/ngày của org.
 * Cách lưu: `content_cot_moc.tao_luc` = giờ hẹn (tương lai).
 * Đến giờ tự hiện trên feed (không cần cron flip `trang_thai`).
 */

export {
  baiDangScheduleFromDateAndTime,
  baiDangTimeInputValue,
  defaultOrgBaiDangScheduleParts as defaultCotMocScheduleParts,
  formatOrgBaiDangScheduleLabel as formatCotMocScheduleLabel,
  formatOrgBaiDangSchedulePreview as formatCotMocSchedulePreview,
  isFutureOrgBaiDangSchedule as isFutureCotMocSchedule,
} from "@/lib/truong/org-bai-dang-schedule";

import { isFutureOrgBaiDangSchedule } from "@/lib/truong/org-bai-dang-schedule";

/** Bài đã hẹn, chưa đến giờ — chỉ chủ Journey nên thấy. */
export function isCotMocScheduledDraft(
  taoLuc: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  return isFutureOrgBaiDangSchedule(taoLuc, nowMs);
}

/** Khách / World / Gallery: ẩn khi còn hẹn trong tương lai. */
export function isCotMocDueForPublic(
  taoLuc: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  return !isCotMocScheduledDraft(taoLuc, nowMs);
}

/** ISO `tao_luc` hợp lệ từ input compose, hoặc null nếu không hẹn / không hợp lệ. */
export function resolveCotMocScheduleTaoLuc(
  schedulePublishAt: string | null | undefined,
): string | null {
  const at = schedulePublishAt?.trim();
  if (!at || !isFutureOrgBaiDangSchedule(at)) return null;
  return new Date(at).toISOString();
}

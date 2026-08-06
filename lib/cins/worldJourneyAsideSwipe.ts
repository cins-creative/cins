/**
 * Logic quyết định cử chỉ vuốt mở/đóng cột trái–phải (drawer) của World Journey
 * trên mobile/tablet. Tách ra hàm thuần để dễ test và tái dùng — phần gắn
 * listener nằm trong `WorldJourneyFeed`.
 */

export type OpenAside = "left" | "right" | null;

/** Vuốt ngang tối thiểu để kích hoạt mở/đóng drawer (px). */
export const WJ_ASIDE_SWIPE_MIN_DX = 56;
/** Dịch chuyển tối thiểu để bắt đầu khóa hướng — tránh nhiễu khi chạm nhẹ (px). */
export const WJ_ASIDE_SWIPE_LOCK_MIN = 10;
/** |dx| phải lớn hơn |dy| * ratio mới coi là vuốt ngang (không phải cuộn dọc). */
export const WJ_ASIDE_SWIPE_HORIZONTAL_RATIO = 1.2;

/** Cú vuốt có phải "ngang" (đủ trội so với phương dọc) không. */
export function isHorizontalSwipe(
  dx: number,
  dy: number,
  ratio: number = WJ_ASIDE_SWIPE_HORIZONTAL_RATIO,
): boolean {
  return Math.abs(dx) > Math.abs(dy) * ratio;
}

export type AsideSwipeContext = {
  /** Tổng dịch chuyển ngang cả cú vuốt (px, dương = sang phải). */
  dx: number;
  /** Đã khóa hướng ngang trong `touchmove` chưa. */
  lockedHorizontal: boolean;
  /** Trạng thái drawer hiện tại. */
  open: OpenAside;
  /** Cột trái đủ điều kiện mở dạng drawer (≤991px, không phải gallery). */
  canOpenLeft: boolean;
  /** Cột phải đủ điều kiện mở dạng drawer (≤1199px, không phải gallery). */
  canOpenRight: boolean;
  minDx?: number;
};

/**
 * Trả về trạng thái drawer mong muốn sau khi kết thúc vuốt:
 *  - `"left"` / `"right"`: mở cột tương ứng
 *  - `null`: đóng drawer đang mở
 *  - `undefined`: giữ nguyên (không đủ điều kiện)
 *
 * Vuốt sang phải mở cột trái; vuốt sang trái mở cột phải. Khi một drawer đang
 * mở, vuốt ngược hướng sẽ đóng nó. Không còn yêu cầu bắt đầu từ mép màn hình —
 * vuốt ngang từ giữa cũng nhận, miễn đã khóa hướng ngang.
 */
export function resolveAsideSwipe(
  ctx: AsideSwipeContext,
): OpenAside | undefined {
  const minDx = ctx.minDx ?? WJ_ASIDE_SWIPE_MIN_DX;
  if (!ctx.lockedHorizontal) return undefined;
  if (Math.abs(ctx.dx) < minDx) return undefined;

  if (ctx.open === "left") return ctx.dx < 0 ? null : undefined;
  if (ctx.open === "right") return ctx.dx > 0 ? null : undefined;

  if (ctx.dx > 0 && ctx.canOpenLeft) return "left";
  if (ctx.dx < 0 && ctx.canOpenRight) return "right";
  return undefined;
}

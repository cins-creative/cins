import "server-only";

/** Ngày lịch VN (Asia/Ho_Chi_Minh) dạng YYYY-MM-DD. */
export function todayYmdVn(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type KyHocInterval = {
  id: string;
  ngayDau: string;
  ngayCuoi: string;
};

/** Còn hiệu lực học: có kỳ với ngay_cuoi ≥ hôm nay (VN). Hết kỳ học khi không còn kỳ nào. */
export function isEnrollmentNotFrozen(
  intervals: KyHocInterval[],
  todayYmd = todayYmdVn(),
): boolean {
  if (intervals.length === 0) return false;
  return intervals.some((k) => k.ngayCuoi >= todayYmd);
}

/** Hôm nay nằm trong một kỳ đã trả. */
export function isKyCoveringToday(
  intervals: KyHocInterval[],
  todayYmd = todayYmdVn(),
): boolean {
  return intervals.some((k) => k.ngayDau <= todayYmd && k.ngayCuoi >= todayYmd);
}

/** @deprecated dùng isEnrollmentNotFrozen */
export function isKyActive(
  intervals: KyHocInterval[],
  todayYmd = todayYmdVn(),
): boolean {
  return isEnrollmentNotFrozen(intervals, todayYmd);
}

export function daysRemaining(
  intervals: KyHocInterval[],
  todayYmd = todayYmdVn(),
): number {
  let maxEnd: string | null = null;
  for (const k of intervals) {
    if (k.ngayCuoi >= todayYmd) {
      if (!maxEnd || k.ngayCuoi > maxEnd) maxEnd = k.ngayCuoi;
    }
  }
  if (!maxEnd) return 0;
  const start = Date.parse(`${todayYmd}T00:00:00+07:00`);
  const end = Date.parse(`${maxEnd}T00:00:00+07:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/** Tin hiện được nếu tao_luc (ngày VN) nằm trong một khoảng đã trả. */
export function isMessageVisibleInKy(
  messageAtIso: string,
  intervals: KyHocInterval[],
): boolean {
  if (intervals.length === 0) return false;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(messageAtIso));
  return intervals.some((k) => ymd >= k.ngayDau && ymd <= k.ngayCuoi);
}

/** Cộng `soNgay` kể từ max(ngay_cuoi hiện có, hôm qua) + 1, hoặc từ hôm nay nếu chưa có kỳ. */
export function computeNextKyRange(
  existing: KyHocInterval[],
  soNgay: number,
  todayYmd = todayYmdVn(),
): { ngayDau: string; ngayCuoi: string } {
  if (soNgay < 1) throw new Error("so_ngay phải ≥ 1");
  let start = todayYmd;
  if (existing.length > 0) {
    let maxEnd = existing[0]!.ngayCuoi;
    for (const k of existing) {
      if (k.ngayCuoi > maxEnd) maxEnd = k.ngayCuoi;
    }
    if (maxEnd >= todayYmd) {
      start = addDaysYmd(maxEnd, 1);
    }
  }
  const ngayCuoi = addDaysYmd(start, soNgay - 1);
  return { ngayDau: start, ngayCuoi };
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  d.setTime(d.getTime() + days * 86_400_000);
  return todayYmdVn(d);
}

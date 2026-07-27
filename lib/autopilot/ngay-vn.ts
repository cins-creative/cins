/** Ngày lịch VN (Asia/Ho_Chi_Minh) dạng YYYY-MM-DD. */
export function ngayVn(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function tachNiche(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s || "").trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,|/]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function diemTrungNiche(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const x of a) if (setB.has(x)) n += 1;
  return n;
}

/** Giờ cron Autopilot đăng (Asia/Ho_Chi_Minh) — khớp workflow GitHub. */
export const AUTOPILOT_CRON_GIO_VN = [8, 14, 20] as const;

function vnHourMinute(date = new Date()): { hour: number; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .filter((p) => p.type === "hour" || p.type === "minute")
      .map((p) => [p.type, p.value]),
  ) as { hour: string; minute: string };
  return { hour: Number(parts.hour), minute: Number(parts.minute) };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Các mốc cron còn lại trong ngày VN (sau giờ hiện tại). */
export function cacCronConLaiHomNayVn(date = new Date()): number[] {
  const { hour } = vnHourMinute(date);
  return AUTOPILOT_CRON_GIO_VN.filter((h) => hour < h);
}

/** Cron kế tiếp dạng «14:00 hôm nay» / «08:00 ngày mai». */
export function nhanCronKeTiepVn(date = new Date()): {
  nhan: string;
  cungNgay: boolean;
  gio: number;
} {
  const con = cacCronConLaiHomNayVn(date);
  if (con.length) {
    const gio = con[0]!;
    return { nhan: `${pad2(gio)}:00 hôm nay`, cungNgay: true, gio };
  }
  return { nhan: "08:00 ngày mai", cungNgay: false, gio: 8 };
}

/**
 * Ước lượng giờ đăng — **1 bài / nick / lần cron** (08·14·20 VN),
 * khớp hạn mức ~3 bài/ngày. `ahead` = số bài cùng nick sẽ đăng trước
 * (san_sang + cho_duyet đứng trước trong FIFO).
 */
export function uocLuongDangSauDuyet(opts: {
  /** Số bản san_sang cùng nick đứng trước. */
  sanSangTruoc: number;
  /** Số bản cho_duyet cùng nick đứng trước (FIFO). */
  choDuyetTruoc?: number;
  hanMucConLai: number;
  hanMucNgay: number;
  now?: Date;
}): string {
  const ahead =
    Math.max(0, opts.sanSangTruoc) + Math.max(0, opts.choDuyetTruoc ?? 0);
  const hanNgay = Math.min(
    AUTOPILOT_CRON_GIO_VN.length,
    Math.max(1, opts.hanMucNgay || 3),
  );
  const conLai = Math.max(0, opts.hanMucConLai);
  const now = opts.now ?? new Date();

  // Còn bao nhiêu mốc cron hôm nay, cắt bởi hạn mức còn lại
  const slotsHomNay = cacCronConLaiHomNayVn(now).slice(0, conLai);

  if (ahead < slotsHomNay.length) {
    const gio = slotsHomNay[ahead]!;
    return `~${pad2(gio)}:00 VN hôm nay`;
  }

  // Tràn sang ngày sau: mỗi ngày tối đa hanNgay mốc 08/14/20
  let con = ahead - slotsHomNay.length;
  let themNgay = 1;
  while (themNgay < 60) {
    if (con < hanNgay) {
      const gio = AUTOPILOT_CRON_GIO_VN[con] ?? 8;
      if (themNgay === 1) return `~${pad2(gio)}:00 VN ngày mai`;
      return `~${pad2(gio)}:00 VN sau ${themNgay} ngày`;
    }
    con -= hanNgay;
    themNgay += 1;
  }
  return `~08:00 VN (hàng dài · #${ahead + 1})`;
}

/** Client-safe types cho admin inbox topbar + badge sidebar. */

export type AdminInboxStats = {
  baoCao: number;
  gopY: number;
  dongGop: number;
  noiDungChoXacThuc: number;
  moShop: number;
  tranhChap: number;
  danhMuc: number;
  nickSeeding: number;
  total: number;
};

export const EMPTY_ADMIN_INBOX_STATS: AdminInboxStats = {
  baoCao: 0,
  gopY: 0,
  dongGop: 0,
  noiDungChoXacThuc: 0,
  moShop: 0,
  tranhChap: 0,
  danhMuc: 0,
  nickSeeding: 0,
  total: 0,
};

const COUNT_KEYS = [
  "baoCao",
  "gopY",
  "dongGop",
  "noiDungChoXacThuc",
  "moShop",
  "tranhChap",
  "danhMuc",
  "nickSeeding",
] as const satisfies ReadonlyArray<keyof Omit<AdminInboxStats, "total">>;

export type AdminInboxCountKey = (typeof COUNT_KEYS)[number];

/** Nav href → hàng đợi cần duyệt / xử lý. */
export const ADMIN_NAV_INBOX_KEY: Record<string, AdminInboxCountKey> = {
  "/admin/bao-cao": "baoCao",
  "/admin/gop-y": "gopY",
  "/admin/bai-viet": "dongGop",
  "/admin/noi-dung-dang": "noiDungChoXacThuc",
  "/admin/mo-shop": "moShop",
  "/admin/tranh-chap": "tranhChap",
  "/admin/danh-muc": "danhMuc",
  "/admin/tai-khoan-ai": "nickSeeding",
};

function asCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

export function parseAdminInboxStats(json: unknown): AdminInboxStats | null {
  if (!json || typeof json !== "object") return null;
  const stats = (json as { stats?: unknown }).stats;
  if (!stats || typeof stats !== "object") return null;
  const s = stats as Record<string, unknown>;
  const next: AdminInboxStats = { ...EMPTY_ADMIN_INBOX_STATS };
  let sum = 0;
  for (const key of COUNT_KEYS) {
    const n = asCount(s[key]);
    next[key] = n;
    sum += n;
  }
  next.total = asCount(s.total) || sum;
  return next;
}

export function formatAdminInboxBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function adminInboxCountForHref(
  stats: AdminInboxStats,
  href: string,
): number {
  const key = ADMIN_NAV_INBOX_KEY[href];
  return key ? stats[key] : 0;
}

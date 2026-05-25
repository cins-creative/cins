/** Thời gian đọc ước lượng (~200 từ/phút). */
export function estimateReadMinutes(
  htmlOrText: string | null | undefined,
): number {
  const raw = htmlOrText?.replace(/<[^>]+>/g, " ") ?? "";
  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const VI_MONTHS = [
  "tháng 1",
  "tháng 2",
  "tháng 3",
  "tháng 4",
  "tháng 5",
  "tháng 6",
  "tháng 7",
  "tháng 8",
  "tháng 9",
  "tháng 10",
  "tháng 11",
  "tháng 12",
] as const;

/** Parse YYYY-MM-DD từ ISO — tránh lệch timezone khi hydrate. */
function parseIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parts = parseIsoDateParts(iso);
  if (parts) {
    const dd = String(parts.d).padStart(2, "0");
    const mm = String(parts.m).padStart(2, "0");
    return `${dd}/${mm}/${parts.y}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatBlogMonthYear(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = parseIsoDateParts(iso);
  if (parts) return `${VI_MONTHS[parts.m - 1]} ${parts.y}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatViewCount(n: number | null | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(v);
}

export function isHtmlContent(raw: string | null | undefined): boolean {
  const t = raw?.trim() ?? "";
  return t.startsWith("<");
}

import { formatRelativeTime } from "@/lib/format";
import type { CinsLocale } from "@/lib/locale/types";

/** Thời gian tương đối ngắn — danh sách người tương tác. */
export function formatActorRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/**
 * Thời gian đăng trên chip author (Journey datebar):
 * trong 24h → "Vừa xong" / "N phút trước" / "N giờ trước";
 * quá 24h hoặc thiếu ISO → null (caller fallback sang ngày đăng).
 */
export function formatPostedWithin24h(
  iso: string | null | undefined,
  locale: CinsLocale = "vi",
): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const diffMs = Date.now() - then;
  if (diffMs < 0) return formatRelativeTime(iso, locale);

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return formatRelativeTime(iso, locale);

  return null;
}

/** Thời gian tương đối ngắn (server-safe). */
export function formatRelativeTimeVi(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const sec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(sec);
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
  const sign = sec > 0 ? 1 : -1;
  if (abs < 60) return rtf.format(sign * Math.round(sec / 1), "second");
  if (abs < 3600) return rtf.format(sign * Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(sign * Math.round(sec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(sign * Math.round(sec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(sign * Math.round(sec / (86400 * 30)), "month");
  return rtf.format(sign * Math.round(sec / (86400 * 365)), "year");
}

const PREFIX = "cins-truong-pin-year:";

export function pinYearStorageKey(slug: string): string {
  return `${PREFIX}${slug.trim()}`;
}

export function readPinnedDisplayYear(slug: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(pinYearStorageKey(slug))?.trim();
    if (!raw) return null;
    const y = Number(raw);
    return Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : null;
  } catch {
    return null;
  }
}

export function writePinnedDisplayYear(slug: string, year: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pinYearStorageKey(slug), String(year));
  } catch {
    /* ignore */
  }
}

export function resolveInitialDisplayYear(
  slug: string,
  yearOptions: number[],
  cauHinhYears: number[],
  canEdit: boolean,
  pickDefault: (opts: number[], cfg: number[]) => number,
): number {
  const fallback = pickDefault(yearOptions, cauHinhYears);
  if (!canEdit) return fallback;
  const pinned = readPinnedDisplayYear(slug);
  if (pinned != null && yearOptions.includes(pinned)) return pinned;
  return fallback;
}

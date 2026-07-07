import {
  normalizeTimelineMoc,
  type TuyenSinhTimelineMoc,
} from "@/lib/truong/timeline-steps";

const PREFIX = "cins-cong-dong-timeline-moc";

function storageKey(orgId: string) {
  return `${PREFIX}:${orgId}`;
}

export function loadCongDongTimelineMoc(orgId: string): TuyenSinhTimelineMoc[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeTimelineMoc(item as TuyenSinhTimelineMoc))
      .filter((m): m is TuyenSinhTimelineMoc => m != null);
  } catch {
    return [];
  }
}

export function saveCongDongTimelineMoc(
  orgId: string,
  list: TuyenSinhTimelineMoc[],
) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const cleaned = list
      .map((item) => normalizeTimelineMoc(item))
      .filter((m): m is TuyenSinhTimelineMoc => m != null);
    sessionStorage.setItem(storageKey(orgId), JSON.stringify(cleaned));
  } catch {
    /* quota / private mode */
  }
}

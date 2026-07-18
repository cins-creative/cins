import {
  normalizeTimelineMoc,
  type TuyenSinhTimelineMoc,
} from "@/lib/truong/timeline-steps";

const PREFIX = "cins-studio-timeline-moc";

function storageKey(orgId: string) {
  return `${PREFIX}:${orgId}`;
}

export function loadStudioTimelineMoc(orgId: string): TuyenSinhTimelineMoc[] {
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

export function saveStudioTimelineMoc(
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

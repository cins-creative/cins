import type { BaiTapKhoaData } from "@/lib/to-chuc/khoa-hoc-types";

const PREFIX = "cins-bai-tap-draft";

function storageKey(orgId: string, khoaId: string) {
  return `${PREFIX}:${orgId}:${khoaId}`;
}

function normalizeDraft(item: BaiTapKhoaData): BaiTapKhoaData {
  const thumb = item.thumbnailUrl;
  return {
    ...item,
    visible: item.visible ?? true,
    thumbnailUrl:
      thumb?.startsWith("blob:") ? null : thumb ?? null,
  };
}

function stripEphemeralUrls(list: BaiTapKhoaData[]): BaiTapKhoaData[] {
  return list.map((item) => normalizeDraft(item));
}

export function loadBaiTapDrafts(
  orgId: string,
  khoaId: string,
): BaiTapKhoaData[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(orgId, khoaId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return stripEphemeralUrls(parsed as BaiTapKhoaData[]);
  } catch {
    return [];
  }
}

export function saveBaiTapDrafts(
  orgId: string,
  khoaId: string,
  list: BaiTapKhoaData[],
) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const key = storageKey(orgId, khoaId);
    if (list.length === 0) {
      const existing = loadBaiTapDrafts(orgId, khoaId);
      if (existing.length > 0) return;
    }
    sessionStorage.setItem(key, JSON.stringify(stripEphemeralUrls(list)));
  } catch {
    /* quota / private mode */
  }
}

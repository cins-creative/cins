import {
  BAI_TAP_SECTION_DISPLAY_DEFAULT,
  type BaiTapSectionDisplayMode,
} from "@/lib/to-chuc/khoa-hoc-types";

const PREFIX = "cins-bai-tap-display";

function storageKey(orgId: string, khoaId: string) {
  return `${PREFIX}:${orgId}:${khoaId}`;
}

function normalizeMode(value: unknown): BaiTapSectionDisplayMode {
  if (value === "an" || value === "mot_phan" || value === "day_du") {
    return value;
  }
  return BAI_TAP_SECTION_DISPLAY_DEFAULT;
}

export function loadBaiTapSectionDisplay(
  orgId: string,
  khoaId: string,
): BaiTapSectionDisplayMode {
  if (typeof sessionStorage === "undefined") {
    return BAI_TAP_SECTION_DISPLAY_DEFAULT;
  }
  try {
    const raw = sessionStorage.getItem(storageKey(orgId, khoaId));
    if (!raw) return BAI_TAP_SECTION_DISPLAY_DEFAULT;
    return normalizeMode(JSON.parse(raw));
  } catch {
    return BAI_TAP_SECTION_DISPLAY_DEFAULT;
  }
}

export function saveBaiTapSectionDisplay(
  orgId: string,
  khoaId: string,
  mode: BaiTapSectionDisplayMode,
) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(orgId, khoaId), JSON.stringify(mode));
  } catch {
    /* quota / private mode */
  }
}

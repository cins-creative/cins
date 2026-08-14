import { CO_SO_DAO_TAO_HUB_PATH } from "@/lib/cins/hubPaths";
import {
  orgTabIdFromUrlSegment,
  orgTabUrlSegment,
} from "@/lib/to-chuc/org-public-tab-url";

export const TRUONG_TAB_IDS = [
  "bai-dang",
  "nganh",
  "tuyen-sinh",
  "hinh-anh",
  "do-an-sinh-vien",
] as const;

export type TruongTabId = (typeof TRUONG_TAB_IDS)[number];

export const TRUONG_TAB_LABELS: Record<TruongTabId, string> = {
  "bai-dang": "Bài đăng",
  nganh: "Ngành đào tạo",
  "tuyen-sinh": "Tuyển sinh",
  "hinh-anh": "Hình ảnh",
  "do-an-sinh-vien": "Đồ án Sinh viên",
};

export const TRUONG_DEFAULT_TAB: TruongTabId = "bai-dang";

export function isTruongTabId(value: string): value is TruongTabId {
  return TRUONG_TAB_IDS.includes(value as TruongTabId);
}

export function parseTruongTabId(value: string): TruongTabId | null {
  return orgTabIdFromUrlSegment(value, TRUONG_TAB_IDS);
}

export function truongRootPath(orgSlug: string): string {
  return `${CO_SO_DAO_TAO_HUB_PATH}/${encodeURIComponent(orgSlug)}`;
}

export function truongTabPath(orgSlug: string, tab: TruongTabId): string {
  return `${truongRootPath(orgSlug)}/${orgTabUrlSegment(tab)}`;
}

const TRUONG_PATH_PREFIXES = [
  `${CO_SO_DAO_TAO_HUB_PATH}/`,
  "/university/",
] as const;

/** Parse tab từ pathname `/university/:slug/...` (hoặc legacy `/university/...`). */
export function parseTruongRouteFromPathname(
  pathname: string,
): TruongTabId | null {
  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const prefix = TRUONG_PATH_PREFIXES.find((p) => normalizedPath.startsWith(p));
  if (!prefix) return null;

  const withoutPrefix = normalizedPath.slice(prefix.length);
  const slashIdx = withoutPrefix.indexOf("/");
  if (slashIdx === -1) {
    return TRUONG_DEFAULT_TAB;
  }

  const tabSegment = withoutPrefix.slice(slashIdx + 1).split("/").filter(Boolean)[0];
  if (!tabSegment) {
    return TRUONG_DEFAULT_TAB;
  }
  /* `/manage` không phải tab public — để null để shell public không set tab. */
  if (tabSegment === "quan-ly" || tabSegment === "manage") {
    return null;
  }
  return parseTruongTabId(tabSegment);
}

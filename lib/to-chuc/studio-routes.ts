import { STUDIO_TAB_IDS, type StudioTabId } from "@/lib/to-chuc/studio-page-config";
import {
  orgTabIdFromUrlSegment,
  orgTabUrlSegment,
} from "@/lib/to-chuc/org-public-tab-url";

export const STUDIO_DEFAULT_TAB: StudioTabId = "bai-dang";

/** Id nội bộ (`bai-dang`…) — không gồm alias URL (`posts`). */
export function isStudioTabId(value: string): value is StudioTabId {
  return STUDIO_TAB_IDS.includes(value as StudioTabId);
}

/** Segment URL tab studio (`bai-dang` hoặc `posts`). */
export function parseStudioTabId(value: string): StudioTabId | null {
  return orgTabIdFromUrlSegment(value, STUDIO_TAB_IDS);
}

export function studioRootPath(orgSlug: string): string {
  return `/studio/${encodeURIComponent(orgSlug)}`;
}

export function studioTabPath(orgSlug: string, tab: StudioTabId): string {
  return `${studioRootPath(orgSlug)}/${orgTabUrlSegment(tab)}`;
}

/** URL sâu tới một tin tuyển dụng: `/studio/:slug/jobs/:jobId`. */
export function studioJobPath(orgSlug: string, jobId: string): string {
  return `${studioTabPath(orgSlug, "tuyen-dung")}/${encodeURIComponent(jobId)}`;
}

/** URL sâu tới một bài đăng: `/studio/:slug/posts/:baiDangId`. */
export function studioBaiDangPostPath(orgSlug: string, baiDangId: string): string {
  return `${studioTabPath(orgSlug, "bai-dang")}/${encodeURIComponent(baiDangId)}`;
}

/** URL sâu tới một sự kiện: `/studio/:slug/events/:suKienId`. */
export function studioSuKienPath(orgSlug: string, suKienId: string): string {
  return `${studioTabPath(orgSlug, "su-kien")}/${encodeURIComponent(suKienId)}`;
}

/** Tab Quản lý sự kiện (duyệt quầy / nội dung). */
export function studioSuKienManagePath(orgSlug: string, suKienId: string): string {
  return `${studioSuKienPath(orgSlug, suKienId)}?manage=1`;
}

export type StudioPathState = {
  tab: StudioTabId;
  jobId: string | null;
  baiDangId: string | null;
  suKienId: string | null;
};

const DEFAULT_PATH_STATE: StudioPathState = {
  tab: STUDIO_DEFAULT_TAB,
  jobId: null,
  baiDangId: null,
  suKienId: null,
};

/** Lấy jobId từ pathname `/studio/:slug/jobs/:jobId` (null nếu không có). */
export function parseStudioJobIdFromPathname(pathname: string): string | null {
  return parseStudioRouteFromPathname(pathname)?.jobId ?? null;
}

/** Parse tab từ pathname `/studio/:slug/...` — không phụ thuộc slug khớp payload. */
export function parseStudioTabFromPathname(pathname: string): StudioTabId {
  return parseStudioRouteFromPathname(pathname)?.tab ?? STUDIO_DEFAULT_TAB;
}

/** Parse tab + deep link (bài đăng / tuyển dụng / sự kiện) từ pathname studio. */
export function parseStudioRouteFromPathname(
  pathname: string,
): StudioPathState | null {
  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const prefix = "/studio/";
  if (!normalizedPath.startsWith(prefix)) return null;

  const withoutPrefix = normalizedPath.slice(prefix.length);
  const firstSlash = withoutPrefix.indexOf("/");
  if (firstSlash === -1) {
    return { ...DEFAULT_PATH_STATE };
  }

  const rest = withoutPrefix
    .slice(firstSlash + 1)
    .split("/")
    .filter(Boolean);
  if (rest.length === 0) {
    return { ...DEFAULT_PATH_STATE };
  }

  const tabSeg = rest[0];
  const tab = tabSeg ? parseStudioTabId(tabSeg) : null;
  if (!tab) {
    return null;
  }

  const deepId = rest[1] ? decodeURIComponent(rest[1]) : null;
  if (tab === "tuyen-dung") {
    return { tab, jobId: deepId, baiDangId: null, suKienId: null };
  }
  if (tab === "bai-dang" || tab === "showcase") {
    return { tab, jobId: null, baiDangId: deepId, suKienId: null };
  }
  if (tab === "su-kien") {
    return { tab, jobId: null, baiDangId: null, suKienId: deepId };
  }
  return { tab, jobId: null, baiDangId: null, suKienId: null };
}

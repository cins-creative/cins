import { STUDIO_TAB_IDS, type StudioTabId } from "@/lib/to-chuc/studio-page-config";

const TAB_SET = new Set<string>(STUDIO_TAB_IDS);

export const STUDIO_DEFAULT_TAB: StudioTabId = "bai-dang";

export function isStudioTabId(value: string): value is StudioTabId {
  return TAB_SET.has(value);
}

export function studioRootPath(orgSlug: string): string {
  return `/studio/${encodeURIComponent(orgSlug)}`;
}

export function studioTabPath(orgSlug: string, tab: StudioTabId): string {
  return `${studioRootPath(orgSlug)}/${tab}`;
}

/** URL sâu tới một tin tuyển dụng: `/studio/:slug/tuyen-dung/:jobId`. */
export function studioJobPath(orgSlug: string, jobId: string): string {
  return `${studioTabPath(orgSlug, "tuyen-dung")}/${encodeURIComponent(jobId)}`;
}

/** Lấy jobId từ pathname `/studio/:slug/tuyen-dung/:jobId` (null nếu không có). */
export function parseStudioJobIdFromPathname(pathname: string): string | null {
  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const prefix = "/studio/";
  if (!normalizedPath.startsWith(prefix)) return null;

  const rest = normalizedPath
    .slice(prefix.length)
    .split("/")
    .filter(Boolean);
  // rest = [slug, tab, jobId?]
  if (rest[1] !== "tuyen-dung") return null;
  const jobId = rest[2];
  return jobId ? decodeURIComponent(jobId) : null;
}

/** Parse tab từ pathname `/studio/:slug/...` — không phụ thuộc slug khớp payload. */
export function parseStudioTabFromPathname(pathname: string): StudioTabId {
  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const prefix = "/studio/";
  if (!normalizedPath.startsWith(prefix)) return STUDIO_DEFAULT_TAB;

  const withoutPrefix = normalizedPath.slice(prefix.length);
  const firstSlash = withoutPrefix.indexOf("/");
  if (firstSlash === -1) return STUDIO_DEFAULT_TAB;

  const rest = withoutPrefix.slice(firstSlash + 1).split("/").filter(Boolean);
  const first = rest[0];
  return first && isStudioTabId(first) ? first : STUDIO_DEFAULT_TAB;
}

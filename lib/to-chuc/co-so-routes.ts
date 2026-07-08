import {
  CO_SO_TAB_IDS,
  type CoSoTabId,
} from "@/lib/to-chuc/co-so-page-cau-hinh";

const TAB_SET = new Set<string>(CO_SO_TAB_IDS);

export function isCoSoTabId(value: string): value is CoSoTabId {
  return TAB_SET.has(value);
}

export function coSoRootPath(orgSlug: string): string {
  return `/co-so/${encodeURIComponent(orgSlug)}`;
}

export function coSoTabPath(orgSlug: string, tab: CoSoTabId): string {
  return `${coSoRootPath(orgSlug)}/${tab}`;
}

export function coSoKhoaHocDetailPath(orgSlug: string, khoaSlug: string): string {
  return `${coSoRootPath(orgSlug)}/khoa-hoc/${encodeURIComponent(khoaSlug)}`;
}

/** URL sâu tới một tin tuyển dụng: `/co-so/:slug/tuyen-dung/:jobId`. */
export function coSoBaiDangPostPath(orgSlug: string, baiDangId: string): string {
  return `${coSoTabPath(orgSlug, "bai-dang")}/${encodeURIComponent(baiDangId)}`;
}

export function coSoJobPath(orgSlug: string, jobId: string): string {
  return `${coSoTabPath(orgSlug, "tuyen-dung")}/${encodeURIComponent(jobId)}`;
}

export const CO_SO_DEFAULT_TAB: CoSoTabId = "bai-dang";

export type CoSoPathState = {
  tab: CoSoTabId;
  khoaSlug: string | null;
  jobId: string | null;
  baiDangId: string | null;
};

const DEFAULT_PATH_STATE: CoSoPathState = {
  tab: CO_SO_DEFAULT_TAB,
  khoaSlug: null,
  jobId: null,
  baiDangId: null,
};

/** Kiểm tra segment URL hợp lệ dưới `/co-so/[slug]/`. */
export function validateCoSoSegments(segments: readonly string[]): boolean {
  if (segments.length === 1) {
    return isCoSoTabId(segments[0]);
  }
  if (segments.length === 2 && segments[0] === "khoa-hoc") {
    return Boolean(segments[1]?.trim());
  }
  if (segments.length === 2 && segments[0] === "bai-dang") {
    return Boolean(segments[1]?.trim());
  }
  if (segments.length === 2 && segments[0] === "tuyen-dung") {
    return Boolean(segments[1]?.trim());
  }
  return false;
}

/** Parse layout segments dưới `[slug]` → tab + optional khóa slug / jobId. */
export function parseCoSoLayoutSegments(segments: readonly string[]): CoSoPathState {
  if (segments.length >= 2 && segments[0] === "khoa-hoc") {
    return {
      tab: "khoa-hoc",
      khoaSlug: decodeURIComponent(segments[1]),
      jobId: null,
      baiDangId: null,
    };
  }
  if (segments.length >= 2 && segments[0] === "bai-dang") {
    return {
      tab: "bai-dang",
      khoaSlug: null,
      jobId: null,
      baiDangId: decodeURIComponent(segments[1]),
    };
  }
  if (segments.length >= 2 && segments[0] === "tuyen-dung") {
    return {
      tab: "tuyen-dung",
      khoaSlug: null,
      jobId: decodeURIComponent(segments[1]),
      baiDangId: null,
    };
  }
  if (segments.length >= 1 && isCoSoTabId(segments[0])) {
    return { tab: segments[0], khoaSlug: null, jobId: null, baiDangId: null };
  }
  return { ...DEFAULT_PATH_STATE };
}

/** Parse tab/khóa từ pathname — không phụ thuộc slug org khớp payload. */
export function parseCoSoRouteFromPathname(pathname: string): CoSoPathState | null {
  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const prefix = "/co-so/";
  if (!normalizedPath.startsWith(prefix)) return null;

  const withoutPrefix = normalizedPath.slice(prefix.length);
  const firstSlash = withoutPrefix.indexOf("/");
  if (firstSlash === -1) {
    return { ...DEFAULT_PATH_STATE };
  }

  const rest = withoutPrefix.slice(firstSlash + 1);
  if (!rest) {
    return { ...DEFAULT_PATH_STATE };
  }

  const segments = rest.split("/").filter(Boolean);
  if (!validateCoSoSegments(segments)) {
    return null;
  }

  return parseCoSoLayoutSegments(segments);
}

/** Parse full pathname `/co-so/:orgSlug/...` → tab + optional khóa slug. */
export function parseCoSoPathname(
  pathname: string,
  orgSlug: string,
): CoSoPathState | null {
  const parsed = parseCoSoRouteFromPathname(pathname);
  if (!parsed) return null;

  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const prefix = coSoRootPath(orgSlug);
  if (
    normalizedPath !== prefix &&
    !normalizedPath.startsWith(`${prefix}/`)
  ) {
    return null;
  }

  return parsed;
}

/** Path rewrite/redirect giữa cins.vn và manage.cins.vn (Phase 4). */

const ORG_KINDS = ["academy", "studio", "university"] as const;

export type OrgManageKind = (typeof ORG_KINDS)[number];

const ORG_KIND_SET = new Set<string>(ORG_KINDS);

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/** Prefix public org — `/academy/:slug/manage/...` */
export function isOrgManagePath(pathname: string): boolean {
  const parts = splitPath(pathname);
  return (
    parts.length >= 3 &&
    ORG_KIND_SET.has(parts[0]!) &&
    (parts[2] === "manage" || parts[2] === "quan-ly")
  );
}

/** `/seller` hoặc `/seller/...` */
export function isSellerPath(pathname: string): boolean {
  const parts = splitPath(pathname);
  return parts[0] === "seller";
}

/**
 * Web → URL trên manage (bỏ `/manage` khỏi path org).
 * `/academy/x/manage/students` → `/academy/x/students`
 * `/seller/orders` giữ nguyên (pretty `/shop/:slug` cần slug, không có ở đây).
 */
export function toManagePublicPath(pathname: string): string | null {
  const parts = splitPath(pathname);
  if (parts[0] === "seller") {
    return `/${parts.join("/")}`;
  }
  if (
    parts.length >= 3 &&
    ORG_KIND_SET.has(parts[0]!) &&
    (parts[2] === "manage" || parts[2] === "quan-ly")
  ) {
    const rest = parts.slice(3);
    const base = `/${parts[0]}/${parts[1]}`;
    return rest.length ? `${base}/${rest.join("/")}` : base;
  }
  if (parts[0] === "api" && parts[1] === "admin") {
    return `/${parts.join("/")}`;
  }
  if (parts[0] === "admin") {
    return `/${parts.join("/")}`;
  }
  return null;
}

/**
 * Pretty path trên manage → route file nội bộ.
 * `/academy/x/students` → `/academy/x/manage/students`
 * `/shop/basakila/orders` → `/seller/orders`
 * Trả null nếu đã là path nội bộ / không thuộc rewrite.
 */
export function toInternalManagePath(pathname: string): string | null {
  const parts = splitPath(pathname);
  if (parts[0] === "shop" && parts[1]) {
    const rest = parts.slice(2);
    if (rest.length === 0) return "/seller/store";
    return `/seller/${rest.join("/")}`;
  }
  if (
    parts.length >= 2 &&
    ORG_KIND_SET.has(parts[0]!) &&
    parts[2] !== "manage" &&
    parts[2] !== "quan-ly"
  ) {
    const rest = parts.slice(2);
    const base = `/${parts[0]}/${parts[1]}/manage`;
    return rest.length ? `${base}/${rest.join("/")}` : base;
  }
  return null;
}

/** API quản lý CSĐT — không gồm `preview` (public). */
export function isAcademyManageApiPath(pathname: string): boolean {
  if (!pathname.startsWith("/api/academy")) return false;
  if (pathname === "/api/academy/preview" || pathname.startsWith("/api/academy/preview/")) {
    return false;
  }
  return true;
}

/** `/api/studio/:id/...` quản lý — jobs + preview ở lại web. */
export function isStudioManageApiPath(pathname: string): boolean {
  if (pathname === "/api/studio/preview" || pathname.startsWith("/api/studio/preview/")) {
    return false;
  }
  if (pathname.startsWith("/api/studio/jobs")) return false;
  return /^\/api\/studio\/[^/]+\//.test(pathname) || /^\/api\/studio\/[^/]+$/.test(pathname);
}

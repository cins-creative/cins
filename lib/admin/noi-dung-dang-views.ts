/** View modes + URL paths cho `/admin/noi-dung-dang`. */

export type NoiDungDangView =
  | "grid"
  | "listing"
  | "dashboard"
  | "score"
  | "pendingVerify";

const VIEW_BY_SEGMENT: Readonly<Record<string, NoiDungDangView>> = {
  listing: "listing",
  dashboard: "dashboard",
  "cong-thuc": "score",
  "cho-xac-thuc": "pendingVerify",
};

const SEGMENT_BY_VIEW: Readonly<Record<NoiDungDangView, string | null>> = {
  grid: null,
  listing: "listing",
  dashboard: "dashboard",
  score: "cong-thuc",
  pendingVerify: "cho-xac-thuc",
};

/** Legacy `?view=` values (deep-link cũ / bookmark). */
const LEGACY_QUERY_VIEWS: ReadonlySet<string> = new Set([
  "listing",
  "dashboard",
  "score",
  "pendingVerify",
]);

export function pathForNoiDungDangView(view: NoiDungDangView): string {
  const segment = SEGMENT_BY_VIEW[view];
  return segment ? `/admin/noi-dung-dang/${segment}` : "/admin/noi-dung-dang";
}

export function viewFromNoiDungDangPath(
  pathname: string | null | undefined,
): NoiDungDangView | null {
  if (!pathname) return null;
  const base = "/admin/noi-dung-dang";
  if (pathname === base || pathname === `${base}/`) return "grid";
  if (!pathname.startsWith(`${base}/`)) return null;
  const rest = pathname.slice(base.length + 1).replace(/\/+$/, "");
  if (!rest || rest.includes("/")) return null;
  return VIEW_BY_SEGMENT[rest] ?? null;
}

export function viewFromSegment(
  segment: string | null | undefined,
): NoiDungDangView | null {
  if (!segment) return null;
  return VIEW_BY_SEGMENT[segment] ?? null;
}

export function legacyViewFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): NoiDungDangView | null {
  const raw = sp.view;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !LEGACY_QUERY_VIEWS.has(value)) return null;
  return value as NoiDungDangView;
}

import { toManageBounceHref } from "@/lib/cins/manage-handoff";

/** Host app quản lý — tách Worker, giống business.facebook.com. */
export const MANAGE_HOST = "manage.cins.vn";
export const MANAGE_ORIGIN = `https://${MANAGE_HOST}`;

/** Host public — apex. Chrome từ manage phải nhảy origin, không dùng path tương đối. */
export const WEB_HOST = "cins.vn";
export const WEB_ORIGIN = `https://${WEB_HOST}`;

export function isManageHostname(hostname: string): boolean {
  return hostname.toLowerCase() === MANAGE_HOST;
}

export function isCinsApexFamily(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "cins.vn" || h === "www.cins.vn" || h === MANAGE_HOST;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function isManageClientHost(): boolean {
  return (
    typeof window !== "undefined" && isManageHostname(window.location.hostname)
  );
}

/**
 * Link sang bề mặt manage.
 * Dev (monolith): path nội bộ. Prod trên cins.vn: URL tuyệt đối manage.
 * Build `CINS_SURFACE=manage`: path nội bộ.
 */
export function manageHref(path: string): string {
  const normalized = normalizePath(path);
  if (process.env.NODE_ENV !== "production") return normalized;
  if (process.env.CINS_SURFACE === "manage") return normalized;
  return `${MANAGE_ORIGIN}${normalized}`;
}

/**
 * Link sang bề mặt public (`cins.vn`) — đối xứng `manageHref`.
 * Trên manage, `<Link href="/">` same-origin → middleware 308 `/admin`.
 * Dev monolith: path nội bộ. Prod manage (env hoặc host): URL tuyệt đối web.
 */
export function webHref(path: string): string {
  if (/^https?:\/\//i.test(path) || path.startsWith("#")) return path;
  const normalized = normalizePath(path);
  const onManageSurface =
    process.env.CINS_SURFACE === "manage" || isManageClientHost();
  if (!onManageSurface) return normalized;
  if (process.env.NODE_ENV !== "production" && !isManageClientHost()) {
    return normalized;
  }
  return `${WEB_ORIGIN}${normalized}`;
}

/** Link sang panel admin. */
export function manageAdminHref(path = "/admin"): string {
  return manageHref(path);
}

/** `/seller/...` trên manage (pretty `/shop/:slug` khi đã biết handle). */
export function manageSellerHref(sellerPath: string, shopSlug?: string | null): string {
  const rest = sellerPath.replace(/^\/seller\/?/, "").replace(/^\//, "");
  const slug = shopSlug?.trim();
  if (slug) {
    return manageHref(rest ? `/shop/${encodeURIComponent(slug)}/${rest}` : `/shop/${encodeURIComponent(slug)}`);
  }
  return manageHref(rest ? `/seller/${rest}` : "/seller/store");
}

/** Client: `router.push` không đổi origin — dùng location khi href tuyệt đối. */
export function navigateManageHref(
  href: string,
  router: { push: (url: string) => void; replace?: (url: string) => void },
  mode: "push" | "replace" = "push",
): void {
  const dest = toManageBounceHref(href);
  if (/^https?:\/\//i.test(dest) || dest.startsWith("/auth/to-manage")) {
    window.location.assign(dest);
    return;
  }
  if (mode === "replace" && router.replace) {
    router.replace(dest);
    return;
  }
  router.push(dest);
}

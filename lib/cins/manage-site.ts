/** Host app quản lý — tách Worker, giống business.facebook.com. */
export const MANAGE_HOST = "manage.cins.vn";
export const MANAGE_ORIGIN = `https://${MANAGE_HOST}`;

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
  if (/^https?:\/\//i.test(href)) {
    window.location.assign(href);
    return;
  }
  if (mode === "replace" && router.replace) {
    router.replace(href);
    return;
  }
  router.push(href);
}

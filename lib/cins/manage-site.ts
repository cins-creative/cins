/** Host app quản lý (admin CINs) — tách Worker, giống business.facebook.com. */
export const MANAGE_HOST = "manage.cins.vn";
export const MANAGE_ORIGIN = `https://${MANAGE_HOST}`;

export function isManageHostname(hostname: string): boolean {
  return hostname.toLowerCase() === MANAGE_HOST;
}

export function isCinsApexFamily(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "cins.vn" || h === "www.cins.vn" || h === MANAGE_HOST;
}

/**
 * Link sang panel admin.
 * Dev: path nội bộ `/admin`. Prod trên cins.vn: URL tuyệt đối manage.
 */
export function manageAdminHref(path = "/admin"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (process.env.NODE_ENV !== "production") return normalized;
  if (process.env.CINS_SURFACE === "manage") return normalized;
  return `${MANAGE_ORIGIN}${normalized}`;
}

import {
  isManageHostname,
  MANAGE_ORIGIN,
  WEB_ORIGIN,
} from "@/lib/cins/manage-site";

export const MANAGE_TO_MANAGE_PATH = "/auth/to-manage";
export const MANAGE_SESSION_HANDOFF_PATH = "/auth/session-handoff";

/** Path đích trên manage sau khi mang phiên từ cins.vn. */
export function normalizeManageHandoffNext(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(path, MANAGE_ORIGIN);
  } catch {
    return null;
  }
  if (parsed.origin !== MANAGE_ORIGIN) return null;

  const p = parsed.pathname;
  const allowed =
    p === "/admin" ||
    p.startsWith("/admin/") ||
    p === "/seller" ||
    p.startsWith("/seller/") ||
    p === "/shop" ||
    p.startsWith("/shop/") ||
    p.startsWith("/academy/") ||
    p.startsWith("/studio/") ||
    p.startsWith("/university/");
  if (!allowed) return null;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function manageAbsOrPathToNext(href: string): string | null {
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (!isManageHostname(url.hostname)) return null;
      return normalizeManageHandoffNext(
        `${url.pathname}${url.search}${url.hash}`,
      );
    } catch {
      return null;
    }
  }
  return normalizeManageHandoffNext(href);
}

/**
 * Link đi manage từ bề mặt public: bounce cùng origin (`cins.vn`) để đọc
 * cookie phiên host-only, rồi POST sang manage — không bắt đăng nhập lại.
 */
export function toManageBounceHref(href: string): string {
  const next = manageAbsOrPathToNext(href);
  if (!next) return href;
  if (process.env.NODE_ENV !== "production") return next;
  if (process.env.CINS_SURFACE === "manage") return next;
  if (
    typeof window !== "undefined" &&
    isManageHostname(window.location.hostname)
  ) {
    return next;
  }
  return `${MANAGE_TO_MANAGE_PATH}?next=${encodeURIComponent(next)}`;
}

export function isAllowedHandoffOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return (
      host === "cins.vn" ||
      host === "www.cins.vn" ||
      host === "localhost" ||
      host.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

export function isAllowedHandoffRequest(request: {
  headers: { get(name: string): string | null };
}): boolean {
  if (isAllowedHandoffOrigin(request.headers.get("origin"))) return true;
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return isAllowedHandoffOrigin(new URL(referer).origin);
  } catch {
    return false;
  }
}

export function manageHandoffPostUrl(): string {
  return `${MANAGE_ORIGIN}${MANAGE_SESSION_HANDOFF_PATH}`;
}

export function webLoginForHandoffUrl(nextPath: string): string {
  const url = new URL("/login", WEB_ORIGIN);
  url.searchParams.set(
    "next",
    `${MANAGE_TO_MANAGE_PATH}?next=${encodeURIComponent(nextPath)}`,
  );
  return url.toString();
}

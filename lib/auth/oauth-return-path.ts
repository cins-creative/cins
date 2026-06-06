/** Chuẩn hoá path quay lại sau OAuth — tránh redirect về `/login?next=...`. */
export function normalizeOAuthReturnPath(path: string | null | undefined): string | null {
  if (!path?.startsWith("/") || path.startsWith("//")) return null;

  if (path === "/login" || path.startsWith("/login?")) {
    try {
      const url = new URL(path, "http://local");
      const next = url.searchParams.get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        return next;
      }
      return null;
    } catch {
      return null;
    }
  }

  return path;
}

/** Path lưu cookie `cins-oauth-return` trước khi redirect sang Google. */
export function resolveOAuthReturnPath(options?: {
  returnTo?: string;
  pathname?: string;
  search?: string;
  hash?: string;
}): string {
  const explicit = normalizeOAuthReturnPath(options?.returnTo);
  if (explicit) return explicit;

  if (typeof window !== "undefined" && !options?.pathname) {
    const fromLogin = normalizeOAuthReturnPath(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    if (fromLogin) return fromLogin;
    if (window.location.pathname === "/login") return "/";
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  const pathname = options?.pathname ?? "/";
  const search = options?.search ?? "";
  const hash = options?.hash ?? "";
  const raw = `${pathname}${search}${hash}`;
  const normalized = normalizeOAuthReturnPath(raw);
  if (normalized) return normalized;
  if (pathname === "/login") return "/";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

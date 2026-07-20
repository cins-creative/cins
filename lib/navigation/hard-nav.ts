/**
 * Soft-nav (Next `<Link>` / RSC) hay 404 lần đầu khi đổi “shell”
 * (cơ sở / studio / trường / profile `@modal` / entity…).
 * F5 (hard nav) thì vào được — xem `use-co-so-tab-nav`.
 *
 * HardNavGuard dùng các hàm này để chỉ hard-nav khi **đổi shell**,
 * giữ soft/pushState khi vẫn trong cùng org/profile.
 */

/** Khớp `RESERVED_TOP_SEGMENTS` ở `lib/link/cins-internal-preview.ts`. */
const RESERVED_TOP_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "bai-viet",
  "ban-hang",
  "chat",
  "co-so",
  "co-so-dao-tao",
  "cong-dong",
  "ho-tro",
  "huong-nghiep",
  "keyword",
  "kham-pha",
  "login",
  "luoi",
  "maintenance",
  "nganh",
  "nganh-hoc",
  "nghe-nghiep",
  "onboarding",
  "s",
  "software",
  "studio",
  "su-kien",
  "tao-to-chuc",
  "termandservice",
  "thong-tin-du-an",
  "tim-khoa-hoc",
  "tim-kiem",
  "truong-dai-hoc",
  "tuyen-dung",
  "assets",
  "_next",
]);

/** Prefix shell dễ gãy soft-nav RSC. */
const FRAGILE_SHELL_PREFIXES = [
  "co-so:",
  "studio:",
  "truong:",
  "cong-dong:",
  "profile:",
  "nganh-hoc:",
  "nghe-nghiep:",
  "su-kien:",
  "keyword:",
  "software:",
] as const;

export type ShellId = string;

function normalizePathname(pathname: string): string {
  const raw = pathname.split("?")[0].split("#")[0] || "/";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw || "/";
}

function decodeSeg(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/**
 * Id shell ổn định theo pathname.
 * Cùng id = cùng layout shell (được phép soft / pushState nội bộ).
 */
export function pathnameShellId(pathname: string): ShellId {
  const path = normalizePathname(pathname);
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "app:home";

  const top = parts[0];
  const slug = parts[1] ? decodeSeg(parts[1]) : null;

  if (top === "co-so" && slug) return `co-so:${slug}`;
  if (top === "studio" && slug) return `studio:${slug}`;
  if ((top === "co-so-dao-tao" || top === "truong-dai-hoc") && slug) {
    return `truong:${slug}`;
  }
  if (top === "cong-dong" && slug) return `cong-dong:${slug}`;
  if (top === "nganh-hoc" && slug) return `nganh-hoc:${slug}`;
  if (top === "nghe-nghiep" && slug) return `nghe-nghiep:${slug}`;
  if (top === "su-kien" && slug) return `su-kien:${slug}`;
  if (top === "keyword" && slug) return `keyword:${slug}`;
  if (top === "software" && slug) return `software:${slug}`;

  if (!RESERVED_TOP_SEGMENTS.has(top)) {
    return `profile:${decodeSeg(top)}`;
  }

  return `app:${top}`;
}

export function isFragileShell(shellId: ShellId): boolean {
  return FRAGILE_SHELL_PREFIXES.some((prefix) => shellId.startsWith(prefix));
}

/** Hard-nav khi đổi shell và ít nhất một phía thuộc cây dễ gãy. */
export function shouldHardNavigate(
  fromPathname: string,
  toPathname: string,
): boolean {
  const from = normalizePathname(fromPathname);
  const to = normalizePathname(toPathname);
  if (from === to) return false;

  const fromShell = pathnameShellId(from);
  const toShell = pathnameShellId(to);
  if (fromShell === toShell) return false;

  return isFragileShell(fromShell) || isFragileShell(toShell);
}

export const HARD_NAV_ALLOW_SOFT_ATTR = "data-allow-soft-nav";

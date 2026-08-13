/**
 * Soft-nav (Next `<Link>` / RSC) hay 404 lần đầu khi đổi “shell”
 * (cơ sở / studio / trường / profile `@modal` / entity…).
 * F5 (hard nav) thì vào được — xem `use-co-so-tab-nav`.
 *
 * HardNavGuard dùng các hàm này để chỉ hard-nav khi **đổi shell**,
 * giữ soft/pushState khi vẫn trong cùng org/profile.
 */

/**
 * Segment đầu không phải profile `/{slug}` — nguồn duy nhất cho toàn repo.
 *
 * Gồm **cả tên tiếng Việt cũ**: URL cũ vẫn được middleware redirect 308, và
 * slug người dùng không được chiếm những tên đó (xem `RESERVED_SLUGS`).
 */
export const RESERVED_TOP_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "assets",
  "_next",
  "s",
  "chat",
  "keyword",
  "login",
  "maintenance",
  "onboarding",
  "software",
  "studio",
  "fandom",
  /* Tên tiếng Anh hiện tại. */
  "about",
  "academy",
  "account",
  "articles",
  "careers",
  "community",
  "create-organization",
  "draft",
  "events",
  "explore",
  "find-courses",
  "guidance",
  "jobs",
  "majors",
  "open-shop",
  "organizations",
  "policies",
  "search",
  "seller",
  "shopping",
  "support",
  "terms",
  "university",
  /* Tên tiếng Việt cũ — còn redirect 308. */
  "bai-viet",
  "ban-hang",
  "chinh-sach",
  "co-so",
  "co-so-dao-tao",
  "cong-dong",
  "cua-hang",
  "ho-tro",
  "huong-nghiep",
  "kham-pha",
  "luoi",
  "mo-shop",
  "nganh",
  "nganh-hoc",
  "nghe-nghiep",
  "nhap",
  "su-kien",
  "tai-khoan",
  "tao-to-chuc",
  "termandservice",
  "thong-tin-du-an",
  "tim-khoa-hoc",
  "tim-kiem",
  "to-chuc",
  "truong-dai-hoc",
  "tuyen-dung",
]);

/** Prefix shell dễ gãy soft-nav RSC. */
const FRAGILE_SHELL_PREFIXES = [
  "academy:",
  "studio:",
  "university:",
  "community:",
  "profile:",
  "majors:",
  "careers:",
  "events:",
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

  if (top === "academy" && slug) return `academy:${slug}`;
  if (top === "studio" && slug) return `studio:${slug}`;
  if (top === "university" && slug) return `university:${slug}`;
  if (top === "community" && slug) return `community:${slug}`;
  if (top === "majors" && slug) return `majors:${slug}`;
  if (top === "careers" && slug) return `careers:${slug}`;
  if (top === "events" && slug) return `events:${slug}`;
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

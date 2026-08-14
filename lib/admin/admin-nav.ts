/** Catalog sidebar admin — dùng chung sidebar + bảng phân quyền tab. */

export type AdminNavSection = { section: string };

export type AdminNavLink = {
  href: string;
  label: string;
  icon: string;
};

export type AdminNavItem = AdminNavSection | AdminNavLink;

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { section: "Nội dung" },
  { href: "/admin/bai-viet", label: "Bài viết", icon: "doc" },
  { href: "/admin/noi-dung-dang", label: "Nội dung đăng", icon: "grid" },
  { href: "/admin/tuyen-dung", label: "Tuyển dụng", icon: "briefcase" },
  { href: "/admin/tag", label: "Quản lý Tag", icon: "tag" },
  { href: "/admin/bao-cao", label: "Báo cáo", icon: "flag" },
  { href: "/admin/giao-dich", label: "Giao dịch", icon: "cart" },
  { href: "/admin/tranh-chap", label: "Tranh chấp shop", icon: "flag" },
  { href: "/admin/gop-y", label: "Góp ý", icon: "message" },
  { href: "/admin/mo-shop", label: "Mở shop", icon: "cart" },
  { href: "/admin/danh-muc", label: "Danh mục hàng", icon: "tag" },
  { href: "/admin/huong-dan", label: "Hướng dẫn", icon: "book" },
  { section: "Tổ chức" },
  { href: "/admin/to-chuc", label: "Tổ chức", icon: "org" },
  { href: "/admin/nganh", label: "Ngành đào tạo", icon: "edu" },
  { href: "/admin/mon-thi", label: "Môn & khối thi", icon: "subject" },
  { section: "Users" },
  { href: "/admin/nguoi-dung", label: "Người dùng", icon: "users" },
  { href: "/admin/quan-tri-vien", label: "Quản trị viên", icon: "shield" },
  { section: "Seeding" },
  { href: "/admin/tai-khoan-ai", label: "Nick seeding", icon: "bot" },
  { href: "/admin/trang-seeding", label: "Trang seeding", icon: "org" },
  { section: "Hệ thống" },
  { href: "/admin/tai-chinh", label: "Tài chính", icon: "chart" },
  { href: "/admin/csdt-phi", label: "Phí CSĐT", icon: "flag" },
  { href: "/admin/linh-vuc", label: "Lĩnh vực", icon: "grid" },
  { href: "/admin/schema", label: "Schema DB", icon: "sql" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
  { href: "/admin/bang-thong", label: "Băng thông call", icon: "chart" },
] as const;

export function isAdminNavLink(item: AdminNavItem): item is AdminNavLink {
  return "href" in item;
}

export function adminTabKeyFromHref(href: string): string {
  return href.replace(/^\/admin\/?/, "") || "dashboard";
}

export function adminHrefFromTabKey(key: string): string {
  return `/admin/${key}`;
}

export const ADMIN_NAV_LINKS: readonly AdminNavLink[] =
  ADMIN_NAV.filter(isAdminNavLink);

export const ADMIN_NAV_TAB_KEYS = new Set(
  ADMIN_NAV_LINKS.map((item) => adminTabKeyFromHref(item.href)),
);

/** Tab chỉ admin+ được vào — curator không thấy trên sidebar. */
export const ADMIN_TABS_REQUIRE_MANAGE_USERS = [
  "/admin/nguoi-dung",
  "/admin/quan-tri-vien",
] as const;

export type AdminNavTabMeta = {
  key: string;
  href: string;
  label: string;
  section: string;
};

export function listAdminNavTabs(): AdminNavTabMeta[] {
  const out: AdminNavTabMeta[] = [];
  let section = "";
  for (const item of ADMIN_NAV) {
    if (!isAdminNavLink(item)) {
      section = item.section;
      continue;
    }
    out.push({
      key: adminTabKeyFromHref(item.href),
      href: item.href,
      label: item.label,
      section,
    });
  }
  return out;
}

export function matchAdminNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ADMIN_NAV_LINKS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

export function adminNavActiveLabel(pathname: string): string {
  const href = matchAdminNavHref(pathname);
  if (!href) return "Admin";
  return ADMIN_NAV_LINKS.find((item) => item.href === href)?.label ?? "Admin";
}

export function filterAdminNav(
  hiddenHrefs: ReadonlySet<string>,
): AdminNavItem[] {
  const out: AdminNavItem[] = [];
  let pendingSection: AdminNavSection | null = null;
  for (const item of ADMIN_NAV) {
    if (!isAdminNavLink(item)) {
      pendingSection = item;
      continue;
    }
    if (hiddenHrefs.has(item.href)) continue;
    if (pendingSection) {
      out.push(pendingSection);
      pendingSection = null;
    }
    out.push(item);
  }
  return out;
}

export function sanitizeAdminTabKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const key = item.trim();
    if (!ADMIN_NAV_TAB_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

import {
  MAIN_NAV_FOOT_ITEMS,
  MAIN_NAV_ITEMS,
  type MainNavIcon,
  type MainNavItem,
} from "@/lib/cins/mainNav";

/** SVG inline trong home v2 — giữ style gốc, đồng bộ label/href với CinsAppSidebar. */
const HOME_SIDEBAR_ICONS: Record<MainNavIcon, string> = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  gallery:
    '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  career:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5L13 13l-4.5 2.5L11 11l4.5-2.5z"/></svg>',
  education:
    '<svg viewBox="0 0 24 24"><path d="M12 4l10 4-10 4L2 8l10-4z"/><path d="M6 10v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-5"/><path d="M22 8v6"/></svg>',
  courses:
    '<svg viewBox="0 0 24 24"><path d="M3 4.5A1.5 1.5 0 014.5 3H11v17H4.5A1.5 1.5 0 013 18.5v-14z"/><path d="M21 4.5A1.5 1.5 0 0019.5 3H13v17h6.5a1.5 1.5 0 001.5-1.5v-14z"/><path d="M6 7h2M6 10h2M16 7h2M16 10h2"/></svg>',
  community:
    '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  business:
    '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/><path d="M3 12h18"/></svg>',
  jobs: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/><path d="M3 12h5"/><path d="M16 12h5"/><path d="M11 12a1 1 0 002 0"/></svg>',
  events:
    '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/></svg>',
  blog: '<svg viewBox="0 0 24 24"><path d="M14 3l7 7-11 11H3v-7L14 3z"/><path d="M13 4l7 7"/></svg>',
  profile:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3.2"/><path d="M5.5 19.5a8 8 0 0113 0"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderNavAnchor(item: MainNavItem, pathname: string): string {
  const active = item.isActive(pathname);
  return `<a href="${escapeHtml(item.href)}" class="sb-item${active ? " active" : ""}" data-tip="${escapeHtml(item.tip)}">
      <span class="sb-ico">${HOME_SIDEBAR_ICONS[item.icon]}</span>
      <span class="sb-label">${escapeHtml(item.label)}</span></a>`;
}

function renderMainNavListHtml(pathname: string): string {
  const items = MAIN_NAV_ITEMS.map(
    (item) => `    <li>${renderNavAnchor(item, pathname)}</li>`,
  ).join("\n");
  return `<ul class="sb-list">\n${items}\n  </ul>`;
}

function renderMainNavFootHtml(pathname: string): string {
  const links = MAIN_NAV_FOOT_ITEMS.map((item) =>
    renderNavAnchor(item, pathname),
  ).join("\n    ");
  return `<div class="sb-foot">\n    ${links}\n  </div>`;
}

/** Thay sidebar nav home v2 bằng cùng nguồn MAIN_NAV_* như CinsAppSidebar. */
export function injectHomeSidebarNav(
  markup: string,
  pathname = "/",
): string {
  const listHtml = renderMainNavListHtml(pathname);
  const footHtml = renderMainNavFootHtml(pathname);

  let out = markup.replace(/<ul class="sb-list">[\s\S]*?<\/ul>/, listHtml);
  out = out.replace(/<div class="sb-foot">[\s\S]*?<\/div>/, footHtml);
  return out;
}

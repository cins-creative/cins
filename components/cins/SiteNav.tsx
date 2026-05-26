"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { useCinsSidebarNav } from "@/components/cins/useCinsSidebarNav";
import {
  MAIN_NAV_FOOT_ITEMS,
  MAIN_NAV_ITEMS,
  type MainNavItem,
} from "@/lib/cins/mainNav";

function SidebarLink({
  item,
  pathname,
}: {
  item: MainNavItem;
  pathname: string;
}) {
  const active = item.isActive(pathname);
  return (
    <li>
      <Link
        href={item.href}
        className={`sb-item${active ? " active" : ""}`}
        data-tip={item.tip}
        aria-current={active ? "page" : undefined}
      >
        <span className="sb-ico">
          <SidebarNavIcon name={item.icon} />
        </span>
        <span className="sb-label">{item.label}</span>
      </Link>
    </li>
  );
}

function SidebarFootLink({
  item,
  pathname,
}: {
  item: MainNavItem;
  pathname: string;
}) {
  const active = item.isActive(pathname);
  return (
    <Link
      href={item.href}
      className={`sb-item${active ? " active" : ""}`}
      data-tip={item.tip}
      aria-current={active ? "page" : undefined}
    >
      <span className="sb-ico">
        <SidebarNavIcon name={item.icon} />
      </span>
      <span className="sb-label">{item.label}</span>
    </Link>
  );
}

export function CinsAppSidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside
      className="sidebar cins-app-sidebar"
      id="app-sidebar"
      aria-label="Điều hướng chính"
    >
      <Link href="/" className="sb-brand" aria-label="CINs trang chủ">
        <div className="sb-brand-mark">C</div>
        <div className="sb-brand-text">CINs</div>
      </Link>
      <ul className="sb-list">
        {MAIN_NAV_ITEMS.map((item) => (
          <SidebarLink key={item.id} item={item} pathname={pathname} />
        ))}
      </ul>
      <div className="sb-foot">
        {MAIN_NAV_FOOT_ITEMS.map((item) => (
          <SidebarFootLink key={item.id} item={item} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}

/* `CinsAppTopbar` đã chuyển sang file riêng `CinsAppTopbar.tsx` (async server
 * component) để check session + render nút "Đăng xuất" qua Server Action. */

/** Khởi tạo tooltip sidebar + burger (render null). */
export function SiteNavEffects() {
  useCinsSidebarNav("app-sidebar");
  return null;
}


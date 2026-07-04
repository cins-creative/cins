"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { CinsSidebarRiveBrand } from "@/components/cins/CinsSidebarRiveBrand";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { SidebarOrgFlyout } from "@/components/cins/SidebarOrgFlyout";
import { useCinsSidebarNav } from "@/components/cins/useCinsSidebarNav";
import {
  MAIN_NAV_GROUP_BREAK_AFTER,
  MAIN_NAV_ITEMS,
  type MainNavItem,
} from "@/lib/cins/mainNav";

function SidebarAnchor({
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
      data-tip={item.flyout ? undefined : item.tip}
      aria-current={active ? "page" : undefined}
    >
      <span className="sb-ico">
        <SidebarNavIcon name={item.icon} />
      </span>
      <span className="sb-label">{item.label}</span>
    </Link>
  );
}

function SidebarLink({
  item,
  pathname,
}: {
  item: MainNavItem;
  pathname: string;
}) {
  if (item.flyout) {
    return (
      <SidebarOrgFlyout kind={item.flyout} item={item} pathname={pathname} />
    );
  }
  return (
    <li>
      <SidebarAnchor item={item} pathname={pathname} />
    </li>
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
      <CinsSidebarRiveBrand sidebarId="app-sidebar" />
      <ul className="sb-list">
        {MAIN_NAV_ITEMS.map((item) => (
          <Fragment key={item.id}>
            <SidebarLink item={item} pathname={pathname} />
            {MAIN_NAV_GROUP_BREAK_AFTER.has(item.id) ? (
              <li className="sb-sep" role="separator" aria-hidden />
            ) : null}
          </Fragment>
        ))}
      </ul>
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


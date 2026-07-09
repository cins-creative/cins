"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";

import { CinsComingSoonModal } from "@/components/cins/CinsComingSoonModal";
import { CinsSidebarRiveBrand } from "@/components/cins/CinsSidebarRiveBrand";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { SidebarOrgFlyout } from "@/components/cins/SidebarOrgFlyout";
import { useCinsSidebarNav } from "@/components/cins/useCinsSidebarNav";
import {
  MAIN_NAV_FOOT_ITEMS,
  MAIN_NAV_GROUP_BREAK_AFTER,
  MAIN_NAV_ITEMS,
  type MainNavItem,
} from "@/lib/cins/mainNav";

function SidebarItemContent({ item }: { item: MainNavItem }) {
  return (
    <>
      <span className="sb-ico">
        <SidebarNavIcon name={item.icon} />
      </span>
      <span className="sb-label">{item.label}</span>
    </>
  );
}

function SidebarAnchor({
  item,
  pathname,
  onComingSoon,
}: {
  item: MainNavItem;
  pathname: string;
  onComingSoon?: () => void;
}) {
  const active = item.isActive(pathname);
  const className = `sb-item${active ? " active" : ""}${item.highlight ? " sb-item--highlight" : ""}`;

  if (item.comingSoon) {
    return (
      <button
        type="button"
        className={className}
        data-tip={item.tip}
        onClick={onComingSoon}
      >
        <SidebarItemContent item={item} />
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      data-tip={item.flyout ? undefined : item.tip}
      aria-current={active ? "page" : undefined}
    >
      <SidebarItemContent item={item} />
    </Link>
  );
}

function SidebarLink({
  item,
  pathname,
  onComingSoon,
}: {
  item: MainNavItem;
  pathname: string;
  onComingSoon?: () => void;
}) {
  if (item.flyout) {
    return (
      <SidebarOrgFlyout kind={item.flyout} item={item} pathname={pathname} />
    );
  }
  return (
    <li>
      <SidebarAnchor
        item={item}
        pathname={pathname}
        onComingSoon={onComingSoon}
      />
    </li>
  );
}

export function CinsAppSidebar() {
  const pathname = usePathname() ?? "/";
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <>
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
        <div className="sb-foot">
          {MAIN_NAV_FOOT_ITEMS.map((item) => (
            <SidebarAnchor
              key={item.id}
              item={item}
              pathname={pathname}
              onComingSoon={() => setComingSoonOpen(true)}
            />
          ))}
        </div>
      </aside>
      <CinsComingSoonModal
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
      />
    </>
  );
}

/* `CinsAppTopbar` đã chuyển sang file riêng `CinsAppTopbar.tsx` (async server
 * component) để check session + render nút "Đăng xuất" qua Server Action. */

/** Khởi tạo tooltip sidebar + burger (render null). */
export function SiteNavEffects() {
  const pathname = usePathname();
  useCinsSidebarNav("app-sidebar", pathname ?? "/");
  return null;
}


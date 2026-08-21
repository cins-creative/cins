"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";

import { CinsComingSoonModal } from "@/components/cins/CinsComingSoonModal";
import { CinsSidebarRiveBrand } from "@/components/cins/CinsSidebarRiveBrand";
import { CinsTopbarSearch } from "@/components/cins/CinsTopbarSearch";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { SidebarOrgFlyout } from "@/components/cins/SidebarOrgFlyout";
import { useCinsSidebarNav } from "@/components/cins/useCinsSidebarNav";
import { CinsLocaleSwitch } from "@/components/cins/CinsLocaleSwitch";
import {
  MAIN_NAV_FOOT_ITEMS,
  MAIN_NAV_GROUP_BREAK_AFTER,
  MAIN_NAV_ITEMS,
  type MainNavItem,
} from "@/lib/cins/mainNav";
import {
  MAIN_NAV_LABEL_KEY,
  MAIN_NAV_TIP_KEY,
} from "@/lib/cins/main-nav-i18n";
import { useT } from "@/lib/i18n/use-t";
import type { TFn } from "@/lib/i18n/t";

function localizeNavItem(item: MainNavItem, t: TFn): MainNavItem {
  const labelKey = MAIN_NAV_LABEL_KEY[item.id];
  const tipKey = MAIN_NAV_TIP_KEY[item.id];
  return {
    ...item,
    label: labelKey ? t(labelKey) : item.label,
    tip: tipKey ? t(tipKey) : item.tip,
  };
}

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
  onNavigate,
  onComingSoon,
}: {
  item: MainNavItem;
  pathname: string;
  onNavigate?: (href: string) => void;
  onComingSoon?: () => void;
}) {
  const active = item.isActive(pathname);
  const className = `sb-item${active ? " active" : ""}`;

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
      onPointerDown={() => onNavigate?.(item.href)}
    >
      <SidebarItemContent item={item} />
    </Link>
  );
}

function SidebarLink({
  item,
  pathname,
  onNavigate,
  onComingSoon,
}: {
  item: MainNavItem;
  pathname: string;
  onNavigate?: (href: string) => void;
  onComingSoon?: () => void;
}) {
  if (item.flyout) {
    return (
      <SidebarOrgFlyout
        kind={item.flyout}
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <li>
      <SidebarAnchor
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
        onComingSoon={onComingSoon}
      />
    </li>
  );
}

export function CinsAppSidebar() {
  const t = useT();
  const pathname = usePathname() ?? "/";
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const navPath = pendingPath ?? pathname;
  const navItems = MAIN_NAV_ITEMS.map((item) => localizeNavItem(item, t));
  const footItems = MAIN_NAV_FOOT_ITEMS.map((item) =>
    localizeNavItem(item, t),
  );

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  return (
    <>
      <aside
        className="sidebar cins-app-sidebar"
        id="app-sidebar"
        aria-label={t("nav.mainAria")}
      >
        <CinsSidebarRiveBrand sidebarId="app-sidebar" />
        <ul className="sb-list">
          <li className="sb-search-li">
            <Suspense
              fallback={
                <div className="sb-search sb-search--fallback" aria-hidden>
                  <span className="sb-ico" />
                </div>
              }
            >
              <CinsTopbarSearch />
            </Suspense>
          </li>
          {navItems.map((item) => (
            <Fragment key={item.id}>
              <SidebarLink
                item={item}
                pathname={navPath}
                onNavigate={setPendingPath}
              />
              {MAIN_NAV_GROUP_BREAK_AFTER.has(item.id) ? (
                <li className="sb-sep" role="separator" aria-hidden />
              ) : null}
            </Fragment>
          ))}
        </ul>
        <div className="sb-foot">
          <CinsLocaleSwitch />
          <nav className="sb-foot-meta" aria-label={t("nav.footAria")}>
            {footItems.map((item, index) => {
              const active = item.isActive(navPath);
              return (
                <Fragment key={item.id}>
                  {index > 0 ? (
                    <span className="sb-foot-sep" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <Link
                    href={item.href}
                    className={`sb-foot-link${active ? " is-active" : ""}`}
                    title={item.tip}
                    aria-current={active ? "page" : undefined}
                    onPointerDown={() => setPendingPath(item.href)}
                  >
                    {item.label}
                  </Link>
                </Fragment>
              );
            })}
          </nav>
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


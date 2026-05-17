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

export function CinsAppTopbar() {
  return (
    <nav className="topbar cins-app-topbar" id="app-topbar">
      <div className="topbar-inner">
        <div className="tb-left">
          <button
            type="button"
            className="tb-burger"
            id="app-tb-burger"
            aria-label="Mở menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="#" className="tb-quiz">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l1.8 5.4L19 9.2l-4.5 3.3L16 18l-4-3-4 3 1.5-5.5L5 9.2l5.2-1.8L12 2z" />
            </svg>
            <span>Quiz khám phá tính cách nghề</span>
          </Link>
        </div>
        <div className="tb-right">
          <Link href="#" className="tb-ask">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z" />
              <path d="M9 10h6M9 13h4" />
            </svg>
            <span>Tư vấn nghề</span>
          </Link>
          <span className="tb-divider" aria-hidden />
          <div className="tb-auth">
            <Link href="#" className="tb-login">
              Đăng nhập
            </Link>
            <Link href="#" className="tb-signup">
              Đăng ký <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/** Khởi tạo tooltip sidebar + burger (render null). */
export function SiteNavEffects() {
  useCinsSidebarNav("app-sidebar");
  return null;
}


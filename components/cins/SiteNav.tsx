"use client";

import { MoreHorizontal, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/app/auth/sign-out-action";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { useCinsSidebarNav } from "@/components/cins/useCinsSidebarNav";
import {
  MAIN_NAV_ITEMS,
  type MainNavItem,
} from "@/lib/cins/mainNav";
import { getNameInitials } from "@/lib/journey/profile";

/**
 * Profile rút gọn truyền từ server (CinsShell) — đủ render user card kiểu
 * X (avatar + tên + handle). `null` khi guest hoặc user chưa có slug (chưa
 * qua onboarding) — sidebar sẽ ẩn user card và menu account.
 */
type SidebarProfile = {
  slug: string;
  tenHienThi: string | null;
  /** URL Cloudflare Images đã resolve ở server. `null` → fallback initials. */
  avatarUrl: string | null;
};

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

/**
 * X-style user card ở sidebar footer:
 * - Collapsed sidebar (60px): chỉ hiện avatar tròn (centered).
 * - Expanded (240px, hover/focus-within): avatar + (tên / @handle) + nút "..."
 * - Click "..." → popover phía trên: Trang cá nhân (highlight), Tạo tổ chức,
 *   Cài đặt, Trợ giúp, Đăng xuất. Đăng xuất là `<form action={signOutAction}>` để
 *   server action xoá phiên Supabase + redirect /login.
 *
 * Chỉ render khi `profile != null` (user đã đăng nhập + có slug). Guest
 * không thấy card này — login form bên topbar.
 */
function SidebarUserCard({ profile }: { profile: SidebarProfile }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const initials = getNameInitials(profile.tenHienThi, profile.slug);
  const displayName = profile.tenHienThi || profile.slug;

  /* Đóng menu khi click ra ngoài hoặc bấm Esc. Listener gắn ở document
     vì menu render ở trong sidebar (collapsed) có thể overflow ra. */
  useEffect(() => {
    if (!open) return;
    function onDocClick(ev: MouseEvent) {
      if (!cardRef.current) return;
      if (cardRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`sb-user${open ? " open" : ""}`}
      ref={cardRef}
    >
      {open ? (
        <div
          className="sb-user-menu"
          role="menu"
          id={menuId}
          aria-label="Tài khoản"
        >
          <Link
            href={`/${profile.slug}`}
            className="sb-user-menu-item sb-user-menu-item-primary"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="sb-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="profile" />
            </span>
            <span>Trang cá nhân</span>
          </Link>
          <Link
            href="/tao-to-chuc"
            className="sb-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="sb-user-menu-ico" aria-hidden>
              <PlusCircle size={18} strokeWidth={1.7} />
            </span>
            <span>Tạo tổ chức</span>
          </Link>
          <Link
            href="/cong-dong/tao"
            className="sb-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="sb-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="community" />
            </span>
            <span>Tạo cộng đồng</span>
          </Link>
          <Link
            href="/#settings"
            className="sb-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="sb-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="settings" />
            </span>
            <span>Cài đặt</span>
          </Link>
          <Link
            href="/#help"
            className="sb-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="sb-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="help" />
            </span>
            <span>Trợ giúp</span>
          </Link>
          <form action={signOutAction} className="sb-user-menu-form">
            <button
              type="submit"
              className="sb-user-menu-item sb-user-menu-item-danger"
              role="menuitem"
            >
              <span className="sb-user-menu-ico" aria-hidden>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span>Đăng xuất @{profile.slug}</span>
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="sb-user-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        data-tip={`@${profile.slug}`}
      >
        <span className="sb-user-ava" aria-hidden>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <span className="sb-user-ava-fallback">{initials}</span>
          )}
        </span>
        <span className="sb-user-meta">
          <span className="sb-user-name">{displayName}</span>
          <span className="sb-user-handle">@{profile.slug}</span>
        </span>
        <span className="sb-user-more" aria-hidden>
          <MoreHorizontal size={18} strokeWidth={1.8} />
        </span>
      </button>
    </div>
  );
}

export function CinsAppSidebar({
  profile,
}: {
  /** User profile để render account card — null = ẩn (chưa login hoặc chưa
   *  có slug, hoặc trang public không cần thanh account). */
  profile?: SidebarProfile | null;
}) {
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
        {profile ? <SidebarUserCard profile={profile} /> : null}
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


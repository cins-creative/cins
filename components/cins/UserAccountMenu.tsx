"use client";

import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/app/auth/sign-out-action";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { getNameInitials } from "@/lib/journey/profile";

export type UserAccountProfile = {
  slug: string;
  tenHienThi: string | null;
  avatarUrl: string | null;
};

type Placement = "sidebar" | "topbar";

type Props = {
  profile: UserAccountProfile;
  placement?: Placement;
};

export function UserAccountMenu({ profile, placement = "sidebar" }: Props) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const initials = getNameInitials(profile.tenHienThi, profile.slug);
  const displayName = profile.tenHienThi || profile.slug;
  const isTopbar = placement === "topbar";
  const rootClass = isTopbar ? "tb-user" : "sb-user";
  const pillClass = isTopbar ? "tb-user-pill" : "sb-user-pill";
  const avaClass = isTopbar ? "tb-user-ava" : "sb-user-ava";
  const metaClass = isTopbar ? "tb-user-meta" : "sb-user-meta";
  const nameClass = isTopbar ? "tb-user-name" : "sb-user-name";
  const handleClass = isTopbar ? "tb-user-handle" : "sb-user-handle";
  const menuClass = isTopbar ? "tb-user-menu" : "sb-user-menu";

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
    <div className={`${rootClass}${open ? " open" : ""}`} ref={cardRef}>
      {open ? (
        <div
          className={menuClass}
          role="menu"
          id={menuId}
          aria-label="Tài khoản"
        >
          <Link
            href={`/${profile.slug}`}
            className="app-user-menu-item app-user-menu-item-primary"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="profile" />
            </span>
            <span>Trang cá nhân</span>
          </Link>
          <Link
            href="/tao-to-chuc"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <PlusCircle size={18} strokeWidth={1.7} />
            </span>
            <span>Tạo tổ chức</span>
          </Link>
          <Link
            href="/cong-dong/tao"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="community" />
            </span>
            <span>Tạo cộng đồng</span>
          </Link>
          <Link
            href="/#settings"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="settings" />
            </span>
            <span>Cài đặt</span>
          </Link>
          <Link
            href="/#help"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="help" />
            </span>
            <span>Trợ giúp</span>
          </Link>
          <form action={signOutAction} className="app-user-menu-form">
            <button
              type="submit"
              className="app-user-menu-item app-user-menu-item-danger"
              role="menuitem"
            >
              <span className="app-user-menu-ico" aria-hidden>
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
        className={pillClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        data-tip={isTopbar ? undefined : `@${profile.slug}`}
      >
        <span className={avaClass} aria-hidden>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <span className="app-user-ava-fallback">{initials}</span>
          )}
        </span>
        <span className={metaClass}>
          <span className={nameClass}>{displayName}</span>
          <span className={handleClass}>@{profile.slug}</span>
        </span>
      </button>
    </div>
  );
}

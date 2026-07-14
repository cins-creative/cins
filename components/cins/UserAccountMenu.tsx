"use client";

import { ChevronDown, PlusCircle, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/app/auth/sign-out-action";
import {
  removeSavedAccountAction,
  switchAccountAction,
} from "@/app/auth/switch-account-action";
import { HelpCenterModal } from "@/components/cins/HelpCenterModal";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { UserAccountSettingsModal } from "@/components/cins/UserAccountSettingsModal";
import { getNameInitials } from "@/lib/journey/profile";

export type UserAccountProfile = {
  slug: string;
  tenHienThi: string | null;
  avatarUrl: string | null;
};

/** Tài khoản khác đã ghi nhớ để chuyển nhanh (hiển thị, không kèm token). */
export type SwitchableAccount = {
  slug: string;
  tenHienThi: string | null;
  avatarUrl: string | null;
};

type Placement = "sidebar" | "topbar";

type Props = {
  profile: UserAccountProfile;
  placement?: Placement;
  /** Các tài khoản khác đã đăng nhập trên trình duyệt này (bỏ tài khoản hiện tại). */
  savedAccounts?: SwitchableAccount[];
};

export function UserAccountMenu({
  profile,
  placement = "sidebar",
  savedAccounts = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  // Giá trị mặc định (SSR-safe, không dùng useSearchParams để tránh deopt toàn
  // trang). Full URL kèm query được cập nhật ngay trước khi submit ở client.
  const pathname = usePathname() || "/";

  function captureReturnTo(ev: React.MouseEvent<HTMLButtonElement>) {
    const form = ev.currentTarget.form;
    const input = form?.elements.namedItem("returnTo");
    if (input instanceof HTMLInputElement) {
      input.value = `${window.location.pathname}${window.location.search}`;
    }
  }
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
    <>
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

          <div className="app-user-switch">
            <button
              type="button"
              className="app-user-menu-item app-user-switch-toggle"
              aria-expanded={switchOpen}
              onClick={() => setSwitchOpen((v) => !v)}
            >
              <span className="app-user-menu-ico" aria-hidden>
                <Users size={18} strokeWidth={1.7} />
              </span>
              <span className="app-user-switch-label">Chuyển tài khoản</span>
              {savedAccounts.length > 0 ? (
                <span className="app-user-switch-count" aria-hidden>
                  {savedAccounts.length}
                </span>
              ) : null}
              <ChevronDown
                size={16}
                strokeWidth={1.8}
                className={`app-user-switch-caret${switchOpen ? " is-open" : ""}`}
                aria-hidden
              />
            </button>

            {switchOpen ? (
              <div
                className="app-user-switch-list"
                role="group"
                aria-label="Tài khoản khác"
              >
                {savedAccounts.map((acc) => (
                  <div className="app-user-switch-row" key={acc.slug}>
                    <form
                      action={switchAccountAction.bind(null, acc.slug)}
                      className="app-user-switch-form"
                    >
                      <input
                        type="hidden"
                        name="returnTo"
                        defaultValue={pathname}
                      />
                      <button
                        type="submit"
                        className="app-user-switch-item"
                        role="menuitem"
                        onClick={captureReturnTo}
                      >
                        <span className="app-user-switch-ava" aria-hidden>
                          {acc.avatarUrl ? (
                            <img src={acc.avatarUrl} alt="" />
                          ) : (
                            <span className="app-user-ava-fallback">
                              {getNameInitials(acc.tenHienThi, acc.slug)}
                            </span>
                          )}
                        </span>
                        <span className="app-user-switch-meta">
                          <span className="app-user-switch-name">
                            {acc.tenHienThi || acc.slug}
                          </span>
                          <span className="app-user-switch-handle">
                            @{acc.slug}
                          </span>
                        </span>
                      </button>
                    </form>
                    <form
                      action={removeSavedAccountAction.bind(null, acc.slug)}
                      className="app-user-switch-remove-form"
                    >
                      <button
                        type="submit"
                        className="app-user-switch-remove"
                        aria-label={`Bỏ ghi nhớ @${acc.slug}`}
                        title="Bỏ ghi nhớ tài khoản này"
                      >
                        <X size={14} strokeWidth={2} aria-hidden />
                      </button>
                    </form>
                  </div>
                ))}
                {savedAccounts.length === 0 ? (
                  <p className="app-user-switch-empty">
                    Chưa có tài khoản nào khác được ghi nhớ trên máy này.
                  </p>
                ) : null}
                <Link
                  href="/login?them=1"
                  className="app-user-menu-item app-user-switch-add"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <span className="app-user-menu-ico" aria-hidden>
                    <UserPlus size={18} strokeWidth={1.7} />
                  </span>
                  <span>Thêm tài khoản</span>
                </Link>
              </div>
            ) : null}
          </div>

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
          <button
            type="button"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setSettingsOpen(true);
            }}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="settings" />
            </span>
            <span>Cài đặt</span>
          </button>
          <button
            type="button"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setHelpOpen(true);
            }}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="help" />
            </span>
            <span>Trợ giúp</span>
          </button>
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
      <HelpCenterModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <UserAccountSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

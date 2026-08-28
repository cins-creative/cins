"use client";

import {
  LogIn,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { clearAllClientCaches } from "@/lib/client-cache";
import { clearAllWorldJourneyFirstImpressionSeen } from "@/lib/cins/worldJourneyFirstImpression";
import { getNameInitials } from "@/lib/journey/profile";
import { webHref } from "@/lib/cins/manage-site";
import { clearRecentSearches } from "@/lib/search/recent-searches-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  THEME_CHANGE_EVENT,
  THEME_MODE_OPTIONS,
  readThemeMode,
  setThemeMode as persistThemeMode,
  type ThemeMode,
} from "@/lib/theme/theme-mode";

export type AdminTopbarProfile = {
  slug: string;
  tenHienThi: string | null;
  avatarUrl: string | null;
};

type Props = {
  profile: AdminTopbarProfile | null;
  roleLabel: string;
};

const THEME_ICON: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function loginHref(pathname: string): string {
  const next = pathname.startsWith("/admin") ? pathname : "/admin";
  return `/login?next=${encodeURIComponent(next)}`;
}

/**
 * Header sticky mọi trang `/admin/*`.
 * Cụm tài khoản = 1 pill mở menu (giống `UserAccountMenu` topbar).
 */
export function AdminTopbar({ profile, roleLabel }: Props) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [busy, setBusy] = useState<"out" | "switch" | null>(null);
  const [, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    setThemeMode(readThemeMode());
    function onDocClick(ev: MouseEvent) {
      if (!cardRef.current) return;
      if (cardRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    function onThemeChange(ev: Event) {
      const detail = (ev as CustomEvent<{ mode?: ThemeMode }>).detail;
      if (detail?.mode) setThemeMode(detail.mode);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    };
  }, [open]);

  async function leaveSession(mode: "out" | "switch") {
    if (busy) return;
    setBusy(mode);
    setOpen(false);
    try {
      clearAllClientCaches();
      clearAllWorldJourneyFirstImpressionSeen();
      clearRecentSearches();
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
      const dest = mode === "switch" ? loginHref(pathname) : "/";
      startTransition(() => {
        router.replace(dest);
        router.refresh();
      });
    } catch {
      setBusy(null);
    }
  }

  const displayName = profile?.tenHienThi?.trim() || profile?.slug || "Admin";
  const initials = profile
    ? getNameInitials(profile.tenHienThi, profile.slug)
    : "A";

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-row">
        <div className="admin-topbar-start">
          <p className="admin-topbar-kicker">CINs Admin</p>
          <h1 className="admin-topbar-title">Điều khiển nội bộ</h1>
        </div>

        <div className="admin-topbar-end">
          {!profile ? (
            <Link
              href={loginHref(pathname)}
              className="admin-topbar-btn is-primary"
              aria-label="Đăng nhập"
            >
              <LogIn size={15} strokeWidth={2.2} aria-hidden />
              <span>Đăng nhập</span>
            </Link>
          ) : (
            <div
              className={`admin-user${open ? " open" : ""}`}
              ref={cardRef}
            >
              {open ? (
                <div
                  className="admin-user-menu"
                  role="menu"
                  id={menuId}
                  aria-label="Tài khoản admin"
                >
                  <Link
                    href={webHref(`/${profile.slug}`)}
                    className="app-user-menu-item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <span className="app-user-menu-ico" aria-hidden>
                      <span className="admin-user-menu-ava">
                        {profile.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.avatarUrl} alt="" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </span>
                    </span>
                    <span className="admin-user-menu-copy">
                      <strong>{displayName}</strong>
                      <small>
                        @{profile.slug} · {roleLabel}
                      </small>
                    </span>
                  </Link>

                  <div
                    className="app-user-theme"
                    role="radiogroup"
                    aria-label="Chế độ giao diện"
                  >
                    {THEME_MODE_OPTIONS.map((opt) => {
                      const Icon = THEME_ICON[opt.value];
                      const active = themeMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={opt.label}
                          title={opt.label}
                          className={`app-user-theme-btn${active ? " on" : ""}`}
                          onClick={() => {
                            setThemeMode(opt.value);
                            persistThemeMode(opt.value);
                          }}
                        >
                          <Icon size={18} strokeWidth={1.7} aria-hidden />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="app-user-menu-item"
                    role="menuitem"
                    disabled={busy !== null}
                    onClick={() => void leaveSession("switch")}
                  >
                    <span className="app-user-menu-ico" aria-hidden>
                      <RefreshCw size={18} strokeWidth={1.7} />
                    </span>
                    <span>
                      {busy === "switch" ? "Đang chuyển…" : "Chuyển tài khoản"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="app-user-menu-item app-user-menu-item-danger"
                    role="menuitem"
                    disabled={busy !== null}
                    onClick={() => void leaveSession("out")}
                  >
                    <span className="app-user-menu-ico" aria-hidden>
                      <LogOut size={18} strokeWidth={1.7} />
                    </span>
                    <span>
                      {busy === "out"
                        ? "Đang thoát…"
                        : `Đăng xuất @${profile.slug}`}
                    </span>
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className="admin-user-pill"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((v) => !v)}
              >
                <span className="admin-user-ava" aria-hidden>
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="" />
                  ) : (
                    <span className="app-user-ava-fallback">{initials}</span>
                  )}
                </span>
                <span className="admin-user-meta">
                  <span className="admin-user-name">{displayName}</span>
                  <span className="admin-user-handle">@{profile.slug}</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

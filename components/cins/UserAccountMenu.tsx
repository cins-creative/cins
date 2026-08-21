"use client";

import {
  MessageSquarePlus,
  Monitor,
  Moon,
  PlusCircle,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/app/auth/sign-out-action";
import { HelpCenterModal } from "@/components/cins/HelpCenterModal";
import { SidebarNavIcon } from "@/components/cins/SidebarNavIcon";
import { UserAccountSettingsModal } from "@/components/cins/UserAccountSettingsModal";
import { OPEN_ACCOUNT_SETTINGS_EVENT } from "@/lib/cins/open-account-settings";
import { GopYModal } from "@/components/feedback/GopYModal";
import { clearAllClientCaches } from "@/lib/client-cache";
import { prefetchHuongDanCatalog } from "@/lib/huong-dan/catalog-client";
import { clearAllWorldJourneyFirstImpressionSeen } from "@/lib/cins/worldJourneyFirstImpression";
import { getNameInitials } from "@/lib/journey/profile";
import { clearRecentSearches } from "@/lib/search/recent-searches-storage";
import { useT } from "@/lib/i18n/use-t";
import {
  THEME_CHANGE_EVENT,
  THEME_MODE_OPTIONS,
  readThemeMode,
  setThemeMode as persistThemeMode,
  type ThemeMode,
} from "@/lib/theme/theme-mode";
import type { MessageKey } from "@/lib/i18n/messages";

const THEME_LABEL_KEY: Record<ThemeMode, MessageKey> = {
  light: "account.themeLight",
  dark: "account.themeDark",
  system: "account.themeSystem",
};

const THEME_ICON: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

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

export function UserAccountMenu({
  profile,
  placement = "sidebar",
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    "ban-hang" | undefined
  >(undefined);
  const [gopyOpen, setGopyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
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
    prefetchHuongDanCatalog();
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

  useEffect(() => {
    function onOpenSettings(ev: Event) {
      const section = (ev as CustomEvent<{ section?: string }>).detail?.section;
      if (section !== "ban-hang") return;
      setOpen(false);
      setSettingsSection("ban-hang");
      setSettingsOpen(true);
    }
    window.addEventListener(OPEN_ACCOUNT_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(OPEN_ACCOUNT_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  function chooseTheme(mode: ThemeMode) {
    setThemeMode(mode);
    persistThemeMode(mode);
  }

  return (
    <>
      <div className={`${rootClass}${open ? " open" : ""}`} ref={cardRef}>
      {open ? (
        <div
          className={menuClass}
          role="menu"
          id={menuId}
          aria-label={t("account.menuAria")}
        >
          <Link
            href={`/${profile.slug}`}
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="profile" />
            </span>
            <span>{t("account.profile")}</span>
          </Link>

          <Link
            href="/create-organization"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <PlusCircle size={18} strokeWidth={1.7} />
            </span>
            <span>{t("account.createOrg")}</span>
          </Link>
          <Link
            href="/community/create"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="community" />
            </span>
            <span>{t("account.createCommunity")}</span>
          </Link>

          <button
            type="button"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setSettingsSection(undefined);
              setSettingsOpen(true);
            }}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <SidebarNavIcon name="settings" />
            </span>
            <span>{t("account.settings")}</span>
          </button>
          <button
            type="button"
            className="app-user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setGopyOpen(true);
            }}
          >
            <span className="app-user-menu-ico" aria-hidden>
              <MessageSquarePlus size={18} strokeWidth={1.7} />
            </span>
            <span>{t("account.feedback")}</span>
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
            <span>{t("account.help")}</span>
          </button>

          <div
            className="app-user-theme"
            role="radiogroup"
            aria-label={t("account.themeAria")}
          >
            {THEME_MODE_OPTIONS.map((opt) => {
              const Icon = THEME_ICON[opt.value];
              const active = themeMode === opt.value;
              const label = t(THEME_LABEL_KEY[opt.value]);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  title={label}
                  className={`app-user-theme-btn${active ? " on" : ""}`}
                  onClick={() => chooseTheme(opt.value)}
                >
                  <Icon size={18} strokeWidth={1.7} aria-hidden />
                </button>
              );
            })}
          </div>

          <form
            action={signOutAction}
            className="app-user-menu-form"
            onSubmit={() => {
              clearAllClientCaches();
              clearAllWorldJourneyFirstImpressionSeen();
              clearRecentSearches();
            }}
          >
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
              <span>{t("account.signOut", { slug: profile.slug })}</span>
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
      <UserAccountSettingsModal
        open={settingsOpen}
        initialSection={settingsSection}
        onClose={() => {
          setSettingsOpen(false);
          setSettingsSection(undefined);
        }}
      />
      <GopYModal open={gopyOpen} onClose={() => setGopyOpen(false)} />
      <HelpCenterModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}

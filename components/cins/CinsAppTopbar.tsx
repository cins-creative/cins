import { Fragment } from "react";
import { Menu as MenuIcon } from "lucide-react";
import Link from "next/link";

import { OrgManagerButton } from "@/components/cins/OrgManagerButton";
import { UserAccountMenu } from "@/components/cins/UserAccountMenu";
import { JourneyNotifications } from "@/components/journey/JourneyNotifications";
import { ShopGioChungButton } from "@/components/shop/ShopGioChungButton";
import { ShopTopbarButton } from "@/components/shop/ShopTopbarButton";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadManagedEntities } from "@/lib/cins/managed-entities";
import { getAvatarUrl } from "@/lib/journey/profile";
import { webHref } from "@/lib/cins/manage-site";
import { getBanHangEnabled } from "@/lib/shop/settings";
import { countUnreadNotifications } from "@/lib/social/notifications";

/**
 * Topbar chính của site — render khác nhau theo trạng thái phiên:
 *
 * - **Chưa đăng nhập** → 2 link "Đăng nhập" (ghost) + "Đăng ký →" (gradient blue).
 * - **Đã đăng nhập**   → menu tài khoản (avatar + tên) bên phải topbar.
 *
 * Là async server component → đặt ở file riêng (sidebar `CinsAppSidebar` cần
 * `"use client"` vì dùng `usePathname`, không thể chung file).
 */
export async function CinsAppTopbar() {
  const session = await getCurrentSessionAndProfile();
  const isAuthed = !!session;
  const profileId = session?.profile?.id ?? null;

  const [unreadNotificationCount, banHangEnabled, managedEntities] = profileId
    ? await Promise.all([
        countUnreadNotifications(profileId).catch(() => 0),
        getBanHangEnabled(profileId).catch(() => false),
        loadManagedEntities(profileId).catch(() => []),
      ])
    : [0, false, [] as Awaited<ReturnType<typeof loadManagedEntities>>];

  const accountProfile =
    session?.profile?.slug
      ? {
          slug: session.profile.slug,
          tenHienThi: session.profile.ten_hien_thi,
          avatarUrl: getAvatarUrl(session.profile.avatar_id),
        }
      : null;

  const tbRightGroups: React.ReactNode[] = [];
  if (session?.profile) {
    /* Desktop: giỏ trong topbar. Mobile: portal floating (ShopGioChungButton). */
    tbRightGroups.push(
      <div className="tb-right-group tb-group-gio" key="gio">
        <ShopGioChungButton />
      </div>,
    );
    /* Mobile botbar ô 2 — desktop ẩn bằng CSS. */
    tbRightGroups.push(
      <div className="tb-right-group tb-group-org" key="org">
        <OrgManagerButton entities={managedEntities} />
      </div>,
    );
  }
  if (session?.profile && banHangEnabled) {
    tbRightGroups.push(
      <div className="tb-right-group tb-group-shop" key="shop">
        <ShopTopbarButton />
      </div>,
    );
  }
  if (session?.profile) {
    tbRightGroups.push(
      <div className="tb-right-group tb-group-notify" key="notify">
        <JourneyNotifications
          initialUnreadCount={unreadNotificationCount}
          viewerProfileId={session.profile.id}
        />
      </div>,
    );
  }
  if (accountProfile) {
    tbRightGroups.push(
      <div className="tb-right-group tb-group-account" key="account">
        <UserAccountMenu profile={accountProfile} placement="topbar" />
      </div>,
    );
  }

  return (
    <nav
      className={["topbar", "cins-app-topbar", isAuthed ? "is-authed" : ""]
        .filter(Boolean)
        .join(" ")}
      id="app-topbar"
    >
      <div className="topbar-inner">
        <div className="tb-left">
          <button
            type="button"
            className="tb-burger"
            id="app-tb-burger"
            aria-label="Mở menu"
          >
            <MenuIcon size={20} strokeWidth={1.8} aria-hidden />
          </button>
          {/* Page-specific chrome (ban-hang toggles, trường admin, cộng đồng…) — align trái */}
          <div
            id="app-topbar-page-slot"
            className="tb-page-slot"
            aria-live="polite"
          />
        </div>
        <div
          className="tb-chat-slot"
          id="app-topbar-chat-slot"
          aria-hidden={!isAuthed}
        />
        <div className="tb-right">
          {tbRightGroups.map((group, i) => (
            <Fragment key={i}>
              {i > 0 ? <span className="tb-divider" aria-hidden /> : null}
              {group}
            </Fragment>
          ))}
          {isAuthed ? null : (
            <>
              <span className="tb-divider" aria-hidden />
              <div className="tb-auth">
                <Link href={webHref("/login")} className="tb-login">
                  Đăng nhập
                </Link>
                <Link href={webHref("/login?auto=register")} className="tb-signup">
                  Đăng ký <span aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

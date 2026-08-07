import { Fragment } from "react";
import { Menu as MenuIcon } from "lucide-react";
import Link from "next/link";

import { AdminInboxButton } from "@/components/admin/AdminInboxButton";
import { UserAccountMenu } from "@/components/cins/UserAccountMenu";
import { JourneyNotifications } from "@/components/journey/JourneyNotifications";
import { ShopGioChungButton } from "@/components/shop/ShopGioChungButton";
import { ShopTopbarButton } from "@/components/shop/ShopTopbarButton";
import { countAdminInboxStats } from "@/lib/admin/admin-inbox-stats";
import { EMPTY_ADMIN_INBOX_STATS } from "@/lib/admin/admin-inbox-stats-types";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/journey/profile";
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

  const [unreadNotificationCount, isCinsAdmin, banHangEnabled] = profileId
    ? await Promise.all([
        countUnreadNotifications(profileId).catch(() => 0),
        getCurrentUserIsCinsAdmin(),
        getBanHangEnabled(profileId).catch(() => false),
      ])
    : [0, false, false];

  const adminInboxStats = isCinsAdmin
    ? await countAdminInboxStats().catch(() => EMPTY_ADMIN_INBOX_STATS)
    : null;

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
    tbRightGroups.push(
      <div className="tb-right-group" key="shop">
        <ShopGioChungButton />
        {banHangEnabled ? <ShopTopbarButton /> : null}
      </div>,
    );
  }
  if (adminInboxStats) {
    tbRightGroups.push(
      <div className="tb-right-group" key="admin">
        <AdminInboxButton initialStats={adminInboxStats} />
      </div>,
    );
  }
  if (session?.profile) {
    tbRightGroups.push(
      <div className="tb-right-group" key="notify">
        <JourneyNotifications
          initialUnreadCount={unreadNotificationCount}
          viewerProfileId={session.profile.id}
        />
      </div>,
    );
  }
  if (accountProfile) {
    tbRightGroups.push(
      <div className="tb-right-group" key="account">
        <UserAccountMenu profile={accountProfile} placement="topbar" />
      </div>,
    );
  }

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
            <MenuIcon size={20} strokeWidth={1.8} aria-hidden />
          </button>
          {/* Page-specific chrome (ban-hang toggles, trường admin, cộng đồng…) — align trái */}
          <div
            id="app-topbar-page-slot"
            className="tb-page-slot"
            aria-live="polite"
          />
        </div>
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
                <Link href="/login" className="tb-login">
                  Đăng nhập
                </Link>
                <Link href="/login?auto=register" className="tb-signup">
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

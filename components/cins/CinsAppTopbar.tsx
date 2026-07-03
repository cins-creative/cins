import { Suspense } from "react";
import { Menu as MenuIcon } from "lucide-react";
import Link from "next/link";

import { CinsTopbarSearch } from "@/components/cins/CinsTopbarSearch";
import { SessionRestorer } from "@/components/cins/SessionRestorer";
import { UserAccountMenu } from "@/components/cins/UserAccountMenu";
import { JourneyNotifications } from "@/components/journey/JourneyNotifications";
import {
  getSwitchableAccounts,
  hasRestoreHint,
  readAccountVault,
} from "@/lib/auth/account-vault";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/journey/profile";
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
  const unreadNotificationCount = session?.profile
    ? await countUnreadNotifications(session.profile.id).catch(() => 0)
    : 0;
  const accountProfile =
    session?.profile?.slug
      ? {
          slug: session.profile.slug,
          tenHienThi: session.profile.ten_hien_thi,
          avatarUrl: getAvatarUrl(session.profile.avatar_id),
        }
      : null;
  const switchableAccounts = accountProfile
    ? await getSwitchableAccounts(accountProfile.slug)
    : [];

  /* Khách nhưng kho còn tài khoản + hint bật → thử khôi phục phiên mặc định. */
  const canRestore =
    !isAuthed &&
    (await hasRestoreHint()) &&
    (await readAccountVault()).length > 0;

  return (
    <nav className="topbar cins-app-topbar" id="app-topbar">
      {canRestore ? <SessionRestorer canRestore /> : null}
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
          <Suspense
            fallback={
              <div className="tb-search tb-search--fallback" aria-hidden>
                <span className="tb-search-icon" />
                <span className="tb-search-ph" />
              </div>
            }
          >
            <CinsTopbarSearch />
          </Suspense>
        </div>
        <div className="tb-right">
          <div
            id="app-topbar-page-slot"
            className="tb-page-slot"
            aria-live="polite"
          />
          {session?.profile ? (
            <JourneyNotifications
              initialUnreadCount={unreadNotificationCount}
              viewerProfileId={session.profile.id}
            />
          ) : null}
          {accountProfile ? (
            <UserAccountMenu
              profile={accountProfile}
              placement="topbar"
              savedAccounts={switchableAccounts}
            />
          ) : null}
          {isAuthed || canRestore ? null : (
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

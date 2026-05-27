import { MessageCircleQuestion, Sparkles, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";

import { JourneyNotifications } from "@/components/journey/JourneyNotifications";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listFollowAcceptedNotifications,
  listPendingFollowRequests,
} from "@/lib/social/follow";

/**
 * Topbar chính của site — render khác nhau theo trạng thái phiên:
 *
 * - **Chưa đăng nhập** → 2 link "Đăng nhập" (ghost) + "Đăng ký →" (gradient blue).
 * - **Đã đăng nhập**   → KHÔNG hiển thị nút auth nào ở topbar; user đăng
 *   xuất qua kebab menu trên sidebar account card (`CinsAppSidebar`).
 *
 * Là async server component → đặt ở file riêng (sidebar `CinsAppSidebar` cần
 * `"use client"` vì dùng `usePathname`, không thể chung file).
 */
export async function CinsAppTopbar() {
  const session = await getCurrentSessionAndProfile();
  const isAuthed = !!session;
  const [followRequests, acceptedNotifications] = session?.profile
    ? await Promise.all([
        listPendingFollowRequests(session.profile.id),
        listFollowAcceptedNotifications(session.profile.id),
      ])
    : [[], []];

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
          <Link href="#" className="tb-quiz">
            <Sparkles size={16} strokeWidth={1.8} aria-hidden />
            <span>Quiz khám phá tính cách nghề</span>
          </Link>
        </div>
        <div className="tb-right">
          <Link href="#" className="tb-ask">
            <MessageCircleQuestion size={16} strokeWidth={1.6} aria-hidden />
            <span>Tư vấn nghề</span>
          </Link>
          {isAuthed ? (
            <JourneyNotifications
              initialFollowRequests={followRequests}
              initialAcceptedNotifications={acceptedNotifications}
            />
          ) : null}
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

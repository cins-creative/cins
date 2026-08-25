import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";

import "@/components/auth/auth-enter-overlay.css";

const SIDEBAR_SLOTS = 8;

/**
 * Skeleton tĩnh — không dùng CinsShell (async topbar/session) để click sang
 * `/{slug}` thấy khung ngay.
 */
export default function UserJourneyLoading() {
  return (
    <div
      className="cins-shell"
      data-screen-label="Journey"
      aria-busy="true"
      aria-label="Đang tải hồ sơ"
    >
      <aside className="sidebar cins-app-sidebar cins-auth-enter-sidebar" aria-hidden>
        <div className="sb-brand">
          <span className="j-skel cins-auth-enter-sb-ico" />
        </div>
        <ul className="sb-list">
          {Array.from({ length: SIDEBAR_SLOTS }, (_, i) => (
            <li key={i}>
              <span className="j-skel cins-auth-enter-sb-ico" />
            </li>
          ))}
        </ul>
      </aside>
      <div className="cins-shell-column">
        <nav className="topbar cins-app-topbar">
          <div className="topbar-inner">
            <div className="tb-left">
              <span className="j-skel cins-auth-enter-tb-ava" />
            </div>
            <div className="tb-right">
              <span className="j-skel cins-auth-enter-tb-ava" />
            </div>
          </div>
        </nav>
        <main className="cins-main">
          <JourneyProfilePageSkeleton />
        </main>
      </div>
    </div>
  );
}

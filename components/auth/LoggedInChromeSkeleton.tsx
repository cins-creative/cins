import { HomeWorldJourneySkeleton } from "@/components/cins/home-v2/HomeWorldJourney.skeleton";

import "./auth-enter-overlay.css";

const SIDEBAR_SLOTS = 8;

/**
 * Khung trang chủ logged-in (sidebar + topbar + feed skeleton).
 * Không dùng id `app-sidebar` / `app-topbar` — tránh đụng shell thật khi overlay.
 */
export function LoggedInChromeSkeleton() {
  return (
    <div
      className="cins-shell cins-auth-enter-chrome"
      data-screen-label="Trang-chu"
      aria-busy="true"
      aria-label="Đang vào trang chủ"
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
          <HomeWorldJourneySkeleton />
        </main>
      </div>
    </div>
  );
}

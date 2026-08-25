/** Skeleton topbar — không await session, để main stream song song. */
export function CinsAppTopbarFallback() {
  return (
    <nav className="topbar cins-app-topbar" id="app-topbar" aria-busy="true">
      <div className="topbar-inner">
        <div className="tb-left">
          <span className="j-skel cins-auth-enter-tb-ava" aria-hidden />
        </div>
        <div className="tb-right">
          <span className="j-skel cins-auth-enter-tb-ava" aria-hidden />
        </div>
      </div>
    </nav>
  );
}

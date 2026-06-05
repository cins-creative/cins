export function JourneyFriendsSectionSkeleton() {
  return (
    <section
      className="j-main-panel j-skel-main-panel"
      aria-busy="true"
      aria-label="Đang tải bạn bè"
    >
      <div className="j-main-panel-head">
        <div className="j-skel j-skel-panel-label" />
        <div className="j-skel j-skel-panel-count" />
      </div>
      <div className="j-skel-friends-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="j-skel j-skel-friend-card" />
        ))}
      </div>
    </section>
  );
}

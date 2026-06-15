export function PostArticleSkeleton() {
  return (
    <main
      className="cins-editor-page cins-post-view editor-canvas post-canvas post-canvas--split j-post-skel"
      aria-busy="true"
      aria-label="Đang tải bài viết"
    >
      <div className="post-view-layout post-view-layout--2col">
        <div className="post-view-content">
          <div className="j-post-skel-cover" />
          <div className="post-view-content-inner">
            <div className="j-post-skel-line j-post-skel-line--sm" />
            <div className="j-post-skel-title" />
            <div className="j-post-skel-line j-post-skel-line--lg" />
            <div className="j-post-skel-line j-post-skel-line--full" />
            <div className="j-post-skel-line j-post-skel-line--lg" />
            <div className="j-post-skel-line j-post-skel-line--md" />
          </div>
        </div>
        <aside className="post-view-rail" aria-hidden>
          <div className="post-rail-blk">
            <div className="j-post-skel-byline">
              <div className="j-post-skel-ava" />
              <div className="j-post-skel-meta">
                <div className="j-post-skel-line j-post-skel-line--md" />
                <div className="j-post-skel-line j-post-skel-line--sm" />
              </div>
            </div>
          </div>
          <div className="post-rail-div" />
          <div className="post-rail-blk">
            <div className="j-post-skel-line j-post-skel-line--md" />
            <div className="j-post-skel-line j-post-skel-line--md" />
          </div>
        </aside>
      </div>
    </main>
  );
}

export function PostCommentsSkeleton() {
  return (
    <section
      className="post-comments j-post-skel-comments"
      aria-busy="true"
      aria-label="Đang tải bình luận"
    >
      <div className="j-post-skel-line j-post-skel-line--sm" />
      <div className="j-post-skel-line j-post-skel-line--full" />
      <div className="j-post-skel-line j-post-skel-line--lg" />
    </section>
  );
}

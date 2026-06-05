export default function InterceptedPostModalLoading() {
  return (
    <div
      className="cins-editor-page cins-post-view j-post-skel"
      aria-busy="true"
      aria-live="polite"
    >
      <main className="editor-canvas post-canvas">
        <div className="j-post-skel-cover" />
        <div className="j-post-skel-byline">
          <div className="j-post-skel-ava" />
          <div className="j-post-skel-meta">
            <div className="j-post-skel-line j-post-skel-line--lg" />
            <div className="j-post-skel-line j-post-skel-line--sm" />
          </div>
        </div>
        <div className="j-post-skel-title" />
        <div className="j-post-skel-line j-post-skel-line--full" />
        <div className="j-post-skel-line j-post-skel-line--full" />
        <div className="j-post-skel-line j-post-skel-line--md" />
        <div className="j-post-skel-line j-post-skel-line--full" />
        <div className="j-post-skel-line j-post-skel-line--lg" />
      </main>
    </div>
  );
}

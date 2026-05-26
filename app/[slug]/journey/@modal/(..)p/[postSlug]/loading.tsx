import { PostModalShell } from "@/components/journey/PostModalShell";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Intercepted modal — loading skeleton                             ║
   ║                                                                  ║
   ║ Next.js sẽ render file này ngay khi user click trên Journey,    ║
   ║ trong lúc route chính (`page.tsx`) còn fetch detail. Quan trọng: ║
   ║ skeleton này nằm trong client router cache khi prefetch — nên   ║
   ║ click → overlay xuất hiện tức thì, không "đứng hình" chờ DB.    ║
   ║                                                                  ║
   ║ Block layout mô phỏng `JourneyPostBody` (cover · byline · body) ║
   ║ để chuyển transition vào nội dung thật mượt mà, tránh layout    ║
   ║ shift lớn khi data tới.                                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export default function InterceptedPostModalLoading() {
  return (
    <PostModalShell>
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
    </PostModalShell>
  );
}

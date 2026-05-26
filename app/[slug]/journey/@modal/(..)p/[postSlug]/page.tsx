import { loadPostBySlug } from "@/app/[slug]/journey/actions";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { PostModalShell } from "@/components/journey/PostModalShell";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Intercepted modal route — `/[slug]/p/[postSlug]` khi nav từ      ║
   ║ `/[slug]/journey`.                                                ║
   ║                                                                  ║
   ║ Convention `(..)`: nằm ở `[slug]/journey/@modal/(..)p/...` →     ║
   ║ intercept URL `/[slug]/p/[postSlug]` (lên một cấp từ journey,    ║
   ║ rồi xuống `p/[postSlug]`).                                       ║
   ║                                                                  ║
   ║ Render server-side (giống standalone) bằng `loadPostBySlug` rồi  ║
   ║ pass detail vào `JourneyPostBody` bọc trong `PostModalShell`     ║
   ║ (overlay portal client).                                         ║
   ║                                                                  ║
   ║ Khi user refresh hoặc share URL → KHÔNG còn match intercepted    ║
   ║ context → render `app/[slug]/p/[postSlug]/page.tsx` standalone.  ║
   ║                                                                  ║
   ║ Lưu ý: các CTA điều hướng tới `/p/new` (editor) phải dùng `<a>`  ║
   ║ thay vì `<Link>` → tránh kích hoạt soft-nav vào intercepting,    ║
   ║ vì `[postSlug]` sẽ bắt nhầm cả `"new"`.                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;

export default async function InterceptedPostModal({
  params,
}: {
  params: Params;
}) {
  const { slug, postSlug } = await params;
  const res = await loadPostBySlug(slug, postSlug);

  if (!res.ok) {
    /* Lỗi load — render modal với thông báo gọn (giữ overlay để user
       còn có nút đóng → router.back()). */
    return (
      <PostModalShell>
        <div className="j-post-err">
          <p>{res.error}</p>
        </div>
      </PostModalShell>
    );
  }

  const detail = res.data;
  const postSlugFromDb = detail.posts[0]?.slug ?? postSlug;

  return (
    <PostModalShell>
      <JourneyPostBody
        initialDetail={detail}
        postSlug={postSlugFromDb}
        isOwner={detail.viewerIsOwner}
        /* Trong modal: vẫn show link permalink để user mở tab riêng / share. */
        hideOpenLink={false}
      />
    </PostModalShell>
  );
}

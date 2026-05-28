import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { loadPostBySlug } from "@/app/[slug]/journey/actions";
import { CinsShell } from "@/components/cins/CinsShell";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ /[slug]/p/[postSlug] — URL bài viết riêng (share-able, SEO).     ║
   ║                                                                  ║
   ║ Server-side load `MilestonePostDetail` qua `loadPostBySlug`     ║
   ║ (resolve owner → tac_pham → cot_moc), apply visibility check    ║
   ║ rồi pass snapshot vào `JourneyPostBody` (shared với modal).      ║
   ║                                                                  ║
   ║ Quy tắc visibility:                                              ║
   ║   • public / feature / theo_nhom → ai cũng xem được             ║
   ║   • chi_minh → chỉ owner; guest gặp lỗi private (notFound 404).  ║
   ║                                                                  ║
   ║ Note: không cần auth required ở đây — guest xem được post công  ║
   ║ khai. Comment form sẽ ẩn nếu chưa login (xử lý trong body).      ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const res = await loadPostBySlug(slug, postSlug);

  if (!res.ok) {
    return {
      title: "Bài viết · CINS",
      description: "Bài viết trên CINs.",
      robots: { index: false, follow: false },
    };
  }

  const { milestone, owner, posts } = res.data;
  const title = milestone.tieuDe || posts[0]?.tieuDe || "Bài viết";
  const desc =
    milestone.moTa ||
    posts[0]?.moTa ||
    `Bài viết của ${owner.tenHienThi} trên CINs.`;
  const isPrivate = milestone.cheDoHienThi === "chi_minh";

  return {
    title: `${title} · ${owner.tenHienThi} · CINS`,
    description: desc.slice(0, 160),
    /* Bài private không index search. Featured/public/theo_nhom → index. */
    robots: isPrivate
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description: desc.slice(0, 200),
      type: "article",
      authors: [owner.tenHienThi],
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug, postSlug } = await params;
  const res = await loadPostBySlug(slug, postSlug);

  /* Bài public không tồn tại → 404 thẳng (đỡ leak structure). */
  if (!res.ok && res.error === "Người dùng không tồn tại.") notFound();
  if (!res.ok && res.error === "Bài viết không tồn tại.") notFound();
  if (!res.ok && res.error === "Bài viết chưa gắn vào cột mốc nào.") notFound();
  if (!res.ok && res.error === "Cột mốc không tồn tại hoặc đã bị xoá.") {
    notFound();
  }

  if (!res.ok) {
    /* Còn lại: chi_minh + not owner → hiển thị error card (không 404 để
       owner biết link đã có nhưng đang private). Guest chỉ thấy "không có
       quyền". */
    return (
      <CinsShell data-screen-label="Bài viết riêng tư">
        <div className="j-post-page">
          <div className="j-post-page-inner">
            <Link
              href={`/${slug}`}
              className="j-post-page-crumb"
              prefetch={false}
            >
              <ArrowLeft size={14} strokeWidth={2} aria-hidden />
              <span>Quay lại Journey của @{slug}</span>
            </Link>

            <div className="j-post-page-error">
              <h1>Bài viết không khả dụng</h1>
              <p>{res.error}</p>
              <Link href={`/${slug}`}>Quay lại trang Journey</Link>
            </div>
          </div>
        </div>
      </CinsShell>
    );
  }

  const detail = res.data;
  const postSlugFromDb = detail.posts[0]?.slug ?? postSlug;

  return (
    <CinsShell data-screen-label="Bài viết">
      <div className="j-post-page">
        <div className="j-post-page-inner">
          <Link
            href={`/${detail.owner.slug}`}
            className="j-post-page-crumb"
            prefetch={false}
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
            <span>Quay lại Journey của @{detail.owner.slug}</span>
          </Link>

          <JourneyPostBody
            initialDetail={detail}
            postSlug={postSlugFromDb}
            isOwner={detail.viewerIsOwner}
            /* Đang ở trang permalink rồi → ẩn link "Mở bài viết" (redundant). */
            hideOpenLink={true}
          />
        </div>
      </div>
    </CinsShell>
  );
}

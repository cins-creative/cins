import { notFound } from "next/navigation";

import { PostCommentsSuspense } from "@/app/[slug]/p/[postSlug]/_components/PostCommentsSection";
import { PostPageClientBridge } from "@/app/[slug]/p/[postSlug]/_components/PostPageClientBridge";
import { PostPageError } from "@/app/[slug]/p/[postSlug]/_components/PostPageError";
import { adminCoTheSuaBaiNickSeeding } from "@/lib/admin/seeding-nick";
import { getCurrentUserSystemRole } from "@/lib/auth/system-role";
import { getCachedPostPageCore } from "@/lib/journey/post-page-cache";

type Props = {
  slug: string;
  postSlug: string;
};

export async function PostPageArticle({ slug, postSlug }: Props) {
  const res = await getCachedPostPageCore(slug, postSlug);

  if (!res.ok && res.error === "Người dùng không tồn tại.") notFound();
  if (!res.ok && res.error === "Bài viết không tồn tại.") notFound();
  if (!res.ok && res.error === "Bài viết chưa gắn vào cột mốc nào.") notFound();
  if (!res.ok && res.error === "Cột mốc không tồn tại hoặc đã bị xoá.") {
    notFound();
  }

  if (!res.ok) {
    return <PostPageError error={res.error} ownerSlug={slug} />;
  }

  const detail = res.data;
  const postSlugFromDb = detail.posts[0]?.slug ?? postSlug;
  const adminSeedingEdit =
    !detail.viewerIsOwner
      ? await adminCoTheSuaBaiNickSeeding({
          role: await getCurrentUserSystemRole(),
          idNguoiDung: detail.owner.id,
        })
      : false;
  const manageAsOwner = detail.viewerIsOwner || adminSeedingEdit;

  return (
    <PostPageClientBridge
      ownerSlug={detail.owner.slug || slug}
      postSlug={postSlug}
      serverDetail={detail}
      postSlugFromDb={postSlugFromDb}
      isOwner={manageAsOwner}
      adminSeedingEdit={adminSeedingEdit}
      commentsSlot={
        <PostCommentsSuspense
          milestoneId={detail.milestone.id}
          contentOwnerId={detail.owner.id}
          viewerIsOwner={manageAsOwner}
          viewerCanComment={detail.viewerCanComment}
        />
      }
    />
  );
}

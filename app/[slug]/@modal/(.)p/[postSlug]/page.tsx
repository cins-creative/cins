import { loadPostBySlug } from "@/app/[slug]/journey/actions";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import { PostModalShell } from "@/components/journey/PostModalShell";

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
        hideOpenLink={false}
      />
    </PostModalShell>
  );
}

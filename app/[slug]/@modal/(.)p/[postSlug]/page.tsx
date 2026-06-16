import { getCachedPostBySlug } from "@/lib/journey/post-page-cache";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;
type SearchParams = Promise<{ owner?: string }>;

export default async function InterceptedPostModal({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug, postSlug } = await params;
  const query = await searchParams;
  const ownerSlug = query.owner?.trim() || slug;
  const res = await getCachedPostBySlug(ownerSlug, postSlug);

  if (!res.ok) {
    return (
      <div className="j-post-err">
        <p>{res.error}</p>
      </div>
    );
  }

  const detail = res.data;
  const postSlugFromDb = detail.posts[0]?.slug ?? postSlug;

  return (
    <JourneyPostBody
      initialDetail={detail}
      postSlug={postSlugFromDb}
      isOwner={detail.viewerIsOwner}
      hideOpenLink
      layout="split"
    />
  );
}

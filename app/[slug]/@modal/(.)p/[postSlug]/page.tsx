import { getCachedPostBySlug } from "@/lib/journey/post-page-cache";
import { formatPostLoadError } from "@/lib/journey/post-load-error";
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
  let res;
  try {
    res = await getCachedPostBySlug(ownerSlug, postSlug);
  } catch (err) {
    return (
      <div className="j-post-err">
        <p>{formatPostLoadError(err)}</p>
      </div>
    );
  }

  if (!res.ok) {
    return (
      <div className="j-post-err">
        <p>{formatPostLoadError(res.error)}</p>
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

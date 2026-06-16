import type { Metadata } from "next";
import { Suspense } from "react";

import { PostPageArticle } from "@/app/[slug]/p/[postSlug]/_components/PostPageArticle";
import { PostPageInstantFallback } from "@/app/[slug]/p/[postSlug]/_components/PostPageInstantFallback";
import { PostPageShell } from "@/app/[slug]/p/[postSlug]/_components/PostPageShell";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCachedPostPageCore } from "@/lib/journey/post-page-cache";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const res = await getCachedPostPageCore(slug, postSlug);

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

  return (
    <CinsShell data-screen-label="Bài viết">
      <div className="j-post-page">
        <div className="j-post-page-inner">
          <PostPageShell>
            <Suspense
              fallback={
                <PostPageInstantFallback ownerSlug={slug} postSlug={postSlug} />
              }
            >
              <PostPageArticle slug={slug} postSlug={postSlug} />
            </Suspense>
          </PostPageShell>
        </div>
      </div>
    </CinsShell>
  );
}

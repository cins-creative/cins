import type { Metadata } from "next";
import { Suspense } from "react";

import { PostPageArticle } from "@/app/[slug]/p/[postSlug]/_components/PostPageArticle";
import { PostPageInstantFallback } from "@/app/[slug]/p/[postSlug]/_components/PostPageInstantFallback";
import { PostPageShell } from "@/app/[slug]/p/[postSlug]/_components/PostPageShell";
import { CinsShell } from "@/components/cins/CinsShell";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getCachedPostPageCore } from "@/lib/journey/post-page-cache";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string; postSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const metadataBase = new URL(getConfiguredSiteOrigin() ?? "https://cins.vn");
  const res = await getCachedPostPageCore(slug, postSlug);

  if (!res.ok) {
    return {
      metadataBase,
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
  const shortDesc = desc.slice(0, 200);
  const pagePath = `/${encodeURIComponent(slug)}/p/${encodeURIComponent(postSlug)}`;
  const ogImagePath = `${pagePath}/opengraph-image`;

  return {
    metadataBase,
    title: `${title} · ${owner.tenHienThi} · CINS`,
    description: desc.slice(0, 160),
    robots: isPrivate
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description: shortDesc,
      type: "article",
      siteName: "CINs",
      locale: "vi_VN",
      url: pagePath,
      authors: [owner.tenHienThi],
      images: [{ url: ogImagePath, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: shortDesc,
      images: [ogImagePath],
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

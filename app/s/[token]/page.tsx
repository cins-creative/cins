import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShareLinkRedirect } from "@/app/s/[token]/ShareLinkRedirect";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { resolveShareLink } from "@/lib/journey/share-link";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

function publicOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

function targetWithToken(targetPath: string, token: string): string {
  const url = new URL(targetPath, publicOrigin());
  url.searchParams.set("s", token);
  return `${url.pathname}${url.search}`;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { token } = await params;
  const link = await resolveShareLink(token);
  if (!link) notFound();

  const shortUrl = `${publicOrigin()}/s/${encodeURIComponent(link.token)}`;
  return {
    metadataBase: new URL(publicOrigin()),
    title: link.title,
    description: link.description ?? "Khám phá nội dung này trên CINs.",
    robots: { index: false, follow: false },
    alternates: {
      canonical: targetWithToken(link.targetPath, link.token),
    },
    openGraph: {
      title: link.title,
      description: link.description ?? "Khám phá nội dung này trên CINs.",
      url: shortUrl,
      siteName: "CINs",
      locale: "vi_VN",
      type: "website",
      images: [
        {
          url: link.imageUrl,
          alt: link.title,
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: link.title,
      description: link.description ?? "Khám phá nội dung này trên CINs.",
      images: [
        {
          url: link.imageUrl,
          alt: link.title,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function ShareLinkPage({ params }: { params: Params }) {
  const { token } = await params;
  const link = await resolveShareLink(token);
  if (!link) notFound();
  const targetPath = targetWithToken(link.targetPath, link.token);

  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${targetPath}`} />
      </noscript>
      <ShareLinkRedirect targetPath={targetPath} />
    </>
  );
}

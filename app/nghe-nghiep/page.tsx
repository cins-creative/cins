import { Suspense } from "react";
import type { Metadata } from "next";

import { NgheNghiepHubLoader } from "@/app/nghe-nghiep/_components/NgheNghiepHubLoader";
import { NgheNghiepHubSkeleton } from "@/app/nghe-nghiep/_components/NgheNghiepHub.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import { buildPublicPageMetadata } from "@/lib/seo/build-article-metadata";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";

const HUB_TITLE = "Nghề nghiệp — Khám phá ngành sáng tạo thị giác | CINs";
const HUB_DESCRIPTION =
  "Danh sách nghề nghiệp trong ngành sáng tạo thị giác tại Việt Nam — phim, game, hoạt hình, thiết kế và hơn thế nữa.";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  linh_vuc?: string;
  q?: string;
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasQuery = Boolean(sp.q?.trim());

  return buildPublicPageMetadata({
    path: NGHE_NGHIEP_HUB_PATH,
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    ogImagePath: `${NGHE_NGHIEP_HUB_PATH}/opengraph-image`,
    ogType: "website",
    noIndex: hasQuery,
  });
}

export default async function NgheNghiepIndexPage(props: {
  searchParams: SearchParams;
}) {
  const sp = await props.searchParams;
  const listParams = {
    linh_vuc: sp.linh_vuc,
    q: sp.q,
  };

  return (
    <CinsShell data-screen-label="Nghe-nghiep-index">
      <JsonLdScript
        data={collectionPageJsonLd({
          name: "Khám phá nghề",
          description: HUB_DESCRIPTION,
          urlPath: NGHE_NGHIEP_HUB_PATH,
        })}
      />
      <Suspense
        key={`${listParams.linh_vuc ?? ""}|${listParams.q ?? ""}`}
        fallback={<NgheNghiepHubSkeleton />}
      >
        <NgheNghiepHubLoader params={listParams} />
      </Suspense>
      <SiteFooter />
    </CinsShell>
  );
}

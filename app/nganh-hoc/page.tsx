import { Suspense } from "react";
import type { Metadata } from "next";

import { NganhHocHubLoader } from "@/app/nganh-hoc/_components/NganhHocHubLoader";
import { NganhHocHubSkeleton } from "@/app/nganh-hoc/_components/NganhHocHub.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { NGANH_HOC_HUB_PATH } from "@/lib/cins/hubPaths";
import { buildPublicPageMetadata } from "@/lib/seo/build-article-metadata";
import { collectionPageJsonLd } from "@/lib/seo/json-ld";

const HUB_TITLE = "Ngành học — Chọn đúng ngành đại học | CINs";
const HUB_DESCRIPTION =
  "Mã ngành, khối thi và nhóm ngành — tra cứu nhanh trước khi chọn trường. Mỗi ngành có trang chi tiết với môn học, nghề liên quan và danh sách trường đào tạo.";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  nhom?: string;
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasQuery = Boolean(sp.q?.trim());

  return buildPublicPageMetadata({
    path: NGANH_HOC_HUB_PATH,
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    ogType: "website",
    noIndex: hasQuery,
  });
}

export default async function NganhHocIndexPage(props: {
  searchParams: SearchParams;
}) {
  const sp = await props.searchParams;
  const listParams = { q: sp.q, nhom: sp.nhom };

  return (
    <CinsShell data-screen-label="Nganh-hoc-index">
      <JsonLdScript
        data={collectionPageJsonLd({
          name: "Ngành học",
          description: HUB_DESCRIPTION,
          urlPath: NGANH_HOC_HUB_PATH,
        })}
      />
      <Suspense
        key={`${listParams.q ?? ""}|${listParams.nhom ?? ""}`}
        fallback={<NganhHocHubSkeleton />}
      >
        <NganhHocHubLoader params={listParams} />
      </Suspense>
      <SiteFooter />
    </CinsShell>
  );
}

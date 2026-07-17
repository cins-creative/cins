import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { buildJourneyMetadata } from "@/app/[slug]/_lib/build-journey-metadata";
import { CinsShell } from "@/components/cins/CinsShell";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{
  welcome?: string;
  view?: string;
  compose?: string;
  edit?: string;
  nhom?: string;
  filter?: string;
  display?: string;
  s?: string;
}>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  return buildJourneyMetadata(slug, {
    view: sp.view,
    nhom: sp.nhom,
    filter: sp.filter,
    s: sp.s,
  });
}

export default async function JourneyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <CinsShell data-screen-label="Journey">
      <Suspense fallback={<JourneyProfilePageSkeleton />}>
        <JourneyProfilePageLoader params={params} searchParams={searchParams} />
      </Suspense>
    </CinsShell>
  );
}

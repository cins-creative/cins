import type { Metadata } from "next";
import { Suspense } from "react";

import { JourneyProfilePageLoader } from "@/app/[slug]/_components/JourneyProfilePageLoader";
import { JourneyProfilePageSkeleton } from "@/app/[slug]/_components/JourneyProfilePage.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Journey · ${slug} · CINS`,
    description: `Hành trình sáng tạo của ${slug} trên CINS.`,
    robots: { index: false, follow: false },
  };
}
type SearchParams = Promise<{
  welcome?: string;
  view?: string;
  compose?: string;
  edit?: string;
}>;

export async function renderJourneyPage({
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

export default renderJourneyPage;

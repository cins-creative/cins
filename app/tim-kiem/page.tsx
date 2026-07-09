import { Suspense } from "react";
import type { Metadata } from "next";

import { TimKiemLoader } from "@/app/tim-kiem/_components/TimKiemLoader";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

export const metadata: Metadata = {
  title: "Tìm kiếm | CINs",
  description:
    "Tìm nghề nghiệp, ngành học, trường, cơ sở đào tạo, studio, người dùng và bài viết công khai trên CINs.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  kind?: string;
}>;

function TimKiemSkeleton() {
  return (
    <div className="tk-page tk-page--loading" aria-busy="true">
      <div className="tk-hero tk-hero--skeleton" />
      <div className="tk-section tk-section--skeleton" />
    </div>
  );
}

export default async function TimKiemPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const q = sp.q ?? "";
  const kind = sp.kind ?? "all";

  return (
    <CinsShell data-screen-label="Tim-kiem">
      <Suspense key={q} fallback={<TimKiemSkeleton />}>
        <TimKiemLoader q={q} kind={kind} />
      </Suspense>
      <SiteFooter />
    </CinsShell>
  );
}

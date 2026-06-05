import { Suspense } from "react";
import type { Metadata } from "next";

import { NgheNghiepHubLoader } from "@/app/nghe-nghiep/_components/NgheNghiepHubLoader";
import { NgheNghiepHubSkeleton } from "@/app/nghe-nghiep/_components/NgheNghiepHub.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

export const metadata: Metadata = {
  title: "Nghề nghiệp — Khám phá ngành sáng tạo thị giác | CINs",
  description:
    "Danh sách nghề nghiệp trong ngành sáng tạo thị giác tại Việt Nam — phim, game, hoạt hình, thiết kế và hơn thế nữa.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  linh_vuc?: string;
  q?: string;
}>;

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

import { Suspense } from "react";
import type { Metadata } from "next";

import { NganhHocHubLoader } from "@/app/nganh-hoc/_components/NganhHocHubLoader";
import { NganhHocHubSkeleton } from "@/app/nganh-hoc/_components/NganhHocHub.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

export const metadata: Metadata = {
  title: "Ngành học — Chọn đúng ngành đại học | CINs",
  description:
    "Mã ngành, khối thi và nhóm ngành — tra cứu nhanh trước khi chọn trường. Mỗi ngành có trang chi tiết với môn học, nghề liên quan và danh sách trường đào tạo.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  nhom?: string;
}>;

export default async function NganhHocIndexPage(props: {
  searchParams: SearchParams;
}) {
  const sp = await props.searchParams;
  const listParams = { q: sp.q, nhom: sp.nhom };

  return (
    <CinsShell data-screen-label="Nganh-hoc-index">
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

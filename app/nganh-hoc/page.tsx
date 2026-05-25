import type { Metadata } from "next";

import { CareerHub } from "@/components/career/CareerHub";
import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";
import { getNganhAdminStatus } from "@/lib/nganh/article-admin";
import { loadNganhHubListing } from "@/lib/nganh/loadNganhHubListing";

export const metadata: Metadata = {
  title: "Ngành học — Chọn đúng ngành đại học | CINs",
  description:
    "Mã ngành, khối thi và nhóm ngành — tra cứu nhanh trước khi chọn trường. Mỗi ngành có trang chi tiết với môn học, nghề liên quan và danh sách trường đào tạo.",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  nhom?: string;
};

export default async function NganhHocIndexPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const listing = await loadNganhHubListing(sp);
  const canEdit = await getNganhAdminStatus("");

  return (
    <CinsShell data-screen-label="Nganh-hoc-index">
      <div className="career-page career-page--hub">
        <CareerHub
          tab="nganh-hoc"
          hubBase="/nganh-hoc"
          linhVucSidebarGroups={[]}
          activeLinhVuc={null}
          searchQuery={listing.searchQuery}
          groups={[]}
          tagGroups={[]}
          sampleCareers={[]}
          nganhSidebarGroups={listing.nganhSidebarGroups}
          activeNhomId={listing.activeNhomId}
          activeNhomLabel={listing.activeNhomLabel}
          nganhGroups={listing.nganhGroups}
          sampleNganh={listing.sampleNganh}
          nganhListError={listing.listError}
          nganhHubCanEdit={canEdit}
        />
      </div>
      <SiteFooter />
    </CinsShell>
  );
}

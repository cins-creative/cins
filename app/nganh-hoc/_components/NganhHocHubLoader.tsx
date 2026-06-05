import { CareerHub } from "@/components/career/CareerHub";
import { getNganhAdminStatus } from "@/lib/nganh/article-admin";
import { loadNganhHubListing } from "@/lib/nganh/loadNganhHubListing";
import type { NganhHubListingParams } from "@/lib/nganh/loadNganhHubListing";

type Props = {
  params: NganhHubListingParams;
};

export async function NganhHocHubLoader({ params }: Props) {
  const [listing, canEdit] = await Promise.all([
    loadNganhHubListing(params),
    getNganhAdminStatus(""),
  ]);

  return (
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
  );
}

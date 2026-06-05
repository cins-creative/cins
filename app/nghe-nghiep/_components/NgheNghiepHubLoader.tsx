import { CareerHub } from "@/components/career/CareerHub";
import { loadNgheNghiepHubListing } from "@/lib/career/loadNgheNghiepHubListing";
import type { NgheNghiepHubListingParams } from "@/lib/career/loadNgheNghiepHubListing";

type Props = {
  params: NgheNghiepHubListingParams;
};

export async function NgheNghiepHubLoader({ params }: Props) {
  const listing = await loadNgheNghiepHubListing(params);

  return (
    <div className="career-page career-page--hub">
      <CareerHub
        tab={listing.tab}
        linhVucSidebarGroups={listing.linhVucSidebarGroups}
        activeLinhVuc={listing.activeLinhVuc}
        searchQuery={listing.searchQuery}
        showLinhVucOnCards={Boolean(listing.searchQuery)}
        groups={listing.groups}
        tagGroups={listing.groups}
        sampleCareers={listing.sampleCareers}
        showFallbackNote={listing.showFallbackNote}
        detailPathPrefix="/nghe-nghiep"
        listError={listing.listError}
      />
    </div>
  );
}

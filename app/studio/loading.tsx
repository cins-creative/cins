import { CinsShell } from "@/components/cins/CinsShell";

import { StudioListingSkeleton } from "@/app/studio/_components/StudioListing.skeleton";

import "@/app/cins-truong-listing.css";

export default function StudioListingLoading() {
  return (
    <CinsShell data-screen-label="Studio-listing-loading">
      <StudioListingSkeleton />
    </CinsShell>
  );
}

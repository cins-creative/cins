import { CinsShell } from "@/components/cins/CinsShell";

import { TruongListingSkeleton } from "@/app/truong-dai-hoc/_components/TruongListing.skeleton";

export default function TruongDaiHocLoading() {
  return (
    <CinsShell data-screen-label="Truong-dai-hoc-loading">
      <TruongListingSkeleton />
    </CinsShell>
  );
}

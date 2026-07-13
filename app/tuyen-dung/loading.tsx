import { CinsShell } from "@/components/cins/CinsShell";
import { TuyenDungListingSkeleton } from "@/app/tuyen-dung/_components/TuyenDungListing.skeleton";

import "@/app/tuyen-dung-listing.css";

export default function Loading() {
  return (
    <CinsShell data-screen-label="Tuyen-dung-listing">
      <div className="tuyen-dung-page">
        <TuyenDungListingSkeleton />
      </div>
    </CinsShell>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";

import { StudioListingLoader } from "@/app/studio/_components/StudioListingLoader";
import { StudioListingSkeleton } from "@/app/studio/_components/StudioListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/cins-truong-listing.css";

export const metadata: Metadata = {
  title: "Studio & Doanh nghiệp — Ngành sáng tạo | CINs",
  description:
    "Danh sách studio, agency và doanh nghiệp ngành sáng tạo trên CINs — khám phá đội ngũ, dự án và cơ hội hợp tác.",
};

export const dynamic = "force-dynamic";

export default function StudioListingPage() {
  return (
    <CinsShell data-screen-label="Studio-listing">
      <Suspense fallback={<StudioListingSkeleton />}>
        <StudioListingLoader />
      </Suspense>
    </CinsShell>
  );
}

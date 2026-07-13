import { Suspense } from "react";
import type { Metadata } from "next";

import { StudioListingLoader } from "@/app/studio/_components/StudioListingLoader";
import { StudioListingSkeleton } from "@/app/studio/_components/StudioListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/cins-truong-listing.css";

const HUB_TITLE = "Studio & Doanh nghiệp — Ngành sáng tạo | CINs";
const HUB_DESC =
  "Danh sách studio, agency và doanh nghiệp ngành sáng tạo trên CINs — khám phá đội ngũ, dự án và cơ hội hợp tác.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/studio",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/studio/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/studio/opengraph-image"],
  },
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

import { Suspense } from "react";
import type { Metadata } from "next";

import { ToChucListingLoader } from "@/app/organizations/_components/ToChucListingLoader";
import { ToChucListingSkeleton } from "@/app/organizations/_components/ToChucListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/cins-truong-listing.css";

const HUB_TITLE = "Tổ chức — Trường, cơ sở đào tạo & studio | CINs";
const HUB_DESC =
  "Danh sách trường đại học, cơ sở đào tạo và studio ngành sáng tạo tại Việt Nam — khám phá chương trình, ngành đang tuyển và đội ngũ.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/organizations",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/organizations/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/organizations/opengraph-image"],
  },
};

export const dynamic = "force-dynamic";

export default function ToChucListingPage() {
  return (
    <CinsShell data-screen-label="To-chuc-listing">
      <Suspense fallback={<ToChucListingSkeleton />}>
        <ToChucListingLoader />
      </Suspense>
    </CinsShell>
  );
}

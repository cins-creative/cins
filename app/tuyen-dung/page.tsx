import { Suspense } from "react";
import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { TuyenDungListingLoader } from "@/app/tuyen-dung/_components/TuyenDungListingLoader";
import { TuyenDungListingSkeleton } from "@/app/tuyen-dung/_components/TuyenDungListing.skeleton";

import "@/app/tuyen-dung-listing.css";

const HUB_TITLE = "Tuyển dụng ngành sáng tạo | CINs";
const HUB_DESC =
  "Tổng hợp tin tuyển dụng đang mở từ studio, agency và doanh nghiệp ngành sáng tạo trên CINs — vị trí, mức lương, nơi làm và hạn nộp.";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESC,
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/tuyen-dung",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: [{ url: "/tuyen-dung/opengraph-image", alt: HUB_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HUB_TITLE,
    description: HUB_DESC,
    images: ["/tuyen-dung/opengraph-image"],
  },
};

export const dynamic = "force-dynamic";

export default function TuyenDungPage() {
  return (
    <CinsShell data-screen-label="Tuyen-dung-listing">
      <div className="tuyen-dung-page">
        <Suspense fallback={<TuyenDungListingSkeleton />}>
          <TuyenDungListingLoader />
        </Suspense>
      </div>
    </CinsShell>
  );
}

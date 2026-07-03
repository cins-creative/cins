import { Suspense } from "react";
import type { Metadata } from "next";

import { CinsShell } from "@/components/cins/CinsShell";
import { TuyenDungListingLoader } from "@/app/tuyen-dung/_components/TuyenDungListingLoader";
import { TuyenDungListingSkeleton } from "@/app/tuyen-dung/_components/TuyenDungListing.skeleton";

import "@/app/tuyen-dung-listing.css";

export const metadata: Metadata = {
  title: "Tuyển dụng ngành sáng tạo | CINs",
  description:
    "Tổng hợp tin tuyển dụng đang mở từ studio, agency và doanh nghiệp ngành sáng tạo trên CINs — vị trí, mức lương, nơi làm và hạn nộp.",
};

export const dynamic = "force-dynamic";

export default function TuyenDungPage() {
  return (
    <CinsShell data-screen-label="Tuyen-dung-listing">
      <div className="tuyen-dung-page">
        <header className="tuyen-dung-hero">
          <span className="tuyen-dung-eyebrow">Cơ hội nghề nghiệp</span>
          <h1 className="tuyen-dung-title">Tuyển dụng ngành sáng tạo</h1>
          <p className="tuyen-dung-sub">
            Tin tuyển dụng đang mở từ studio, agency và doanh nghiệp trên CINs.
          </p>
        </header>

        <Suspense fallback={<TuyenDungListingSkeleton />}>
          <TuyenDungListingLoader />
        </Suspense>
      </div>
    </CinsShell>
  );
}

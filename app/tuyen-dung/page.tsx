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
          <span className="tuyen-dung-hero-blob tuyen-dung-hero-blob--yellow" aria-hidden />
          <span className="tuyen-dung-hero-blob tuyen-dung-hero-blob--mint" aria-hidden />
          <div className="tuyen-dung-hero-inner">
            <p className="tuyen-dung-eyebrow">Cơ hội nghề nghiệp</p>
            <h1 className="tuyen-dung-title">
              Tuyển dụng <span className="tuyen-dung-title-accent">ngành sáng tạo</span>
            </h1>
            <p className="tuyen-dung-lead">
              Tin tuyển dụng đang mở từ studio, agency và doanh nghiệp ngành sáng
              tạo trên CINs — vị trí, mức lương, nơi làm và hạn nộp.
            </p>
          </div>
        </header>

        <div className="tuyen-dung-body">
          <Suspense fallback={<TuyenDungListingSkeleton />}>
            <TuyenDungListingLoader />
          </Suspense>
        </div>
      </div>
    </CinsShell>
  );
}

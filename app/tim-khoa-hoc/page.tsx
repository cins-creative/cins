import { Suspense } from "react";
import type { Metadata } from "next";

import { KhoaHocListingLoader } from "@/app/tim-khoa-hoc/_components/KhoaHocListingLoader";
import { KhoaHocListingSkeleton } from "@/app/tim-khoa-hoc/_components/KhoaHocListing.skeleton";
import { CinsShell } from "@/components/cins/CinsShell";

import "@/app/khoa-hoc-listing.css";

export const metadata: Metadata = {
  title: "Tìm khóa học | CINs",
  description:
    "Khóa học online & offline từ cơ sở đào tạo ngành sáng tạo — từ nhập môn cho học sinh đến chuyên sâu cho người đi làm.",
};

export const dynamic = "force-dynamic";

export default function TimKhoaHocPage() {
  return (
    <CinsShell data-screen-label="Tim-khoa-hoc-listing">
      <div className="tkh-page">
        <header className="tkh-hero">
          <span className="tkh-hero-blob tkh-hero-blob--mint" aria-hidden />
          <span className="tkh-hero-blob tkh-hero-blob--blue" aria-hidden />
          <div className="tkh-hero-inner">
            <p className="tkh-eyebrow">Học nghề sáng tạo</p>
            <h1 className="tkh-title">
              Tìm <span className="tkh-title-accent">khóa học</span>
            </h1>
            <p className="tkh-lead">
              Khóa học online &amp; offline từ cơ sở đào tạo trên CINs — từ
              nhập môn cho học sinh đến chuyên sâu cho người đi làm.
            </p>
          </div>
        </header>

        <div className="tkh-body">
          <Suspense fallback={<KhoaHocListingSkeleton />}>
            <KhoaHocListingLoader />
          </Suspense>
        </div>
      </div>
    </CinsShell>
  );
}

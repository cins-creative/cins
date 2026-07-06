import { CinsShell } from "@/components/cins/CinsShell";
import { KhoaHocListingSkeleton } from "@/app/tim-khoa-hoc/_components/KhoaHocListing.skeleton";

import "@/app/khoa-hoc-listing.css";

export default function Loading() {
  return (
    <CinsShell data-screen-label="Tim-khoa-hoc-listing">
      <div className="tkh-page">
        <header className="tkh-hero">
          <div className="tkh-hero-inner">
            <p className="tkh-eyebrow">Học nghề sáng tạo</p>
            <h1 className="tkh-title">Tìm khóa học</h1>
            <p className="tkh-lead">
              Khóa học online &amp; offline từ cơ sở đào tạo trên CINs.
            </p>
          </div>
        </header>
        <div className="tkh-body">
          <KhoaHocListingSkeleton />
        </div>
      </div>
    </CinsShell>
  );
}

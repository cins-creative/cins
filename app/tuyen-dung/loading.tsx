import { CinsShell } from "@/components/cins/CinsShell";
import { TuyenDungListingSkeleton } from "@/app/tuyen-dung/_components/TuyenDungListing.skeleton";

import "@/app/tuyen-dung-listing.css";

export default function Loading() {
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
        <TuyenDungListingSkeleton />
      </div>
    </CinsShell>
  );
}

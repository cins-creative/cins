import { CinsShell } from "@/components/cins/CinsShell";
import { TimKhoaHocHubSkeleton } from "@/app/tim-khoa-hoc/_components/TimKhoaHocHub.skeleton";

import "@/app/khoa-hoc-listing.css";
import "@/app/cins-huong-nghiep-hub.css";
export default function Loading() {
  return (
    <CinsShell data-screen-label="Tim-khoa-hoc-listing">
      <div className="tkh-page">
        <header className="tkh-hero">
          <div className="tkh-hero-inner">
            <p className="tkh-eyebrow">Học nghề sáng tạo</p>
            <h1 className="tkh-title">Học nghề sáng tạo</h1>
            <p className="tkh-lead">
              Khóa học từ cơ sở đào tạo và ngành đại học trên CINs.
            </p>
          </div>
        </header>
        <div className="tkh-body">
          <TimKhoaHocHubSkeleton />
        </div>
      </div>
    </CinsShell>
  );
}

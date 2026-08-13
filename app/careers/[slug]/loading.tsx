import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

export default function NgheNghiepLoading() {
  return (
    <CinsShell>
      <div className="career-page" aria-busy="true" aria-label="Đang tải">
        <div className="page career-page-inner career-loading-inner">
          <div className="career-loading-main">
            <div className="career-skeleton career-skeleton--hero" />
            <div className="career-skeleton career-skeleton--block" />
            <div className="career-skeleton career-skeleton--block" />
            <div className="career-skeleton career-skeleton--block short" />
          </div>
          <div className="career-loading-aside">
            <div className="career-skeleton career-skeleton--sidebar" />
          </div>
        </div>
      </div>
      <SiteFooter />
    </CinsShell>
  );
}

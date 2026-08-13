import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

export default function NganhChiTietLoading() {
  return (
    <CinsShell data-screen-label="Nganh-chi-tiet-loading">
      <div className="nganh-chi-tiet-page" aria-busy="true" aria-label="Đang tải ngành học">
        <div className="career-skeleton career-skeleton--hub-hero" />
        <div className="career-skeleton career-skeleton--block" />
        <div className="career-skeleton career-skeleton--block" />
        <div className="career-skeleton career-skeleton--block short" />
      </div>
      <SiteFooter />
    </CinsShell>
  );
}

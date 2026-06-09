import { CinsShell } from "@/components/cins/CinsShell";

export default function CoSoDetailLoading() {
  return (
    <CinsShell data-screen-label="Co-so-chi-tiet-loading">
      <div
        className="tdh-page tdh-page--v6 tdh-page--cso"
        aria-busy="true"
        aria-label="Đang tải cơ sở đào tạo"
      >
        <div className="tdh-skel tdh-skel-detail-cover" />
        <div className="tdh-skel tdh-skel-detail-bar" />
        <div className="tdh-skel tdh-skel-detail-tabs" />
        <div className="tdh-skel tdh-skel-detail-main" />
      </div>
    </CinsShell>
  );
}

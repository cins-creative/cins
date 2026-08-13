import { CinsShell } from "@/components/cins/CinsShell";

export default function TruongDetailLoading() {
  return (
    <CinsShell data-screen-label="Truong-chi-tiet-loading">
      <div className="tdh-page tdh-page--v6" aria-busy="true" aria-label="Đang tải trường">
        <div className="tdh-skel tdh-skel-detail-cover" />
        <div className="tdh-skel tdh-skel-detail-bar" />
        <div className="tdh-skel tdh-skel-detail-tabs" />
        <div className="tdh-skel tdh-skel-detail-main" />
      </div>
    </CinsShell>
  );
}

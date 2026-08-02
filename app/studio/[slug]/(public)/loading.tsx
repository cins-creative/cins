import { CinsShell } from "@/components/cins/CinsShell";

export default function StudioDetailLoading() {
  return (
    <CinsShell data-screen-label="Studio-chi-tiet-loading">
      <div
        className="tdh-page tdh-page--v6 tdh-page--cso tdh-page--studio"
        aria-busy="true"
        aria-label="Đang tải trang studio"
      >
        <div className="tdh-skel tdh-skel-detail-cover" />
        <div className="tdh-skel tdh-skel-detail-bar" />
        <div className="tdh-skel tdh-skel-detail-tabs" />
        <div className="tdh-skel tdh-skel-detail-main" />
      </div>
    </CinsShell>
  );
}

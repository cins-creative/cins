import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

import { NgheNghiepHubSkeleton } from "@/app/nghe-nghiep/_components/NgheNghiepHub.skeleton";

export default function NgheNghiepLoading() {
  return (
    <CinsShell data-screen-label="Nghe-nghiep-loading">
      <NgheNghiepHubSkeleton />
      <SiteFooter />
    </CinsShell>
  );
}

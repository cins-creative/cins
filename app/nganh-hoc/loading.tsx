import { CinsShell } from "@/components/cins/CinsShell";
import { SiteFooter } from "@/components/cins/SiteFooter";

import { NganhHocHubSkeleton } from "@/app/nganh-hoc/_components/NganhHocHub.skeleton";

export default function NganhHocLoading() {
  return (
    <CinsShell data-screen-label="Nganh-hoc-loading">
      <NganhHocHubSkeleton />
      <SiteFooter />
    </CinsShell>
  );
}

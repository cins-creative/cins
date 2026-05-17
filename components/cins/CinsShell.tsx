import type { ComponentPropsWithoutRef } from "react";

import {
  CinsAppSidebar,
  CinsAppTopbar,
  SiteNavEffects,
} from "@/components/cins/SiteNav";

export function CinsShell({
  children,
  ...shellProps
}: ComponentPropsWithoutRef<"div"> & { children: React.ReactNode }) {
  return (
    <div className="cins-shell" {...shellProps}>
      <SiteNavEffects />
      <CinsAppSidebar />
      <div className="cins-shell-column">
        <CinsAppTopbar />
        <main className="cins-main">{children}</main>
      </div>
    </div>
  );
}

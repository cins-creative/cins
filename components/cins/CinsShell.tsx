import type { ComponentPropsWithoutRef } from "react";

import { CinsAppTopbar } from "@/components/cins/CinsAppTopbar";
import {
  CinsAppSidebar,
  SiteNavEffects,
} from "@/components/cins/SiteNav";
/**
 * Async server component — sidebar nav + topbar (topbar tự fetch session cho
 * menu tài khoản và thông báo).
 */
export async function CinsShell({
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

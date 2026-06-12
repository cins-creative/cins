import type { ComponentPropsWithoutRef } from "react";

import { CinsAppTopbar } from "@/components/cins/CinsAppTopbar";
import { CinsShellNav } from "@/components/cins/CinsShellNav";

/**
 * Server shell — sidebar nav (client) + topbar (async server, session).
 */
export function CinsShell({
  children,
  ...shellProps
}: ComponentPropsWithoutRef<"div"> & { children: React.ReactNode }) {
  return (
    <div className="cins-shell" {...shellProps}>
      <CinsShellNav />
      <div className="cins-shell-column">
        <CinsAppTopbar />
        <main className="cins-main">{children}</main>
      </div>
    </div>
  );
}

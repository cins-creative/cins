import type { ComponentPropsWithoutRef } from "react";

import { CinsAppTopbar } from "@/components/cins/CinsAppTopbar";
import { CinsChatShellBridge } from "@/components/cins/CinsChatShellBridge";
import { CinsShellNav } from "@/components/cins/CinsShellNav";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

/**
 * Server shell — sidebar nav (client) + topbar (async server, session).
 */
export async function CinsShell({
  children,
  ...shellProps
}: ComponentPropsWithoutRef<"div"> & { children: React.ReactNode }) {
  const session = await getCurrentSessionAndProfile();

  return (
    <div className="cins-shell" {...shellProps}>
      <CinsShellNav />
      <CinsChatShellBridge viewerProfileId={session?.profile?.id ?? null}>
        <div className="cins-shell-column">
          <CinsAppTopbar />
          <main className="cins-main">{children}</main>
        </div>
      </CinsChatShellBridge>
    </div>
  );
}

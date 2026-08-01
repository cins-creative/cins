import type { ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

import { CinsAppTopbar } from "@/components/cins/CinsAppTopbar";
import { CinsChatShellBridge } from "@/components/cins/CinsChatShellBridge";
import { CinsShellNav } from "@/components/cins/CinsShellNav";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

/**
 * Server shell — sidebar nav (client) + topbar (async server, session).
 */
export async function CinsShell({
  children,
  className,
  ...shellProps
}: ComponentPropsWithoutRef<"div"> & { children: React.ReactNode }) {
  const session = await getCurrentSessionAndProfile();
  const guestHomeAuthed =
    Boolean(session?.profile) &&
    typeof className === "string" &&
    className.includes("cins-shell--guest-home");

  return (
    <div
      className={clsx(
        "cins-shell",
        className,
        guestHomeAuthed && "cins-shell--guest-home-authed",
      )}
      {...shellProps}
    >
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

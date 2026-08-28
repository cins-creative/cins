import type { ComponentPropsWithoutRef } from "react";
import { Suspense } from "react";
import clsx from "clsx";

import { CinsAppTopbar } from "@/components/cins/CinsAppTopbar";
import { CinsAppTopbarFallback } from "@/components/cins/CinsAppTopbarFallback";
import { CinsChatShellBridge } from "@/components/cins/CinsChatShellBridge";
import { CinsShellNav } from "@/components/cins/CinsShellNav";
import { StaleTabReload } from "@/components/cins/StaleTabReload";
import { UserThemeRoot } from "@/components/cins/UserThemeRoot";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";

import "@/components/auth/auth-enter-overlay.css";
import "@/components/cins/user-shell-theme.css";

type ShellProps = ComponentPropsWithoutRef<"div"> & { children: React.ReactNode };

/**
 * Server shell — sidebar nav (client) + topbar (async, Suspense).
 * Trang guest-home vẫn await session (class authed + chat id).
 * Trang còn lại không await — chat id hydrate phía client nếu layout chưa có.
 */
export function CinsShell({ children, className, ...shellProps }: ShellProps) {
  const isGuestHome =
    typeof className === "string" && className.includes("cins-shell--guest-home");

  if (isGuestHome) {
    return (
      <CinsShellGuestHome className={className} {...shellProps}>
        {children}
      </CinsShellGuestHome>
    );
  }

  return (
    <CinsShellFrame className={className} viewerProfileId={null} {...shellProps}>
      {children}
    </CinsShellFrame>
  );
}

async function CinsShellGuestHome({
  children,
  className,
  ...shellProps
}: ShellProps) {
  const session = await getCurrentSessionAndProfile();
  const guestHomeAuthed = Boolean(session?.profile);

  return (
    <CinsShellFrame
      className={clsx(className, guestHomeAuthed && "cins-shell--guest-home-authed")}
      viewerProfileId={session?.profile?.id ?? null}
      {...shellProps}
    >
      {children}
    </CinsShellFrame>
  );
}

function CinsShellFrame({
  children,
  className,
  viewerProfileId,
  ...shellProps
}: ShellProps & { viewerProfileId: string | null }) {
  return (
    <div className={clsx("cins-shell", className)} {...shellProps}>
      <StaleTabReload />
      <UserThemeRoot />
      <CinsShellNav />
      <CinsChatShellBridge viewerProfileId={viewerProfileId}>
        <div className="cins-shell-column">
          <Suspense fallback={<CinsAppTopbarFallback />}>
            <CinsAppTopbar />
          </Suspense>
          <main className="cins-main">{children}</main>
        </div>
      </CinsChatShellBridge>
    </div>
  );
}

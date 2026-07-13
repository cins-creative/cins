"use client";

import type { ReactNode } from "react";

import {
  CinsChatProvider,
  useCinsChatContext,
} from "@/components/cins/CinsChatProvider";
import { VerifiedUsersProvider } from "@/components/cins/VerifiedUsersProvider";

export function CinsChatShellBridge({
  viewerProfileId,
  children,
}: {
  viewerProfileId: string | null;
  children: ReactNode;
}) {
  const existing = useCinsChatContext();
  if (existing) {
    return <VerifiedUsersProvider>{children}</VerifiedUsersProvider>;
  }

  return (
    <CinsChatProvider viewerProfileId={viewerProfileId}>
      <VerifiedUsersProvider>{children}</VerifiedUsersProvider>
    </CinsChatProvider>
  );
}

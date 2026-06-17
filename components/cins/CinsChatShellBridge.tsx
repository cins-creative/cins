"use client";

import type { ReactNode } from "react";

import { CinsChatProvider } from "@/components/cins/CinsChatProvider";

export function CinsChatShellBridge({
  viewerProfileId,
  children,
}: {
  viewerProfileId: string | null;
  children: ReactNode;
}) {
  return (
    <CinsChatProvider viewerProfileId={viewerProfileId}>{children}</CinsChatProvider>
  );
}

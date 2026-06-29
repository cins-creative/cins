"use client";

import type { ReactNode } from "react";

import {
  CinsChatProvider,
  useCinsChatContext,
} from "@/components/cins/CinsChatProvider";

export function CinsChatShellBridge({
  viewerProfileId,
  children,
}: {
  viewerProfileId: string | null;
  children: ReactNode;
}) {
  const existing = useCinsChatContext();
  if (existing) {
    return <>{children}</>;
  }

  return (
    <CinsChatProvider viewerProfileId={viewerProfileId}>{children}</CinsChatProvider>
  );
}

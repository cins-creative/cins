"use client";

import { useCallback, useEffect, useState } from "react";

import {
  focusOrgBaiDangPostOnTimeline,
  type OrgBaiDangView,
} from "@/lib/truong/bai-dang-grid";

export function useOrgBaiDangView() {
  const [view, setView] = useState<OrgBaiDangView>("timeline");
  const [pendingScrollPostId, setPendingScrollPostId] = useState<string | null>(
    null,
  );

  const openPostFromGrid = useCallback((postId: string) => {
    setPendingScrollPostId(postId);
    setView("timeline");
  }, []);

  useEffect(() => {
    if (view !== "timeline" || !pendingScrollPostId) return;
    focusOrgBaiDangPostOnTimeline(pendingScrollPostId);
    setPendingScrollPostId(null);
  }, [view, pendingScrollPostId]);

  return { view, setView, openPostFromGrid };
}

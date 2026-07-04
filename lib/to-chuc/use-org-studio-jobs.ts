"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudioJob } from "@/lib/to-chuc/studio-tuyen-dung-types";

/** Defer fetch jobs — không chặn TTFB loader trang org. */
export function useOrgStudioJobs(orgId: string, enabled = true) {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    if (!orgId?.trim()) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/to-chuc/${encodeURIComponent(orgId)}/tuyen-dung`,
        { credentials: "include", cache: "no-store" },
      );
      if (!res.ok) throw new Error("jobs fetch failed");
      const data = (await res.json()) as { jobs?: StudioJob[] };
      setJobs(data.jobs ?? []);
    } catch {
      setError(true);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return { jobs, loading, error, reload };
}

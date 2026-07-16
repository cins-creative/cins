"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import { orderTimelinePersonalFilters } from "@/lib/filter/default-personal-filters.shared";
import type { FilterLoaiDoiTuong } from "@/lib/filter/types";
import { dispatchMilestoneInlinePatch } from "@/lib/journey/milestone-inline-patch";

async function putMilestoneFilters(
  milestoneId: string,
  filterIds: string[],
  loaiDoiTuong?: FilterLoaiDoiTuong,
) {
  const res = await fetch(
    `/api/milestone/${encodeURIComponent(milestoneId)}/filters`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filterIds, loaiDoiTuong }),
    },
  );
  return res.ok;
}

function notifyTimelineChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cins:journey-timeline-changed"));
  window.dispatchEvent(new CustomEvent("cins:journey-gallery-sync"));
}

/** Gắn một nhãn lọc cá nhân (`filter_gan`) — tối đa 1 nhãn / cột mốc. */
export function useMilestonePersonalFilterAttach(
  milestoneId: string,
  attachedSlugs: string[],
  options?: {
    loaiDoiTuong?: FilterLoaiDoiTuong;
    enabled?: boolean;
  },
) {
  const router = useRouter();
  const ctx = useJourneyPersonalFilterOptional();
  const attachedSlug = attachedSlugs[0] ?? null;
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    attachedSlug ? [attachedSlug] : [],
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedSlugs((prev) => {
      const prevSlug = prev[0] ?? null;
      if (prevSlug === attachedSlug) return prev;
      return attachedSlug ? [attachedSlug] : [];
    });
  }, [attachedSlug]);

  const filters = orderTimelinePersonalFilters(ctx?.filters ?? [], {
    isOwner: ctx?.isOwner,
  });
  const enabled = options?.enabled ?? true;
  const canAttach = Boolean(ctx?.isOwner && filters.length > 0 && enabled);
  const selectedSlug = selectedSlugs[0] ?? null;

  const applySlugs = useCallback(
    (nextSlugs: string[], rollbackSlugs: string[]) => {
      setSelectedSlugs(nextSlugs);
      const toRefs = (slugs: string[]) =>
        slugs
          .map((s) => filters.find((f) => f.slug === s))
          .filter(Boolean)
          .map((f) => ({
            id: f!.id,
            slug: f!.slug,
            ten: f!.ten,
            mau: f!.mau,
          }));
      dispatchMilestoneInlinePatch({
        milestoneId,
        kind: "personalFilters",
        value: nextSlugs,
        personalFilters: toRefs(nextSlugs),
      });

      const nextIds = nextSlugs
        .map((s) => filters.find((f) => f.slug === s)?.id)
        .filter(Boolean) as string[];

      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const ok = await putMilestoneFilters(
            milestoneId,
            nextIds,
            options?.loaiDoiTuong,
          );
          if (!ok) {
            setSelectedSlugs(rollbackSlugs);
            dispatchMilestoneInlinePatch({
              milestoneId,
              kind: "personalFilters",
              value: rollbackSlugs,
              personalFilters: toRefs(rollbackSlugs),
            });
            resolve(false);
            return;
          }
          await ctx?.refreshFilters();
          notifyTimelineChanged();
          router.refresh();
          resolve(true);
        });
      });
    },
    [ctx, filters, milestoneId, options?.loaiDoiTuong, router],
  );

  const select = useCallback(
    (slug: string | null) => {
      if (!ctx?.isOwner || pending) return Promise.resolve(false);
      const previous = selectedSlugs;
      const nextSlugs = slug ? [slug] : [];
      if (previous[0] === nextSlugs[0]) return Promise.resolve(true);
      return applySlugs(nextSlugs, previous);
    },
    [applySlugs, ctx?.isOwner, pending, selectedSlugs],
  );

  const clear = useCallback(() => select(null), [select]);

  return {
    filters,
    selectedSlugs,
    selectedSlug,
    canAttach,
    select,
    clear,
    pending,
  };
}

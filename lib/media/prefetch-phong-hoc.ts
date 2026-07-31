"use client";

let prefetched = false;

/** Prefetch chunk PhongHocMeeting khi mở chat — tránh chờ dynamic import lúc bấm gọi. */
export function prefetchPhongHocMeeting(): void {
  if (typeof window === "undefined" || prefetched) return;
  prefetched = true;
  void import("@/components/media/PhongHocMeeting").catch(() => {
    prefetched = false;
  });
}

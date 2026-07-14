"use client";

import { useEffect, useState, type ReactNode } from "react";

import { OrgNotifyFab } from "@/components/org/OrgNotifyFab";

/** Khớp `@media (max-width: 1199.98px)` ẩn cột phải cạnh feed. */
const WJ_NOTIFY_FAB_MQ = "(max-width: 1199.98px)";

type Props = {
  /** Số sự kiện / mốc sắp tới — badge đỏ khi > 0. */
  count: number;
  children: ReactNode;
};

/**
 * Mobile/tablet: đưa card «Sự kiện & thông báo» vào drawer, nút lịch
 * portal vào `OrgNotifyFabHost` trong `wj-feed-header`.
 * Desktop: giữ children trong cột phải.
 */
export function WorldJourneyNotifyFab({ count, children }: Props) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(WJ_NOTIFY_FAB_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(WJ_NOTIFY_FAB_MQ);
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <OrgNotifyFab
      enabled={enabled}
      count={count}
      label="Sự kiện & thông báo"
      slot="notify"
    >
      {enabled ? (
        <div className="world-journey-home wj-notify-fab-panel">{children}</div>
      ) : (
        children
      )}
    </OrgNotifyFab>
  );
}

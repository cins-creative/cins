"use client";

import { Briefcase } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { OrgNotifyFab } from "@/components/org/OrgNotifyFab";

/** Khớp `@media (max-width: 1199.98px)` ẩn cột phải cạnh feed. */
const WJ_JOBS_FAB_MQ = "(max-width: 1199.98px)";

type Props = {
  /** Số tin tuyển dụng đang hiện — badge đỏ khi > 0. */
  count: number;
  children: ReactNode;
};

/**
 * Mobile/tablet: đưa card «Cơ hội cho bạn» vào drawer, nút briefcase
 * portal vào `OrgNotifyFabHost slot="jobs"` trong filter bar.
 * Desktop: giữ children trong cột phải.
 */
export function WorldJourneyJobsFab({ count, children }: Props) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(WJ_JOBS_FAB_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(WJ_JOBS_FAB_MQ);
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <OrgNotifyFab
      enabled={enabled}
      count={count}
      label="Cơ hội cho bạn"
      slot="jobs"
      icon={Briefcase}
    >
      {enabled ? (
        <div className="world-journey-home wj-notify-fab-panel">{children}</div>
      ) : (
        children
      )}
    </OrgNotifyFab>
  );
}

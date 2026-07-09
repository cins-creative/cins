"use client";

import { LayoutGrid, Rows3 } from "lucide-react";

import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";

type Props = {
  view: OrgBaiDangView;
  onViewChange: (view: OrgBaiDangView) => void;
};

export function OrgBaiDangViewToggle({ view, onViewChange }: Props) {
  return (
    <div className="org-baidang-view-toggle" role="group" aria-label="Chế độ xem">
      <button
        type="button"
        className={`obvt-btn${view === "timeline" ? " active" : ""}`}
        aria-label="Dòng thời gian"
        title="Dòng thời gian"
        aria-pressed={view === "timeline"}
        onClick={() => onViewChange("timeline")}
      >
        <Rows3 size={15} aria-hidden />
      </button>
      <button
        type="button"
        className={`obvt-btn${view === "grid" ? " active" : ""}`}
        aria-label="Lưới"
        title="Lưới"
        aria-pressed={view === "grid"}
        onClick={() => onViewChange("grid")}
      >
        <LayoutGrid size={15} aria-hidden />
      </button>
    </div>
  );
}

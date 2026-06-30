"use client";

import { LayoutGrid, Rows3 } from "lucide-react";

import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";

type Props = {
  view: OrgBaiDangView;
  onView: (view: OrgBaiDangView) => void;
};

/** Toggle timeline ↔ lưới cho bài đăng tổ chức (mirror World Journey). */
export function OrgBaiDangViewToggle({ view, onView }: Props) {
  return (
    <div className="org-baidang-view-toggle" role="group" aria-label="Chế độ xem">
      <button
        type="button"
        className={`obvt-btn${view === "timeline" ? " active" : ""}`}
        aria-label="Dòng thời gian"
        aria-pressed={view === "timeline"}
        title="Dòng thời gian"
        onClick={() => onView("timeline")}
      >
        <Rows3 size={15} />
      </button>
      <button
        type="button"
        className={`obvt-btn${view === "grid" ? " active" : ""}`}
        aria-label="Lưới"
        aria-pressed={view === "grid"}
        title="Lưới"
        onClick={() => onView("grid")}
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}

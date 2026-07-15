"use client";

import { Grid3X3, Waypoints } from "lucide-react";
import type { ReactNode } from "react";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";

type Props = {
  view: ContentSurfaceView;
  onViewChange: (view: ContentSurfaceView) => void;
  /** Prefetch khi hover/focus chế độ lưới (vd. Gallery Journey). */
  onPrefetchGrid?: () => void;
  className?: string;
  buttonClassName?: string;
  activeClassName?: string;
  /** class khi active — nối thêm vào buttonClassName. */
  ariaLabel?: string;
};

const VIEW_OPTIONS: ReadonlyArray<{
  id: ContentSurfaceView;
  label: string;
  icon: ReactNode;
}> = [
  {
    id: "timeline",
    label: "Dòng thời gian",
    icon: <Waypoints size={15} strokeWidth={2} aria-hidden />,
  },
  {
    id: "grid",
    label: "Dạng thẻ",
    icon: <Grid3X3 size={15} strokeWidth={2} aria-hidden />,
  },
  {
    id: "masonry",
    label: "Lưới gọn",
    icon: (
      <LayoutThumbIcon
        layout="masonry"
        variant="stroke"
        size={15}
        masonryColumns={2}
      />
    ),
  },
];

/**
 * Cụm 3 nút xem nội dung dùng chung: timeline · dạng thẻ · masonry.
 * Class mặc định khớp Journey / org (`.j-surface-view-toggle`).
 */
export function ContentSurfaceViewToggle({
  view,
  onViewChange,
  onPrefetchGrid,
  className = "j-surface-view-toggle",
  buttonClassName = "j-svt-btn",
  activeClassName = "active",
  ariaLabel = "Chế độ xem",
}: Props) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {VIEW_OPTIONS.map((opt) => {
        const isOn = view === opt.id;
        const prefetch =
          (opt.id === "grid" || opt.id === "masonry") && onPrefetchGrid
            ? {
                onMouseEnter: onPrefetchGrid,
                onFocus: onPrefetchGrid,
              }
            : undefined;
        return (
          <button
            key={opt.id}
            type="button"
            className={
              [buttonClassName, isOn ? activeClassName : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-label={opt.label}
            aria-pressed={isOn}
            title={opt.label}
            onClick={() => onViewChange(opt.id)}
            {...prefetch}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}

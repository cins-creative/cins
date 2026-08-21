"use client";

import { Grid3X3, Waypoints } from "lucide-react";
import type { ReactNode } from "react";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import { useT } from "@/lib/i18n/use-t";

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

const VIEW_ICONS: Record<ContentSurfaceView, ReactNode> = {
  timeline: <Waypoints size={15} strokeWidth={2} aria-hidden />,
  grid: <Grid3X3 size={15} strokeWidth={2} aria-hidden />,
  masonry: (
    <LayoutThumbIcon
      layout="masonry"
      variant="stroke"
      size={15}
      masonryColumns={2}
    />
  ),
};

const VIEW_KEYS = [
  { id: "timeline" as const, key: "surface.timeline" as const },
  { id: "grid" as const, key: "surface.grid" as const },
  { id: "masonry" as const, key: "surface.masonry" as const },
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
  ariaLabel,
}: Props) {
  const t = useT();
  const groupLabel = ariaLabel ?? t("surface.viewMode");
  return (
    <div className={className} role="group" aria-label={groupLabel}>
      {VIEW_KEYS.map((opt) => {
        const isOn = view === opt.id;
        const label = t(opt.key);
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
            aria-label={label}
            aria-pressed={isOn}
            title={label}
            onClick={() => onViewChange(opt.id)}
            {...prefetch}
          >
            {VIEW_ICONS[opt.id]}
          </button>
        );
      })}
    </div>
  );
}

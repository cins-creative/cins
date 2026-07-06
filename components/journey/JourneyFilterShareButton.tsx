"use client";

import { Share2 } from "lucide-react";

type Props = {
  /** Tên filter hiển thị trong tooltip / aria. */
  label: string;
  /** Logic chia sẻ — mở modal Gallery lọc theo view. */
  onShare?: () => void;
  disabled?: boolean;
};

/** Nút chia sẻ view Gallery theo dòng filter dropdown timeline / gallery. */
export function JourneyFilterShareButton({
  label,
  onShare,
  disabled = !onShare,
}: Props) {
  return (
    <button
      type="button"
      className="j-dd-share"
      onClick={(e) => {
        e.stopPropagation();
        onShare?.();
      }}
      title={`Chia sẻ view "${label}"`}
      aria-label={`Chia sẻ view ${label}`}
      disabled={disabled}
    >
      <Share2 size={12} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

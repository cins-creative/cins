"use client";

import { Share2 } from "lucide-react";

/** Nút chia sẻ icon-only trên sidebar org — logic chi tiết sẽ bổ sung sau. */
export function OrgSidebarShareButton() {
  return (
    <button
      type="button"
      className="cso-ss-btn-share"
      title="Chia sẻ"
      aria-label="Chia sẻ"
      disabled
    >
      <Share2 size={15} strokeWidth={2} aria-hidden />
    </button>
  );
}

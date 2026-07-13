"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import { JourneyProfileShareModal } from "@/components/journey/JourneyProfileShareModal";
import {
  dispatchJourneyShareOpen,
  getLiveGalleryItemsForShare,
} from "@/lib/journey/gallery-filter-share";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";

type Props = {
  shareProfile: JourneyShareProfile;
  viewerProfileId?: string | null;
  /** Nút icon-only (guest row) hoặc pill icon (owner sidebar). */
  variant?: "icon-row" | "sidebar-icon";
};

/**
 * Nút mở modal chia sẻ profile — dùng chung owner sidebar & guest action row.
 */
export function JourneyProfileShareTrigger({
  shareProfile,
  viewerProfileId = null,
  variant = "sidebar-icon",
}: Props) {
  const [open, setOpen] = useState(false);
  const [liveGalleryItems, setLiveGalleryItems] = useState<
    ReadonlyArray<GalleryMainItem>
  >([]);

  const openShare = () => {
    dispatchJourneyShareOpen();
    // Sidebar nằm ngoài FilterShareProvider — đọc snapshot module từ grid.
    setLiveGalleryItems(getLiveGalleryItemsForShare());
    setOpen(true);
  };

  const button =
    variant === "icon-row" ? (
      <button
        type="button"
        className="j-act-btn j-act-btn--icon"
        title="Chia sẻ"
        aria-label="Chia sẻ"
        onClick={openShare}
      >
        <Share2 size={17} strokeWidth={2} aria-hidden />
        <span className="j-act-btn-cap">Chia sẻ</span>
      </button>
    ) : (
      <button
        type="button"
        className="j-btn-icon"
        title="Chia sẻ Journey"
        aria-label="Chia sẻ"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          openShare();
        }}
      >
        <Share2 size={14} strokeWidth={1.8} aria-hidden />
      </button>
    );

  return (
    <>
      {button}
      <JourneyProfileShareModal
        open={open}
        onClose={() => setOpen(false)}
        profile={shareProfile}
        viewerProfileId={viewerProfileId}
        liveGalleryItems={liveGalleryItems}
        presentation="modal"
      />
    </>
  );
}

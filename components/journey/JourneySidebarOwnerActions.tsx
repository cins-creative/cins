"use client";

import { Pencil, Share2 } from "lucide-react";
import { useState } from "react";

import {
  JourneyEditProfileModal,
  type EditProfileInitial,
} from "@/components/journey/JourneyEditProfileModal";

type Props = {
  ownerSlug: string;
  initial: EditProfileInitial;
};

/**
 * Cụm 2 nút action của owner trên sidebar — "Chỉnh sửa hồ sơ" + "Chia sẻ".
 *
 * Tách riêng client component để JourneySidebar (server component) vẫn render
 * markup tĩnh, modal state nằm trong client-only boundary này.
 */
export function JourneySidebarOwnerActions({ ownerSlug, initial }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="j-profile-actions">
        <button
          type="button"
          className="j-btn-msg"
          onClick={() => setOpen(true)}
        >
          <Pencil size={14} strokeWidth={1.8} aria-hidden /> Chỉnh sửa hồ sơ
        </button>
        <button
          type="button"
          className="j-btn-icon"
          title="Chia sẻ Journey"
          disabled
          aria-label="Chia sẻ"
        >
          <Share2 size={14} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <JourneyEditProfileModal
        open={open}
        onClose={() => setOpen(false)}
        initial={initial}
        ownerSlug={ownerSlug}
      />
    </>
  );
}

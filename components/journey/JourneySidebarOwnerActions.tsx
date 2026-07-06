"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import {
  JourneyEditProfileModal,
  type EditProfileInitial,
} from "@/components/journey/JourneyEditProfileModal";
import { JourneyProfileShareTrigger } from "@/components/journey/JourneyProfileShareTrigger";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";

type Props = {
  ownerSlug: string;
  initial: EditProfileInitial;
  shareProfile: JourneyShareProfile;
  viewerProfileId?: string | null;
};

/**
 * Cụm 2 nút action của owner trên sidebar — "Chỉnh sửa hồ sơ" + "Chia sẻ".
 *
 * Tách riêng client component để JourneySidebar (server component) vẫn render
 * markup tĩnh, modal state nằm trong client-only boundary này.
 */
export function JourneySidebarOwnerActions({
  ownerSlug,
  initial,
  shareProfile,
  viewerProfileId = null,
}: Props) {
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
        <JourneyProfileShareTrigger
          shareProfile={shareProfile}
          viewerProfileId={viewerProfileId}
        />
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

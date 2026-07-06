"use client";

import { Share2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { JourneyProfileShareModal } from "@/components/journey/JourneyProfileShareModal";
import { dispatchJourneyShareOpen } from "@/lib/journey/gallery-filter-share";
import {
  buildOrgShareBundle,
  type OrgShareKind,
  type OrgShareSource,
} from "@/lib/org/org-profile-share";

type Props = {
  kind: OrgShareKind;
  source: OrgShareSource;
};

/** Nút chia sẻ icon-only trên sidebar org — popover giống JourneyProfileShareTrigger. */
export function OrgSidebarShareButton({ kind, source }: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { profile, orgShare } = useMemo(
    () => buildOrgShareBundle(kind, source),
    [kind, source],
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="cso-ss-btn-share"
        title="Chia sẻ"
        aria-label="Chia sẻ"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          dispatchJourneyShareOpen();
          setOpen((v) => !v);
        }}
      >
        <Share2 size={15} strokeWidth={2} aria-hidden />
      </button>
      <JourneyProfileShareModal
        open={open}
        onClose={() => setOpen(false)}
        profile={profile}
        orgShare={orgShare}
        presentation="popover"
        anchorRef={anchorRef}
      />
    </>
  );
}

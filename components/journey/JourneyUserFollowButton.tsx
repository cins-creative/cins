"use client";

import { UserPlus } from "lucide-react";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
};

/** Nút theo dõi hồ sơ Journey — logic API sẽ wire sau. */
export function JourneyUserFollowButton({
  targetUserId: _targetUserId,
  viewerProfileId: _viewerProfileId,
}: Props) {
  return (
    <button
      type="button"
      className="j-act-btn j-act-btn--follow"
      disabled
      aria-label="Theo dõi"
      title="Theo dõi"
    >
      <UserPlus size={15} strokeWidth={2} aria-hidden />
      Theo dõi
    </button>
  );
}

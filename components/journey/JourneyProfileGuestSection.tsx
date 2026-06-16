"use client";

import { useEffect, useState } from "react";

import { JourneyMutualFriendsTrigger } from "@/components/journey/JourneyMutualFriendsTrigger";
import { JourneyProfileGuestActions } from "@/components/journey/JourneyProfileGuestActions";
import { useMutualFriends } from "@/lib/social/use-mutual-friends";
import type { QuanHe } from "@/lib/social/types";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
};

export function JourneyProfileGuestSection({
  targetUserId,
  viewerProfileId,
}: Props) {
  const mutual = useMutualFriends(targetUserId, viewerProfileId);
  const [quanHe, setQuanHe] = useState<QuanHe | null>(null);

  useEffect(() => {
    if (!viewerProfileId || viewerProfileId === targetUserId) {
      setQuanHe(null);
      return;
    }
    const qs = new URLSearchParams({ id_nguoi: targetUserId });
    void fetch(`/api/ket-ban/status?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { trang_thai?: QuanHe } | null) => {
        setQuanHe(json?.trang_thai ?? "none");
      });
  }, [targetUserId, viewerProfileId]);

  const showMutualLine = mutual.visible && quanHe !== "accepted";

  return (
    <>
      {showMutualLine ? (
        <JourneyMutualFriendsTrigger mutual={mutual} variant="line" />
      ) : null}
      <JourneyProfileGuestActions
        targetUserId={targetUserId}
        viewerProfileId={viewerProfileId}
        mutual={mutual}
      />
    </>
  );
}

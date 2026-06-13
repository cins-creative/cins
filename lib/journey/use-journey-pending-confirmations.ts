"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  PendingCoAuthorInvite,
  PendingCoAuthorReview,
  PendingFollowRequest,
} from "@/lib/social/types";
import type { PendingCoSoStaffInviteNotification } from "@/lib/to-chuc/co-so-staff-invite";

export type JourneyPendingConfirmations = {
  coSoStaffInvites: PendingCoSoStaffInviteNotification[];
  coAuthorInvites: PendingCoAuthorInvite[];
  followRequests: PendingFollowRequest[];
  coAuthorReviews: PendingCoAuthorReview[];
};

const EMPTY: JourneyPendingConfirmations = {
  coSoStaffInvites: [],
  coAuthorInvites: [],
  followRequests: [],
  coAuthorReviews: [],
};

function parseConfirmationPayload(json: unknown): JourneyPendingConfirmations | null {
  if (!json || typeof json !== "object") return null;
  const data = json as Record<string, unknown>;
  return {
    coSoStaffInvites: Array.isArray(data.coSoStaffInvites)
      ? (data.coSoStaffInvites as PendingCoSoStaffInviteNotification[])
      : [],
    coAuthorInvites: Array.isArray(data.coAuthorInvites)
      ? (data.coAuthorInvites as PendingCoAuthorInvite[])
      : [],
    followRequests: Array.isArray(data.followRequests)
      ? (data.followRequests as PendingFollowRequest[])
      : [],
    coAuthorReviews: Array.isArray(data.coAuthorReviews)
      ? (data.coAuthorReviews as PendingCoAuthorReview[])
      : [],
  };
}

type Options = {
  isOwner: boolean;
  viewerProfileId: string | null;
  initialCoAuthorInvites: ReadonlyArray<PendingCoAuthorInvite>;
  initialCoSoStaffInvites: ReadonlyArray<PendingCoSoStaffInviteNotification>;
};

export function useJourneyPendingConfirmations({
  isOwner,
  viewerProfileId,
  initialCoAuthorInvites,
  initialCoSoStaffInvites,
}: Options): JourneyPendingConfirmations {
  const [state, setState] = useState<JourneyPendingConfirmations>(() => ({
    ...EMPTY,
    coAuthorInvites: [...initialCoAuthorInvites],
    coSoStaffInvites: [...initialCoSoStaffInvites],
  }));

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      coAuthorInvites: [...initialCoAuthorInvites],
      coSoStaffInvites: [...initialCoSoStaffInvites],
    }));
  }, [initialCoAuthorInvites, initialCoSoStaffInvites]);

  const refresh = useCallback(async () => {
    if (!isOwner || !viewerProfileId) return;
    try {
      const res = await fetch("/api/notifications?filter=unread", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      const parsed = parseConfirmationPayload(json);
      if (parsed) setState(parsed);
    } catch {
      /* giữ state hiện tại */
    }
  }, [isOwner, viewerProfileId]);

  useEffect(() => {
    if (!isOwner || !viewerProfileId) return;
    void refresh();
    window.addEventListener("cins:notifications-changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    return () => {
      window.removeEventListener("cins:notifications-changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isOwner, viewerProfileId, refresh]);

  return state;
}

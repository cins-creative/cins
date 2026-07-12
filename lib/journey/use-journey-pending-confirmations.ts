"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  PendingCoAuthorInvite,
  PendingCoAuthorReview,
  PendingFollowRequest,
} from "@/lib/social/types";
import type { PendingCongDongInviteNotification } from "@/lib/cong-dong/invite";
import type { PendingCoSoStaffInviteNotification } from "@/lib/to-chuc/co-so-staff-invite";

export type JourneyPendingConfirmations = {
  coSoStaffInvites: PendingCoSoStaffInviteNotification[];
  congDongInvites: PendingCongDongInviteNotification[];
  coAuthorInvites: PendingCoAuthorInvite[];
  followRequests: PendingFollowRequest[];
  coAuthorReviews: PendingCoAuthorReview[];
};

const EMPTY: JourneyPendingConfirmations = {
  coSoStaffInvites: [],
  congDongInvites: [],
  coAuthorInvites: [],
  followRequests: [],
  coAuthorReviews: [],
};

/** Default ổn định — tránh `= []` trong params tạo reference mới mỗi render. */
const EMPTY_INVITES: readonly never[] = [];

function inviteKey(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;
  const id = row.id ?? row.inviteId ?? row.notificationId;
  return typeof id === "string" ? id : "";
}

function sameInviteIds(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (inviteKey(a[i]) !== inviteKey(b[i])) return false;
  }
  return true;
}

function parseConfirmationPayload(json: unknown): JourneyPendingConfirmations | null {
  if (!json || typeof json !== "object") return null;
  const data = json as Record<string, unknown>;
  return {
    coSoStaffInvites: Array.isArray(data.coSoStaffInvites)
      ? (data.coSoStaffInvites as PendingCoSoStaffInviteNotification[])
      : [],
    congDongInvites: Array.isArray(data.congDongInvites)
      ? (data.congDongInvites as PendingCongDongInviteNotification[])
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
  initialCongDongInvites?: ReadonlyArray<PendingCongDongInviteNotification>;
};

export function useJourneyPendingConfirmations({
  isOwner,
  viewerProfileId,
  initialCoAuthorInvites,
  initialCoSoStaffInvites,
  initialCongDongInvites = EMPTY_INVITES,
}: Options): JourneyPendingConfirmations {
  const [state, setState] = useState<JourneyPendingConfirmations>(() => ({
    ...EMPTY,
    coAuthorInvites: [...initialCoAuthorInvites],
    coSoStaffInvites: [...initialCoSoStaffInvites],
    congDongInvites: [...initialCongDongInvites],
  }));

  useEffect(() => {
    setState((prev) => {
      const nextCoAuthor = [...initialCoAuthorInvites];
      const nextCoSo = [...initialCoSoStaffInvites];
      const nextCongDong = [...initialCongDongInvites];
      if (
        sameInviteIds(prev.coAuthorInvites, nextCoAuthor) &&
        sameInviteIds(prev.coSoStaffInvites, nextCoSo) &&
        sameInviteIds(prev.congDongInvites, nextCongDong)
      ) {
        return prev;
      }
      return {
        ...prev,
        coAuthorInvites: nextCoAuthor,
        coSoStaffInvites: nextCoSo,
        congDongInvites: nextCongDong,
      };
    });
  }, [initialCoAuthorInvites, initialCoSoStaffInvites, initialCongDongInvites]);

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

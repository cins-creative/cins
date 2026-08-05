/**
 * Cache client sidebar-live cộng đồng — tránh refetch mỗi lần remount.
 * @see docs/PLAN_client_cache.md B2
 */

import { createCachedResource } from "@/lib/client-cache";
import type {
  CongDongCareerSegment,
  CongDongMemberPreview,
} from "@/lib/cong-dong/types";

export type CongDongSidebarLivePayload = {
  friendsInCommunity: { friends: CongDongMemberPreview[]; total: number };
  memberPreview: CongDongMemberPreview[];
  careerMap: CongDongCareerSegment[];
};

const EMPTY: CongDongSidebarLivePayload = {
  friendsInCommunity: { friends: [], total: 0 },
  memberPreview: [],
  careerMap: [],
};

const sidebarLiveCache = createCachedResource<
  CongDongSidebarLivePayload,
  [string]
>({
  keyPrefix: "cong-dong:sidebar-live",
  ttlMs: 60_000,
  keyFromArgs: (orgId) => orgId,
  fetcher: async (orgId) => {
    const res = await fetch(`/api/cong-dong/${orgId}/sidebar-live`, {
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    const json = (await res.json().catch(() => null)) as Partial<
      CongDongSidebarLivePayload
    > | null;
    return {
      friendsInCommunity:
        json?.friendsInCommunity ?? EMPTY.friendsInCommunity,
      memberPreview: json?.memberPreview ?? [],
      careerMap: json?.careerMap ?? [],
    };
  },
});

export function peekCongDongSidebarLive(orgId: string) {
  return sidebarLiveCache.peek(orgId);
}

export async function fetchCongDongSidebarLiveCached(
  orgId: string,
  opts?: { force?: boolean },
) {
  return sidebarLiveCache.fetch(orgId, opts);
}

export function invalidateCongDongSidebarLiveCache(orgId?: string) {
  if (orgId) sidebarLiveCache.invalidate(orgId);
  else sidebarLiveCache.invalidateAll();
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { JourneyOrganizationsSectionSkeleton } from "@/app/[slug]/_components/JourneyOrganizationsSection.skeleton";
import { JourneyFriendsSectionSkeleton } from "@/app/[slug]/_components/JourneyFriendsSection.skeleton";
import { JourneyGalleryMainSectionSkeleton } from "@/app/[slug]/_components/JourneyGalleryMainSection.skeleton";
import { JourneyTimelineSectionSkeleton } from "@/app/[slug]/_components/JourneyTimelineSection.skeleton";
import {
  JourneyFriendsViewLazy,
  JourneyGalleryGridViewLazy,
  JourneyOrganizationsViewLazy,
  prefetchJourneyFriendsView,
  prefetchJourneyGalleryView,
  prefetchJourneyOrganizationsView,
} from "@/components/journey/journey-profile-lazy-views";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { JourneyPersonalFilterProvider } from "@/components/journey/JourneyPersonalFilterContext";
import { useJourneyView } from "@/components/journey/JourneyViewContext";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import type { JourneyComposeState } from "@/lib/journey/compose-types";
import {
  hydrateJourneyPanelsFromLocalStorage,
  isJourneyPanelCacheStale,
  persistJourneyPanelsFromInitialData,
  readJourneyFriendsPanelCache,
  readJourneyGalleryPanelCache,
  readJourneyOrganizationsPanelCache,
  readJourneyTimelinePanelCache,
  type JourneyFriendsPanelData,
  type JourneyGalleryPanelData,
  type JourneyOrganizationsPanelData,
  type JourneyTimelinePanelData,
  writeJourneyFriendsPanelCache,
  writeJourneyGalleryPanelCache,
  writeJourneyOrganizationsPanelCache,
  writeJourneyTimelinePanelCache,
} from "@/lib/journey/journey-panel-local-cache";
import type { MilestoneTimelinePageResult } from "@/lib/journey/milestones-page-fetch";
import type { UserOrganizationsPageResult } from "@/lib/journey/user-orgs-fetch";
import {
  COAUTHOR_INVITE_ACCEPTED_EVENT,
  COAUTHOR_INVITE_DECLINED_EVENT,
  COAUTHOR_INVITE_FAILED_EVENT,
  type CoAuthorInviteAcceptedDetail,
  type CoAuthorInviteDeclinedDetail,
  type CoAuthorInviteFailedDetail,
} from "@/lib/journey/coauthor-invite-events";
import {
  applyMilestoneInlinePatch,
  MILESTONE_INLINE_PATCH_EVENT,
  type MilestoneInlinePatchDetail,
} from "@/lib/journey/milestone-inline-patch";
import {
  applyMilestoneCreditsUpdate,
  MILESTONE_CREDITS_UPDATED_EVENT,
  type MilestoneCreditsUpdatedDetail,
} from "@/lib/journey/coauthor-credits-events";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";
import {
  mergeMilestoneIntoTimeline,
  removeMilestoneByTacPhamId,
} from "@/lib/journey/timeline-merge";

export type JourneyProfileInitialData = {
  timeline?: JourneyTimelinePanelData;
  gallery?: JourneyGalleryPanelData;
  friends?: JourneyFriendsPanelData;
  organizations?: UserOrganizationsPageResult;
};

type TimelineCacheData = JourneyTimelinePanelData;

function milestoneMatchesId(item: MilestoneItem, milestoneId: string): boolean {
  return item.id === milestoneId || item.cotMocId === milestoneId;
}

function removeMilestoneFromTimelineCache(
  data: TimelineCacheData,
  milestoneId: string,
): TimelineCacheData {
  const milestones = data.page.milestones.filter(
    (m) => !milestoneMatchesId(m, milestoneId),
  );
  if (milestones.length === data.page.milestones.length) return data;
  return {
    ...data,
    page: {
      ...data.page,
      milestones,
      totalCount: Math.max(0, data.page.totalCount - 1),
    },
  };
}

type PanelState<T> = T | "loading" | "error" | null;

type Props = {
  initialData: JourneyProfileInitialData;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  ownerAvatarId: string | null;
  isOwner: boolean;
  viewerProfileId: string | null;
  filterVisibility: LoaiMocVisibilityMap;
  initialCompose?: JourneyComposeState | null;
};

export function JourneyProfileContent({
  initialData,
  ownerId,
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
  ownerAvatarId,
  isOwner,
  viewerProfileId,
  filterVisibility,
  initialCompose = null,
}: Props) {
  const { view } = useJourneyView();

  const [galleryCache, setGalleryCache] = useState<PanelState<JourneyGalleryPanelData>>(() =>
    initialData.gallery ??
    (typeof window !== "undefined"
      ? readJourneyGalleryPanelCache(ownerSlug, viewerProfileId)
      : null),
  );
  const [friendsCache, setFriendsCache] = useState<PanelState<JourneyFriendsPanelData>>(() =>
    initialData.friends ??
    (typeof window !== "undefined"
      ? readJourneyFriendsPanelCache(ownerSlug, viewerProfileId)
      : null),
  );
  const [timelineCache, setTimelineCache] = useState<PanelState<TimelineCacheData>>(() =>
    initialData.timeline ??
    (typeof window !== "undefined"
      ? readJourneyTimelinePanelCache(ownerSlug, viewerProfileId)
      : null),
  );
  const [organizationsCache, setOrganizationsCache] = useState<
    PanelState<JourneyOrganizationsPanelData>
  >(() =>
    initialData.organizations ??
    (typeof window !== "undefined"
      ? readJourneyOrganizationsPanelCache(ownerSlug, viewerProfileId)
      : null),
  );

  const localHydratedRef = useRef(false);
  const timelineInflightRef = useRef(false);
  const galleryInflightRef = useRef(false);
  const friendsInflightRef = useRef(false);
  const organizationsInflightRef = useRef(false);

  useEffect(() => {
    if (localHydratedRef.current) return;
    localHydratedRef.current = true;

    persistJourneyPanelsFromInitialData(ownerSlug, viewerProfileId, {
      timeline: initialData.timeline,
      gallery: initialData.gallery,
      friends: initialData.friends,
      organizations: initialData.organizations,
    });

    if (!initialData.timeline) {
      const stored = hydrateJourneyPanelsFromLocalStorage(ownerSlug, viewerProfileId);
      setTimelineCache((prev) => prev ?? stored.timeline ?? null);
      setGalleryCache((prev) => prev ?? stored.gallery ?? null);
      setFriendsCache((prev) => prev ?? stored.friends ?? null);
      setOrganizationsCache((prev) => prev ?? stored.organizations ?? null);
    }
  }, [ownerSlug, viewerProfileId, initialData]);

  const fetchTimeline = useCallback(
    async (opts?: { background?: boolean; force?: boolean }) => {
      if (timelineInflightRef.current && !opts?.force) return;
      timelineInflightRef.current = true;
      if (!opts?.background) setTimelineCache((prev) => (prev ? prev : "loading"));
      try {
        const res = await fetch(
          `/api/journey/${encodeURIComponent(ownerSlug)}/milestones?offset=0`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("timeline fetch failed");
        const page = (await res.json()) as MilestoneTimelinePageResult & {
          coAuthorPendingInvites?: JourneyTimelinePanelData["coAuthorPendingInvites"];
          coSoStaffPendingInvites?: JourneyTimelinePanelData["coSoStaffPendingInvites"];
          membershipPendingOutbound?: JourneyTimelinePanelData["membershipPendingOutbound"];
        };
        const data: TimelineCacheData = {
          page,
          coAuthorPendingInvites: page.coAuthorPendingInvites ?? [],
          coSoStaffPendingInvites: page.coSoStaffPendingInvites ?? [],
          membershipPendingOutbound: page.membershipPendingOutbound ?? [],
        };
        setTimelineCache(data);
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, data);
      } catch {
        if (!opts?.background) setTimelineCache("error");
      } finally {
        timelineInflightRef.current = false;
      }
    },
    [ownerSlug, viewerProfileId],
  );

  const fetchGallery = useCallback(
    async (opts?: { background?: boolean; force?: boolean }) => {
      if (galleryInflightRef.current && !opts?.force) return;
      galleryInflightRef.current = true;
      if (!opts?.background) setGalleryCache((prev) => (prev ? prev : "loading"));
      try {
        const res = await fetch(
          `/api/journey/${encodeURIComponent(ownerSlug)}/gallery?offset=0`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("gallery fetch failed");
        const page = (await res.json()) as JourneyGalleryPanelData;
        setGalleryCache(page);
        writeJourneyGalleryPanelCache(ownerSlug, viewerProfileId, page);
      } catch {
        if (!opts?.background) setGalleryCache("error");
      } finally {
        galleryInflightRef.current = false;
      }
    },
    [ownerSlug, viewerProfileId],
  );

  const fetchFriends = useCallback(
    async (opts?: { background?: boolean }) => {
      if (friendsInflightRef.current) return;
      friendsInflightRef.current = true;
      if (!opts?.background) setFriendsCache((prev) => (prev ? prev : "loading"));
      try {
        const res = await fetch(
          `/api/journey/${encodeURIComponent(ownerSlug)}/friends?offset=0`,
        );
        if (!res.ok) throw new Error("friends fetch failed");
        const page = (await res.json()) as JourneyFriendsPanelData;
        setFriendsCache(page);
        writeJourneyFriendsPanelCache(ownerSlug, viewerProfileId, page);
      } catch {
        if (!opts?.background) setFriendsCache("error");
      } finally {
        friendsInflightRef.current = false;
      }
    },
    [ownerSlug, viewerProfileId],
  );

  const fetchOrganizations = useCallback(
    async (opts?: { background?: boolean }) => {
      if (organizationsInflightRef.current) return;
      organizationsInflightRef.current = true;
      if (!opts?.background) {
        setOrganizationsCache((prev) => (prev ? prev : "loading"));
      }
      try {
        const res = await fetch(
          `/api/journey/${encodeURIComponent(ownerSlug)}/organizations`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("organizations fetch failed");
        const page = (await res.json()) as JourneyOrganizationsPanelData;
        setOrganizationsCache(page);
        writeJourneyOrganizationsPanelCache(ownerSlug, viewerProfileId, page);
      } catch {
        if (!opts?.background) setOrganizationsCache("error");
      } finally {
        organizationsInflightRef.current = false;
      }
    },
    [ownerSlug, viewerProfileId],
  );

  const ensurePanel = useCallback(
    (
      panel: "timeline" | "gallery" | "friends" | "organizations",
      cache: PanelState<unknown>,
      readCache: () => unknown,
      fetch: (opts?: { background?: boolean }) => Promise<void>,
    ) => {
      if (cache !== null) {
        if (
          cache !== "loading" &&
          cache !== "error" &&
          isJourneyPanelCacheStale(ownerSlug, viewerProfileId, panel)
        ) {
          void fetch({ background: true });
        }
        return;
      }

      const stored = readCache();
      if (stored) {
        if (panel === "timeline") setTimelineCache(stored as TimelineCacheData);
        if (panel === "gallery") setGalleryCache(stored as JourneyGalleryPanelData);
        if (panel === "friends") setFriendsCache(stored as JourneyFriendsPanelData);
        if (panel === "organizations") {
          setOrganizationsCache(stored as JourneyOrganizationsPanelData);
        }
        if (isJourneyPanelCacheStale(ownerSlug, viewerProfileId, panel)) {
          void fetch({ background: true });
        }
        return;
      }

      void fetch();
    },
    [ownerSlug, viewerProfileId],
  );

  useEffect(() => {
    if (view === "journey") {
      ensurePanel(
        "timeline",
        timelineCache,
        () => readJourneyTimelinePanelCache(ownerSlug, viewerProfileId),
        fetchTimeline,
      );
    }
    if (view === "gallery") {
      ensurePanel(
        "gallery",
        galleryCache,
        () => readJourneyGalleryPanelCache(ownerSlug, viewerProfileId),
        fetchGallery,
      );
    }
    if (view === "friends") {
      ensurePanel(
        "friends",
        friendsCache,
        () => readJourneyFriendsPanelCache(ownerSlug, viewerProfileId),
        fetchFriends,
      );
    }
    if (view === "organizations") {
      ensurePanel(
        "organizations",
        organizationsCache,
        () => readJourneyOrganizationsPanelCache(ownerSlug, viewerProfileId),
        fetchOrganizations,
      );
    }
  }, [
    view,
    timelineCache,
    galleryCache,
    friendsCache,
    organizationsCache,
    ensurePanel,
    fetchTimeline,
    fetchGallery,
    fetchFriends,
    fetchOrganizations,
    ownerSlug,
    viewerProfileId,
  ]);

  useEffect(() => {
    if (view === "gallery") prefetchJourneyGalleryView();
    if (view === "friends") prefetchJourneyFriendsView();
    if (view === "organizations") prefetchJourneyOrganizationsView();
  }, [view]);

  const pendingMembershipCount =
    timelineCache &&
    timelineCache !== "loading" &&
    timelineCache !== "error"
      ? (timelineCache.membershipPendingOutbound?.length ?? 0)
      : 0;

  useEffect(() => {
    if (!isOwner || view !== "journey" || pendingMembershipCount === 0) return;

    const refresh = () => void fetchTimeline({ background: true, force: true });
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 45_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, [isOwner, view, pendingMembershipCount, fetchTimeline]);

  useEffect(() => {
    const syncGalleryPanel = () => {
      void fetchGallery({ background: true, force: true });
    };

    const onMilestoneDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{ milestoneId?: string; ownerSlug?: string }>)
        .detail;
      if (!detail?.milestoneId || detail.ownerSlug !== ownerSlug) return;

      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        const next = removeMilestoneFromTimelineCache(prev, detail.milestoneId!);
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
      syncGalleryPanel();
    };

    const onMilestoneDeleteFailed = (event: Event) => {
      const detail = (event as CustomEvent<{
        milestoneId?: string;
        ownerSlug?: string;
        error?: string;
      }>).detail;
      if (!detail?.ownerSlug || detail.ownerSlug !== ownerSlug) return;
      void fetchTimeline({ background: true, force: true });
      syncGalleryPanel();
    };

    const onTimelineChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerSlug?: string }>).detail;
      if (detail?.ownerSlug && detail.ownerSlug !== ownerSlug) return;
      void fetchTimeline({ background: true, force: true });
      syncGalleryPanel();
    };

    const onComposePublished = (event: Event) => {
      const detail = (event as CustomEvent<ComposePublishedDetail>).detail;
      if (!detail?.ownerSlug || detail.ownerSlug !== ownerSlug) return;
      if (detail.milestone) {
        setTimelineCache((prev) => {
          if (!prev || prev === "loading" || prev === "error") return prev;
          const hadMilestone = prev.page.milestones.some(
            (m) =>
              m.id === detail.milestone!.id ||
              m.cotMocId === detail.milestone!.cotMocId,
          );
          const next: TimelineCacheData = {
            ...prev,
            page: {
              ...prev.page,
              milestones: mergeMilestoneIntoTimeline(
                prev.page.milestones,
                detail.milestone!,
              ),
              totalCount: hadMilestone
                ? prev.page.totalCount
                : prev.page.totalCount + 1,
            },
          };
          writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
          return next;
        });
      }
      void fetchTimeline({ background: true, force: true });
      syncGalleryPanel();
    };

    const onGallerySync = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerSlug?: string }>).detail;
      if (detail?.ownerSlug && detail.ownerSlug !== ownerSlug) return;
      syncGalleryPanel();
    };

    const onMilestonePatch = (event: Event) => {
      const detail = (event as CustomEvent<MilestoneInlinePatchDetail>).detail;
      if (!detail?.milestoneId) return;
      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        const next: TimelineCacheData = {
          ...prev,
          page: {
            ...prev.page,
            milestones: applyMilestoneInlinePatch(prev.page.milestones, detail),
          },
        };
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
    };

    const onCreditsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<MilestoneCreditsUpdatedDetail>).detail;
      if (!detail?.tacPhamId) return;
      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        const next: TimelineCacheData = {
          ...prev,
          page: {
            ...prev.page,
            milestones: applyMilestoneCreditsUpdate(prev.page.milestones, detail),
          },
        };
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
    };

    const onCoAuthorAccepted = (event: Event) => {
      const detail = (event as CustomEvent<CoAuthorInviteAcceptedDetail>).detail;
      if (!detail || detail.ownerSlug !== ownerSlug) return;
      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        const hadMilestone = prev.page.milestones.some(
          (m) =>
            m.tacPhamId === detail.tacPhamId ||
            m.id.endsWith(`:${detail.tacPhamId}`),
        );
        const next: TimelineCacheData = {
          ...prev,
          coAuthorPendingInvites: prev.coAuthorPendingInvites.filter(
            (inv) => inv.tacPhamId !== detail.tacPhamId,
          ),
          page: {
            ...prev.page,
            milestones: mergeMilestoneIntoTimeline(
              prev.page.milestones,
              detail.milestone,
            ),
            totalCount: hadMilestone
              ? prev.page.totalCount
              : prev.page.totalCount + 1,
          },
        };
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
      syncGalleryPanel();
    };

    const onCoAuthorDeclined = (event: Event) => {
      const detail = (event as CustomEvent<CoAuthorInviteDeclinedDetail>).detail;
      if (!detail || detail.ownerSlug !== ownerSlug) return;
      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        const next: TimelineCacheData = {
          ...prev,
          coAuthorPendingInvites: prev.coAuthorPendingInvites.filter(
            (inv) => inv.tacPhamId !== detail.tacPhamId,
          ),
        };
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
    };

    const onSocialAction = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          milestoneId?: string;
          bookmarked?: boolean;
          bookmarkCount?: number;
        }>
      ).detail;
      if (!detail?.milestoneId || typeof detail.bookmarked !== "boolean") return;

      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        let changed = false;
        const milestones = prev.page.milestones.map((m) => {
          const key = m.cotMocId ?? m.id;
          if (key !== detail.milestoneId) return m;
          changed = true;
          return {
            ...m,
            social: {
              viewerLiked: m.social?.viewerLiked ?? false,
              viewerBookmarked: detail.bookmarked!,
              likeCount: m.social?.likeCount ?? 0,
              bookmarkCount:
                typeof detail.bookmarkCount === "number"
                  ? detail.bookmarkCount
                  : (m.social?.bookmarkCount ?? 0),
              showCounts: m.social?.showCounts ?? true,
            },
          };
        });
        if (!changed) return prev;
        const next: TimelineCacheData = {
          ...prev,
          page: { ...prev.page, milestones },
        };
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
    };

    const onCoAuthorFailed = (event: Event) => {
      const detail = (event as CustomEvent<CoAuthorInviteFailedDetail>).detail;
      if (!detail || detail.ownerSlug !== ownerSlug) return;
      if (detail.action !== "accepted") return;
      setTimelineCache((prev) => {
        if (!prev || prev === "loading" || prev === "error") return prev;
        const next: TimelineCacheData = {
          ...prev,
          page: {
            ...prev.page,
            milestones: removeMilestoneByTacPhamId(
              prev.page.milestones,
              detail.tacPhamId,
            ),
          },
        };
        writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, next);
        return next;
      });
      void fetchTimeline({ background: true, force: true });
    };

    window.addEventListener("cins:social-action", onSocialAction);
    window.addEventListener("cins:milestone-deleted", onMilestoneDeleted);
    window.addEventListener("cins:milestone-delete-failed", onMilestoneDeleteFailed);
    window.addEventListener("cins:journey-timeline-changed", onTimelineChanged);
    window.addEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
    window.addEventListener("cins:video-ready", onTimelineChanged);
    window.addEventListener("cins:journey-gallery-sync", onGallerySync);
    window.addEventListener(MILESTONE_INLINE_PATCH_EVENT, onMilestonePatch);
    window.addEventListener(MILESTONE_CREDITS_UPDATED_EVENT, onCreditsUpdated);
    window.addEventListener(COAUTHOR_INVITE_ACCEPTED_EVENT, onCoAuthorAccepted);
    window.addEventListener(COAUTHOR_INVITE_DECLINED_EVENT, onCoAuthorDeclined);
    window.addEventListener(COAUTHOR_INVITE_FAILED_EVENT, onCoAuthorFailed);
    return () => {
      window.removeEventListener("cins:social-action", onSocialAction);
      window.removeEventListener("cins:milestone-deleted", onMilestoneDeleted);
      window.removeEventListener(
        "cins:milestone-delete-failed",
        onMilestoneDeleteFailed,
      );
      window.removeEventListener(
        "cins:journey-timeline-changed",
        onTimelineChanged,
      );
      window.removeEventListener(COMPOSE_PUBLISHED_EVENT, onComposePublished);
      window.removeEventListener("cins:video-ready", onTimelineChanged);
      window.removeEventListener("cins:journey-gallery-sync", onGallerySync);
      window.removeEventListener(MILESTONE_INLINE_PATCH_EVENT, onMilestonePatch);
      window.removeEventListener(MILESTONE_CREDITS_UPDATED_EVENT, onCreditsUpdated);
      window.removeEventListener(COAUTHOR_INVITE_ACCEPTED_EVENT, onCoAuthorAccepted);
      window.removeEventListener(COAUTHOR_INVITE_DECLINED_EVENT, onCoAuthorDeclined);
      window.removeEventListener(COAUTHOR_INVITE_FAILED_EVENT, onCoAuthorFailed);
    };
  }, [ownerSlug, viewerProfileId, fetchTimeline, fetchGallery]);

  return (
    <JourneyPersonalFilterProvider ownerId={ownerId} isOwner={isOwner}>
      <JourneyComposeProvider
        ownerId={ownerId}
        ownerSlug={ownerSlug}
        ownerName={ownerName}
        ownerAvatarId={ownerAvatarId}
        isOwner={isOwner}
        initialCompose={initialCompose}
      >
        {isOwner ? <BunnyVideoProcessingPoller ownerSlug={ownerSlug} /> : null}
      {view === "gallery" ? (
        galleryCache === "loading" || galleryCache === null ? (
          <JourneyGalleryMainSectionSkeleton />
        ) : galleryCache === "error" ? (
          <section className="j-gallery-main" aria-live="polite">
            <p className="j-load-error">Không tải được gallery. Thử tải lại trang.</p>
          </section>
        ) : (
          <JourneyGalleryGridViewLazy
            initialItems={galleryCache.items}
            totalCount={galleryCache.totalCount}
            scrollLoad={{
              ownerSlug,
              hasMore: galleryCache.hasMore,
              nextOffset: galleryCache.nextOffset,
              filterCounts: galleryCache.filterCounts,
            }}
            isOwner={isOwner}
            filterVisibility={filterVisibility}
          />
        )
      ) : view === "friends" ? (
        friendsCache === "loading" || friendsCache === null ? (
          <JourneyFriendsSectionSkeleton />
        ) : friendsCache === "error" ? (
          <section className="j-friends" aria-live="polite">
            <p className="j-load-error">Không tải được danh sách bạn bè.</p>
          </section>
        ) : (
          <JourneyFriendsViewLazy
            initialFriends={friendsCache.friends}
            totalCount={friendsCache.totalCount}
            isOwner={isOwner}
            viewerProfileId={viewerProfileId}
            scrollLoad={{
              ownerSlug,
              hasMore: friendsCache.hasMore,
              nextOffset: friendsCache.nextOffset,
            }}
          />
        )
      ) : view === "organizations" ? (
        organizationsCache === "loading" || organizationsCache === null ? (
          <JourneyOrganizationsSectionSkeleton />
        ) : organizationsCache === "error" ? (
          <section className="j-orgs" aria-live="polite">
            <p className="j-load-error">Không tải được danh sách tổ chức.</p>
          </section>
        ) : (
          <JourneyOrganizationsViewLazy data={organizationsCache} />
        )
      ) : timelineCache === "loading" || timelineCache === null ? (
        <JourneyTimelineSectionSkeleton />
      ) : timelineCache === "error" ? (
        <section className="j-timeline" aria-live="polite">
          <p className="j-load-error">Không tải được timeline.</p>
        </section>
      ) : (
        <JourneyTimeline
          isOwner={isOwner}
          ownerName={ownerName}
          ownerSlug={ownerSlug}
          ownerProfileId={ownerId}
          ownerAvatarUrl={ownerAvatarUrl}
          milestones={timelineCache.page.milestones}
          filterVisibility={filterVisibility}
          viewerProfileId={viewerProfileId}
          coAuthorPendingInvites={timelineCache.coAuthorPendingInvites}
          coSoStaffPendingInvites={timelineCache.coSoStaffPendingInvites ?? []}
          membershipPendingOutbound={timelineCache.membershipPendingOutbound ?? []}
          scrollLoad={{
            ownerSlug,
            hasMore: timelineCache.page.hasMore,
            nextOffset: timelineCache.page.nextOffset,
            filterCounts: timelineCache.page.filterCounts,
            totalCount: timelineCache.page.totalCount,
          }}
        />
      )}
      </JourneyComposeProvider>
    </JourneyPersonalFilterProvider>
  );
}

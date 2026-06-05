const PREFIX = "cins-journey-panels:v1:";
/** Cache tạm trang đầu mỗi tab — đủ để chuyển tab nhanh, không thay server truth lâu dài. */
export const JOURNEY_PANEL_CACHE_TTL_MS = 15 * 60 * 1000;

type PanelEntry<T> = {
  savedAt: number;
  data: T;
};

export type JourneyTimelinePanelData = {
  page: import("@/lib/journey/milestones-page-fetch").MilestoneTimelinePageResult;
  coAuthorPendingInvites: import("@/lib/social/types").PendingCoAuthorInvite[];
};

export type JourneyGalleryPanelData =
  import("@/lib/journey/gallery-page-fetch").GalleryMainPageResult;

export type JourneyFriendsPanelData = {
  friends: import("@/lib/social/types").MutualFriendProfile[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
};

export type JourneyAsidePanelData = {
  pinned: import("@/components/journey/JourneyGalleryAside").GalleryPinnedBanner[];
  items: import("@/components/journey/JourneyGalleryAside").GalleryGridItem[];
  totalTacPham: number;
};

type JourneyPanelSnapshot = {
  timeline?: PanelEntry<JourneyTimelinePanelData>;
  gallery?: PanelEntry<JourneyGalleryPanelData>;
  friends?: PanelEntry<JourneyFriendsPanelData>;
  aside?: PanelEntry<JourneyAsidePanelData | null>;
};

function storageKey(ownerSlug: string, viewerProfileId: string | null): string {
  return `${PREFIX}${ownerSlug.trim()}:${viewerProfileId ?? "anon"}`;
}

function readSnapshot(
  ownerSlug: string,
  viewerProfileId: string | null,
): JourneyPanelSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(ownerSlug, viewerProfileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JourneyPanelSnapshot;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeSnapshot(
  ownerSlug: string,
  viewerProfileId: string | null,
  snapshot: JourneyPanelSnapshot,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(ownerSlug, viewerProfileId),
      JSON.stringify(snapshot),
    );
  } catch {
    /* quota / disabled — bỏ qua */
  }
}

function isFresh(entry: PanelEntry<unknown> | undefined): boolean {
  if (!entry?.savedAt) return false;
  return Date.now() - entry.savedAt < JOURNEY_PANEL_CACHE_TTL_MS;
}

function readPanel<T>(
  ownerSlug: string,
  viewerProfileId: string | null,
  panel: keyof JourneyPanelSnapshot,
): T | null {
  const snapshot = readSnapshot(ownerSlug, viewerProfileId);
  const entry = snapshot?.[panel];
  if (!entry || !isFresh(entry)) return null;
  return entry.data as T;
}

function writePanel<T>(
  ownerSlug: string,
  viewerProfileId: string | null,
  panel: keyof JourneyPanelSnapshot,
  data: T,
): void {
  const existing = readSnapshot(ownerSlug, viewerProfileId) ?? {};
  writeSnapshot(ownerSlug, viewerProfileId, {
    ...existing,
    [panel]: { savedAt: Date.now(), data },
  });
}

export function readJourneyTimelinePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
): JourneyTimelinePanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "timeline");
}

export function writeJourneyTimelinePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyTimelinePanelData,
): void {
  writePanel(ownerSlug, viewerProfileId, "timeline", data);
}

export function readJourneyGalleryPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
): JourneyGalleryPanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "gallery");
}

export function writeJourneyGalleryPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyGalleryPanelData,
): void {
  writePanel(ownerSlug, viewerProfileId, "gallery", data);
}

export function readJourneyFriendsPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
): JourneyFriendsPanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "friends");
}

export function writeJourneyFriendsPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyFriendsPanelData,
): void {
  writePanel(ownerSlug, viewerProfileId, "friends", data);
}

export function readJourneyAsidePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
): JourneyAsidePanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "aside");
}

export function writeJourneyAsidePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyAsidePanelData | null,
): void {
  writePanel(ownerSlug, viewerProfileId, "aside", data);
}

/** Hydrate state từ localStorage sau mount — tránh hydration mismatch với SSR. */
export function hydrateJourneyPanelsFromLocalStorage(
  ownerSlug: string,
  viewerProfileId: string | null,
): {
  timeline: JourneyTimelinePanelData | null;
  gallery: JourneyGalleryPanelData | null;
  friends: JourneyFriendsPanelData | null;
  aside: JourneyAsidePanelData | null | undefined;
} {
  return {
    timeline: readJourneyTimelinePanelCache(ownerSlug, viewerProfileId),
    gallery: readJourneyGalleryPanelCache(ownerSlug, viewerProfileId),
    friends: readJourneyFriendsPanelCache(ownerSlug, viewerProfileId),
    aside: readJourneyAsidePanelCache(ownerSlug, viewerProfileId),
  };
}

export function persistJourneyPanelsFromInitialData(
  ownerSlug: string,
  viewerProfileId: string | null,
  initial: {
    timeline?: JourneyTimelinePanelData;
    gallery?: JourneyGalleryPanelData;
    friends?: JourneyFriendsPanelData;
    aside?: JourneyAsidePanelData | null;
  },
): void {
  if (initial.timeline) {
    writeJourneyTimelinePanelCache(ownerSlug, viewerProfileId, initial.timeline);
  }
  if (initial.gallery) {
    writeJourneyGalleryPanelCache(ownerSlug, viewerProfileId, initial.gallery);
  }
  if (initial.friends) {
    writeJourneyFriendsPanelCache(ownerSlug, viewerProfileId, initial.friends);
  }
  if (initial.aside !== undefined) {
    writeJourneyAsidePanelCache(ownerSlug, viewerProfileId, initial.aside);
  }
}

export function isJourneyPanelCacheStale(
  ownerSlug: string,
  viewerProfileId: string | null,
  panel: keyof JourneyPanelSnapshot,
): boolean {
  const snapshot = readSnapshot(ownerSlug, viewerProfileId);
  const entry = snapshot?.[panel];
  if (!entry) return true;
  return !isFresh(entry);
}

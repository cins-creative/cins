const PREFIX = "cins-journey-panels:v1:";
/** Cache tạm trang đầu mỗi tab — đủ để chuyển tab nhanh, không thay server truth lâu dài. */
export const JOURNEY_PANEL_CACHE_TTL_MS = 15 * 60 * 1000;
/** Số item tối đa ghi localStorage — đủ hiển thị ngay, giữ payload nhỏ. */
export const JOURNEY_PANEL_CACHE_ITEM_LIMIT = 8;

type PanelEntry<T> = {
  savedAt: number;
  data: T;
};

export type JourneyTimelinePanelData = {
  page: import("@/lib/journey/milestones-page-fetch").MilestoneTimelinePageResult;
  coAuthorPendingInvites: import("@/lib/social/types").PendingCoAuthorInvite[];
  coSoStaffPendingInvites?: import("@/lib/to-chuc/co-so-staff-invite").PendingCoSoStaffInviteNotification[];
};

export type JourneyGalleryPanelData =
  import("@/lib/journey/gallery-page-fetch").GalleryMainPageResult;

export type JourneyFriendsPanelData = {
  friends: import("@/lib/social/types").MutualFriendProfile[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
};

export type JourneyOrganizationsPanelData =
  import("@/lib/journey/user-orgs-fetch").UserOrganizationsPageResult;

export type JourneyAsidePanelData = {
  pinned: import("@/components/journey/JourneyGalleryAside").GalleryPinnedBanner[];
  items: import("@/components/journey/JourneyGalleryAside").GalleryGridItem[];
  totalTacPham: number;
};

export type JourneyPanelView = "journey" | "gallery" | "friends" | "organizations";

type JourneyPanelSnapshot = {
  timeline?: PanelEntry<JourneyTimelinePanelData>;
  gallery?: PanelEntry<JourneyGalleryPanelData>;
  friends?: PanelEntry<JourneyFriendsPanelData>;
  organizations?: PanelEntry<JourneyOrganizationsPanelData>;
  aside?: PanelEntry<JourneyAsidePanelData | null>;
};

function storageKey(ownerSlug: string, viewerProfileId: string | null): string {
  return `${PREFIX}${ownerSlug.trim()}:${viewerProfileId ?? "anon"}`;
}

/** Stable snapshot refs for useSyncExternalStore (raw string equality). */
const snapshotByKey = new Map<
  string,
  { raw: string | null; snapshot: JourneyPanelSnapshot | null }
>();

function readSnapshot(
  ownerSlug: string,
  viewerProfileId: string | null,
): JourneyPanelSnapshot | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(ownerSlug, viewerProfileId);
  try {
    const raw = localStorage.getItem(key);
    const cached = snapshotByKey.get(key);
    if (cached && cached.raw === raw) {
      return cached.snapshot;
    }
    let snapshot: JourneyPanelSnapshot | null = null;
    if (raw) {
      const parsed = JSON.parse(raw) as JourneyPanelSnapshot;
      snapshot = parsed && typeof parsed === "object" ? parsed : null;
    }
    snapshotByKey.set(key, { raw, snapshot });
    return snapshot;
  } catch {
    snapshotByKey.set(key, { raw: null, snapshot: null });
    return null;
  }
}

function writeSnapshot(
  ownerSlug: string,
  viewerProfileId: string | null,
  snapshot: JourneyPanelSnapshot,
): void {
  if (typeof window === "undefined") return;
  const key = storageKey(ownerSlug, viewerProfileId);
  try {
    const raw = JSON.stringify(snapshot);
    localStorage.setItem(key, raw);
    snapshotByKey.set(key, { raw, snapshot });
  } catch {
    /* quota / disabled — bỏ qua */
  }
}

function isFresh(entry: PanelEntry<unknown> | undefined): boolean {
  if (!entry?.savedAt) return false;
  return Date.now() - entry.savedAt < JOURNEY_PANEL_CACHE_TTL_MS;
}

function trimPanelDataForCache<T>(
  panel: keyof JourneyPanelSnapshot,
  data: T,
): T {
  const limit = JOURNEY_PANEL_CACHE_ITEM_LIMIT;
  switch (panel) {
    case "timeline": {
      const d = data as JourneyTimelinePanelData;
      return {
        ...d,
        page: {
          ...d.page,
          milestones: d.page.milestones.slice(0, limit),
        },
      } as T;
    }
    case "gallery": {
      const d = data as JourneyGalleryPanelData;
      return { ...d, items: d.items.slice(0, limit) } as T;
    }
    case "friends": {
      const d = data as JourneyFriendsPanelData;
      return { ...d, friends: d.friends.slice(0, limit) } as T;
    }
    case "organizations": {
      const d = data as JourneyOrganizationsPanelData;
      return {
        ...d,
        memberships: d.memberships.slice(0, limit),
      } as T;
    }
    case "aside": {
      const d = data as JourneyAsidePanelData | null;
      if (!d) return data;
      return { ...d, items: d.items.slice(0, limit) } as T;
    }
    default:
      return data;
  }
}

function readPanel<T>(
  ownerSlug: string,
  viewerProfileId: string | null,
  panel: keyof JourneyPanelSnapshot,
  opts?: { allowStale?: boolean },
): T | null {
  const snapshot = readSnapshot(ownerSlug, viewerProfileId);
  const entry = snapshot?.[panel];
  if (!entry) return null;
  if (!opts?.allowStale && !isFresh(entry)) return null;
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
    [panel]: {
      savedAt: Date.now(),
      data: trimPanelDataForCache(panel, data),
    },
  });
}

export function readJourneyTimelinePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  opts?: { allowStale?: boolean },
): JourneyTimelinePanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "timeline", opts);
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
  opts?: { allowStale?: boolean },
): JourneyGalleryPanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "gallery", opts);
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
  opts?: { allowStale?: boolean },
): JourneyFriendsPanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "friends", opts);
}

export function writeJourneyFriendsPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyFriendsPanelData,
): void {
  writePanel(ownerSlug, viewerProfileId, "friends", data);
}

export function readJourneyOrganizationsPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  opts?: { allowStale?: boolean },
): JourneyOrganizationsPanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "organizations", opts);
}

export function writeJourneyOrganizationsPanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyOrganizationsPanelData,
): void {
  writePanel(ownerSlug, viewerProfileId, "organizations", data);
}

export function readJourneyAsidePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  opts?: { allowStale?: boolean },
): JourneyAsidePanelData | null {
  return readPanel(ownerSlug, viewerProfileId, "aside", opts);
}

export function writeJourneyAsidePanelCache(
  ownerSlug: string,
  viewerProfileId: string | null,
  data: JourneyAsidePanelData | null,
): void {
  writePanel(ownerSlug, viewerProfileId, "aside", data);
}

/** Đọc cache tab hiện tại — dùng cho Suspense fallback (cho phép stale). */
export function readJourneyPanelCacheForView(
  ownerSlug: string,
  viewerProfileId: string | null,
  view: JourneyPanelView,
): JourneyTimelinePanelData | JourneyGalleryPanelData | JourneyFriendsPanelData | JourneyOrganizationsPanelData | null {
  const opts = { allowStale: true };
  switch (view) {
    case "journey":
      return readJourneyTimelinePanelCache(ownerSlug, viewerProfileId, opts);
    case "gallery":
      return readJourneyGalleryPanelCache(ownerSlug, viewerProfileId, opts);
    case "friends":
      return readJourneyFriendsPanelCache(ownerSlug, viewerProfileId, opts);
    case "organizations":
      return readJourneyOrganizationsPanelCache(ownerSlug, viewerProfileId, opts);
    default:
      return null;
  }
}

/** Hydrate state từ localStorage sau mount — tránh hydration mismatch với SSR. */
export function hydrateJourneyPanelsFromLocalStorage(
  ownerSlug: string,
  viewerProfileId: string | null,
): {
  timeline: JourneyTimelinePanelData | null;
  gallery: JourneyGalleryPanelData | null;
  friends: JourneyFriendsPanelData | null;
  organizations: JourneyOrganizationsPanelData | null;
  aside: JourneyAsidePanelData | null | undefined;
} {
  return {
    timeline: readJourneyTimelinePanelCache(ownerSlug, viewerProfileId),
    gallery: readJourneyGalleryPanelCache(ownerSlug, viewerProfileId),
    friends: readJourneyFriendsPanelCache(ownerSlug, viewerProfileId),
    organizations: readJourneyOrganizationsPanelCache(ownerSlug, viewerProfileId),
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
    organizations?: JourneyOrganizationsPanelData;
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
  if (initial.organizations) {
    writeJourneyOrganizationsPanelCache(
      ownerSlug,
      viewerProfileId,
      initial.organizations,
    );
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

/** Buộc refetch timeline sau bookmark / social — cache cũ thiếu `social.viewerBookmarked`. */
export function markJourneyTimelinePanelStale(
  ownerSlug: string,
  viewerProfileId: string | null,
): void {
  if (typeof window === "undefined") return;
  const snapshot = readSnapshot(ownerSlug, viewerProfileId);
  const entry = snapshot?.timeline;
  if (!entry) return;
  writeSnapshot(ownerSlug, viewerProfileId, {
    ...snapshot,
    timeline: { ...entry, savedAt: 0 },
  });
}

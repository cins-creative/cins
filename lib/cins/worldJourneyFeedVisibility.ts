import type { CheDoHienThiMoc } from "@/lib/journey/journey-visible-clause";

/** Quan hệ viewer ↔ chủ cột mốc — dùng lọc feed trang chủ World Journey. */
export type WorldJourneyViewerRelation = {
  viewerId: string | null;
  ownerId: string;
  viewerIsFriend: boolean;
  viewerIsFollowing: boolean;
};

const WORLD_JOURNEY_FEED_MODES = new Set<CheDoHienThiMoc>([
  "feature",
  "public",
  "theo_nhom",
  "chi_minh",
]);

export const WORLD_JOURNEY_VISIBILITY_LABEL: Record<
  CheDoHienThiMoc,
  string
> = {
  feature: "Nổi bật",
  public: "Công khai",
  theo_nhom: "Bạn bè",
  chi_minh: "Chỉ mình tôi",
  cong_dong: "Cộng đồng",
};

/**
 * Feed trang chủ World Journey — 3 lớp công khai (+ chỉ mình):
 *
 * • `feature` — portfolio / khoe: mọi người thấy (kể cả không bạn bè, không theo dõi).
 * • `public` — bạn bè hoặc người đang theo dõi tác giả.
 * • `theo_nhom` — chỉ bạn bè (2 chiều).
 * • `chi_minh` — chỉ chủ bài; không lên feed người khác.
 *
 * Post `cong_dong` không thuộc World Journey feed.
 */
export function isVisibleOnWorldJourneyFeed(
  cheDoHienThi: string,
  relation: WorldJourneyViewerRelation,
): boolean {
  if (cheDoHienThi === "cong_dong") return false;

  const { viewerId, ownerId, viewerIsFriend, viewerIsFollowing } = relation;

  if (viewerId && viewerId === ownerId) return true;

  if (cheDoHienThi === "chi_minh") return false;

  if (cheDoHienThi === "feature") return true;

  if (cheDoHienThi === "public") {
    return viewerIsFriend || viewerIsFollowing;
  }

  if (cheDoHienThi === "theo_nhom") {
    return viewerIsFriend;
  }

  return false;
}

export function isWorldJourneyFeedCheDo(
  cheDo: string,
): cheDo is CheDoHienThiMoc {
  return WORLD_JOURNEY_FEED_MODES.has(cheDo as CheDoHienThiMoc);
}

export function worldJourneyVisibilityLabel(cheDoHienThi: string): string {
  if (isWorldJourneyFeedCheDo(cheDoHienThi)) {
    return WORLD_JOURNEY_VISIBILITY_LABEL[cheDoHienThi];
  }
  return WORLD_JOURNEY_VISIBILITY_LABEL.public;
}

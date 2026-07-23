import type { CheDoHienThiMoc } from "@/lib/journey/journey-visible-clause";
import {
  applyVisibilityNgoaiLe,
  type VisibilityNgoaiLeEntry,
} from "@/lib/journey/milestone-visibility-custom.shared";
import { WORLD_JOURNEY_PUBLIC_GLOBAL_FEED } from "@/lib/cins/worldJourneyFeedConstants";

/** Quan hệ viewer ↔ chủ cột mốc — dùng lọc feed trang chủ World Journey. */
export type WorldJourneyViewerRelation = {
  viewerId: string | null;
  ownerId: string;
  viewerIsFriend: boolean;
  viewerIsFollowing: boolean;
  /**
   * Bài `cong_dong`: true khi viewer được xem feed phòng đó
   * (member · follow `cong_khai` · hoặc gợi ý `cong_khai` đã chọn).
   */
  canViewCongDongPost?: boolean;
  /** Ngoại lệ tùy chỉnh (chặn / chỉ một số người). */
  ngoaiLe?: VisibilityNgoaiLeEntry | null;
};

const WORLD_JOURNEY_FEED_MODES = new Set<CheDoHienThiMoc>([
  "feature",
  "public",
  "theo_nhom",
  "chi_minh",
  "cong_dong",
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
 * Feed trang chủ World Journey — 3 lớp công khai (+ chỉ mình + cộng đồng scoped):
 *
 * • `feature` — portfolio / khoe: mọi người thấy (kể cả không bạn bè, không theo dõi).
 * • `public` — cold start (`WORLD_JOURNEY_PUBLIC_GLOBAL_FEED`): mọi viewer;
 *   tắt flag → L18 (bạn bè hoặc đang theo dõi tác giả).
 * • `theo_nhom` — chỉ bạn bè (2 chiều).
 * • `chi_minh` — chỉ chủ bài; không lên feed người khác.
 * • `cong_dong` — phân bổ theo quan hệ phòng (member / follow công khai / gợi ý).
 */
export function isVisibleOnWorldJourneyFeed(
  cheDoHienThi: string,
  relation: WorldJourneyViewerRelation,
): boolean {
  const { viewerId, ownerId, viewerIsFriend, viewerIsFollowing } = relation;
  const isOwner = Boolean(viewerId && viewerId === ownerId);

  if (isOwner) return true;

  if (cheDoHienThi === "cong_dong") {
    return Boolean(relation.canViewCongDongPost);
  }

  let baseVisible = false;
  if (cheDoHienThi === "chi_minh") {
    baseVisible = false;
  } else if (cheDoHienThi === "feature") {
    baseVisible = true;
  } else if (cheDoHienThi === "public") {
    baseVisible = WORLD_JOURNEY_PUBLIC_GLOBAL_FEED
      ? true
      : viewerIsFriend || viewerIsFollowing;
  } else if (cheDoHienThi === "theo_nhom") {
    baseVisible = viewerIsFriend;
  }

  return applyVisibilityNgoaiLe({
    baseVisible,
    isOwner,
    viewerId,
    ngoaiLe: relation.ngoaiLe,
  });
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

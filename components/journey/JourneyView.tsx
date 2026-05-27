import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import {
  JourneyGalleryAside,
  type GalleryGridItem,
  type GalleryPinnedBanner,
} from "@/components/journey/JourneyGalleryAside";
import { JourneyFriendsView } from "@/components/journey/JourneyFriendsView";
import { JourneyGalleryGridView } from "@/components/journey/JourneyGalleryGridView";
import {
  JourneySidebar,
  type JourneyProfileView,
  type SidebarProfile,
  type SidebarStats,
} from "@/components/journey/JourneySidebar";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import type {
  MutualFriendProfile,
  PendingCoAuthorInvite,
} from "@/lib/social/types";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";

type Props = {
  slugFromRoute: string;
  profile: SidebarProfile;
  stats: SidebarStats;
  isOwner: boolean;
  /** Vừa hoàn tất onboarding (?welcome=1) — empty state có thể nhấn mạnh hơn. */
  freshlyOnboarded: boolean;
  /** Milestones (đã adapter sang `MilestoneItem`). Lượt này thường rỗng. */
  milestones: ReadonlyArray<MilestoneItem>;
  /** Pinned banner gallery (16:9). */
  galleryPinned: ReadonlyArray<GalleryPinnedBanner>;
  /** Square grid item gallery (1:1). */
  galleryItems: ReadonlyArray<GalleryGridItem>;
  /** Snapshot toàn bộ field user_nguoi_dung cho modal "Chỉnh sửa hồ sơ". */
  editProfileInitial?: EditProfileInitial;
  /**
   * Visibility per built-in loai_moc filter row trong dropdown.
   * Missing key = public. Owner UI render toggle; visitor UI hide
   * những entry `private`.
   */
  filterVisibility?: LoaiMocVisibilityMap;
  viewerProfileId?: string | null;
  coAuthorPendingInvites?: ReadonlyArray<PendingCoAuthorInvite>;
  activeView?: JourneyProfileView;
  friends?: ReadonlyArray<MutualFriendProfile>;
};

/**
 * View root cho `/{slug}/journey` — 3-col layout (sidebar / timeline / gallery).
 *
 * Layout port từ mockup `cins-journey-desktop.html` v2. Onboarding KHÔNG render
 * ở đây nữa: nếu `giai_doan === null` → server-side redirect sang `/onboarding`
 * full page.
 *
 * Hiện server pass `milestones=[]` và `galleryPinned/galleryItems=[]` cho user
 * mới — timeline/gallery sẽ tự rơi vào empty state. Khi backend ổn định, adapter
 * trong `lib/journey/...` sẽ map DB row → MilestoneItem & gallery types.
 */
export function JourneyView({
  slugFromRoute,
  profile,
  stats,
  isOwner,
  freshlyOnboarded,
  milestones,
  galleryPinned,
  galleryItems,
  editProfileInitial,
  filterVisibility,
  viewerProfileId = null,
  coAuthorPendingInvites = [],
  activeView = "journey",
  friends = [],
}: Props) {
  void freshlyOnboarded;

  return (
    <div className="cins-journey-page">
      <div className="j-shell">
        <JourneySidebar
          profile={profile}
          stats={stats}
          isOwner={isOwner}
          editProfileInitial={editProfileInitial}
          viewerProfileId={viewerProfileId}
          activeView={activeView}
          friendCount={friends.length}
        />
        {activeView === "gallery" ? (
          <JourneyGalleryGridView pinned={galleryPinned} items={galleryItems} />
        ) : activeView === "friends" ? (
          <JourneyFriendsView friends={friends} />
        ) : (
          <JourneyTimeline
            isOwner={isOwner}
            ownerName={profile.tenHienThi || `@${slugFromRoute}`}
            ownerSlug={profile.slug || slugFromRoute}
            ownerAvatarUrl={profile.avatarUrl}
            milestones={milestones}
            filterVisibility={filterVisibility}
            viewerProfileId={viewerProfileId}
            coAuthorPendingInvites={coAuthorPendingInvites}
          />
        )}
        {activeView === "journey" ? (
          <JourneyGalleryAside
            ownerSlug={slugFromRoute}
            totalTacPham={stats.tacPham}
            pinned={galleryPinned}
            items={galleryItems}
          />
        ) : null}
      </div>
    </div>
  );
}

import { cache } from "react";

import { fetchGalleryForUser, fetchGalleryMainPage } from "@/lib/journey/gallery-page-fetch";
import { fetchJourneySwitchNavCounts } from "@/lib/journey/journey-nav-counts";
import {
  fetchMilestoneNavStats,
  fetchMilestoneTimelinePage,
} from "@/lib/journey/milestones-page-fetch";
import { loadOutboundMembershipPendingForUser } from "@/lib/journey/membership-milestone";
import { loadPendingCoSoStaffInvites } from "@/lib/to-chuc/co-so-staff-invite";
import { listPendingCongDongInviteNotifications } from "@/lib/cong-dong/invite";
import { loadPendingCoAuthorInvites } from "@/lib/social/co-author";
import { listMutualFriendProfilesPage } from "@/lib/social/ket-ban";

/**
 * Request-level dedupe cho Journey page — nhiều Suspense boundary gọi cùng
 * fetch trong 1 request mà không lặp query DB. Không phải cross-request cache.
 */
export const getCachedMilestoneTimelinePage = cache(fetchMilestoneTimelinePage);
export const getCachedMilestoneNavStats = cache(fetchMilestoneNavStats);
export const getCachedGalleryForUser = cache(fetchGalleryForUser);
export const getCachedGalleryMainPage = cache(fetchGalleryMainPage);
export const getCachedMutualFriendsPage = cache(listMutualFriendProfilesPage);
export const getCachedJourneySwitchNavCounts = cache(fetchJourneySwitchNavCounts);
export const getCachedPendingCoAuthorInvites = cache(loadPendingCoAuthorInvites);
export const getCachedPendingCoSoStaffInvites = cache(loadPendingCoSoStaffInvites);
export const getCachedPendingCongDongInvites = cache(
  listPendingCongDongInviteNotifications,
);
export const getCachedOutboundMembershipPending = cache(
  loadOutboundMembershipPendingForUser,
);

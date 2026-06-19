import { redirect } from "next/navigation";

import { HomeWorldJourneyClient } from "@/components/cins/home-v2/HomeWorldJourneyClient";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCachedJourneySwitchNavCounts } from "@/lib/journey/journey-page-cache";
import {
  getAvatarUrl,
  getProfileCoverUrl,
  normalizeSocialLinks,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { listLinhVucForHub } from "@/lib/career/queries";
import { buildWorldJourneyFilterChips } from "@/lib/cins/worldJourneyFeedFilters";

import "@/app/[slug]/journey/journey.css";

/** Trang chủ đã đăng nhập — World Journey feed + Journey sidebar. */
export async function HomeWorldJourneyMain() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.slug) return null;

  const { owner, error } = await fetchOwnerBySlug(session.profile.slug);
  if (error || !owner) return null;

  if (owner.giai_doan === null) {
    redirect("/onboarding");
  }

  const emailPublic = owner.visibility_email === "public";
  const editProfileInitial: EditProfileInitial = {
    tenHienThi: owner.ten_hien_thi ?? "",
    bio: owner.bio ?? "",
    tinhThanh: owner.tinh_thanh ?? "",
    emailLienHe: owner.email_lien_he ?? session.email ?? "",
    visibilityEmail: emailPublic ? "public" : "private",
    mxhLinks: normalizeSocialLinks(owner.mxh_links).map((l) => ({
      label: l.label,
      url: l.url,
    })),
    giaiDoan: owner.giai_doan ?? "moi_bat_dau",
  };

  const countsPromise = getCachedJourneySwitchNavCounts({
    ownerId: owner.id,
  }).then(({ friendCount, orgCount }) => ({ friendCount, orgCount }));

  const linhVucs = await listLinhVucForHub();
  const filterChips = buildWorldJourneyFilterChips(linhVucs);

  return (
    <HomeWorldJourneyClient
      sidebarProfile={{
        id: owner.id,
        slug: owner.slug,
        tenHienThi: owner.ten_hien_thi,
        avatarUrl: getAvatarUrl(owner.avatar_id),
        coverUrl: getProfileCoverUrl(owner.cover_id),
        bio: owner.bio,
        tinhThanh: owner.tinh_thanh,
        emailLienHe: owner.email_lien_he ?? session.email ?? null,
        mxhLinks: owner.mxh_links,
        aiSummaryJourney: owner.ai_summary_journey,
        giaiDoan: owner.giai_doan,
      }}
      editProfileInitial={editProfileInitial}
      countsPromise={countsPromise}
      viewerProfileId={session.profile.id}
      ownerAvatarId={owner.avatar_id}
      filterChips={filterChips}
    />
  );
}

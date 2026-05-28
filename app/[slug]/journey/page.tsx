import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { JourneyView } from "@/components/journey/JourneyView";
import {
  getCurrentSessionAndProfile,
  type GiaiDoan,
} from "@/lib/auth/session";
import {
  normalizeLoaiMocVisibility,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";
import { fetchGalleryForUser } from "@/lib/journey/gallery-fetch";
import { fetchMilestonesForUser } from "@/lib/journey/milestones-fetch";
import { loadPendingCoAuthorInvites } from "@/lib/social/co-author";
import { listMutualFriendProfiles } from "@/lib/social/follow";
import {
  getAvatarUrl,
  getProfileCoverUrl,
  normalizeSocialLinks,
} from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ welcome?: string; view?: string }>;

type OwnerRow = {
  id: string;
  auth_user_id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  ai_summary_journey: string | null;
  giai_doan: GiaiDoan | null;
  tinh_thanh: string | null;
  email_lien_he: string | null;
  visibility_email: string | null;
  mxh_links: unknown;
  cho_phep_chat_an_danh: boolean | null;
  /* JSONB: { [loai_moc_enum]: "public" | "private" }. Missing = public. */
  journey_loai_moc_visibility: Record<string, unknown> | null;
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Journey · ${slug} · CINS`,
    description: `Hành trình sáng tạo của ${slug} trên CINS.`,
    robots: { index: false, follow: false },
  };
}

export async function renderJourneyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { welcome, view } = await searchParams;

  const session = await getCurrentSessionAndProfile();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}`)}`);
  }

  const admin = createServiceRoleClient();
  const { data: owner, error } = await admin
    .from("user_nguoi_dung")
    .select(
      "id, auth_user_id, slug, ten_hien_thi, avatar_id, cover_id, bio, ai_summary_journey, giai_doan, tinh_thanh, email_lien_he, visibility_email, mxh_links, cho_phep_chat_an_danh, journey_loai_moc_visibility",
    )
    .eq("slug", slug)
    .maybeSingle<OwnerRow>();

  if (error || !owner) {
    notFound();
  }

  const isOwner = owner.auth_user_id === session.authUserId;

  /* Owner chưa hoàn tất onboarding → đi về /onboarding (full page). Tránh
     render Journey trống với modal overlay vô nghĩa. */
  if (isOwner && owner.giai_doan === null) {
    redirect("/onboarding");
  }

  /* Guest xem profile chưa onboarding → ẩn (private until ready). */
  if (!isOwner && owner.giai_doan === null) {
    notFound();
  }

  /* `visibility_email` enum trong DB: public / friends / private. Owner luôn
   * thấy email mình; guest chỉ thấy khi `public`. */
  const emailPublic = owner.visibility_email === "public";
  const emailForView = isOwner || emailPublic ? owner.email_lien_he : null;

  /* Milestones + stats — fetch từ `content_cot_moc` + `content_tac_pham`. */
  const { milestones, stats: milestoneStats } = await fetchMilestonesForUser({
    userId: owner.id,
    isOwner,
    viewerId: session.profile?.id ?? null,
  });

  const coAuthorPendingInvites =
    isOwner && session.profile
      ? await loadPendingCoAuthorInvites(session.profile.id)
      : [];
  const friends = await listMutualFriendProfiles(owner.id);
  const activeView =
    view === "gallery" || view === "friends" ? view : "journey";
  /* Gallery — tổng hợp tác phẩm có `cover_id` từ cột mốc `feature` /
     `public`. Feature → pinned banner 16:9, public → grid item 1:1. Bài
     `theo_nhom` / `chi_minh` không đưa vào (riêng tư hoặc cần nhóm
     boundary chưa wire). */
  const {
    pinned: galleryPinned,
    items: galleryItems,
    totalTacPham: galleryTotalTacPham,
  } = await fetchGalleryForUser({
    userId: owner.id,
    ownerSlug: owner.slug,
  });
  const stats = {
    cotMoc: milestoneStats.tacPham,
    cotMocVerified: milestoneStats.cotMocVerified,
    tacPham: galleryTotalTacPham,
    toChuc: 0,
  };

  /* Filter visibility map cho built-in loai_moc rows.
     - Owner: render toàn bộ + nút toggle.
     - Visitor: ẩn các row owner đã đánh dấu private. */
  const filterVisibility: LoaiMocVisibilityMap = normalizeLoaiMocVisibility(
    owner.journey_loai_moc_visibility,
  );

  /* Snapshot full profile cho modal "Chỉnh sửa hồ sơ" — chỉ tạo khi owner. Modal
     dùng cùng `updateProfile` server action; client không cần fetch lại DB.
     Email pre-fill ưu tiên `email_lien_he` (DB), fallback `session.email` (auth)
     — đỡ user gõ lại email mỗi lần. */
  const editProfileInitial: EditProfileInitial | undefined = isOwner
    ? {
        tenHienThi: owner.ten_hien_thi ?? "",
        bio: owner.bio ?? "",
        tinhThanh: owner.tinh_thanh ?? "",
        emailLienHe: owner.email_lien_he ?? session.email ?? "",
        visibilityEmail: emailPublic ? "public" : "private",
        mxhLinks: normalizeSocialLinks(owner.mxh_links).map((l) => ({
          label: l.label,
          url: l.url,
        })),
        /* Owner đã onboarded (đảm bảo bởi redirect ở trên) → giai_doan non-null. */
        giaiDoan: owner.giai_doan ?? "moi_bat_dau",
      }
    : undefined;

  return (
    <CinsShell data-screen-label="Journey">
      <JourneyView
        slugFromRoute={slug}
        profile={{
          id: owner.id,
          slug: owner.slug,
          tenHienThi: owner.ten_hien_thi,
          avatarUrl: getAvatarUrl(owner.avatar_id),
          coverUrl: getProfileCoverUrl(owner.cover_id),
          bio: owner.bio,
          tinhThanh: owner.tinh_thanh,
          emailLienHe: emailForView,
          mxhLinks: owner.mxh_links,
          aiSummaryJourney: owner.ai_summary_journey,
          giaiDoan: owner.giai_doan,
        }}
        stats={stats}
        isOwner={isOwner}
        freshlyOnboarded={welcome === "1"}
        milestones={milestones}
        galleryPinned={galleryPinned}
        galleryItems={galleryItems}
        editProfileInitial={editProfileInitial}
        viewerProfileId={session.profile?.id ?? null}
        coAuthorPendingInvites={coAuthorPendingInvites}
        activeView={activeView}
        friends={friends}
        filterVisibility={filterVisibility}
      />
    </CinsShell>
  );
}

export default async function LegacyJourneyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { welcome, view } = await searchParams;
  const qs = new URLSearchParams();
  if (welcome) qs.set("welcome", welcome);
  if (view) qs.set("view", view);
  const query = qs.toString();
  redirect(`/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`);
}

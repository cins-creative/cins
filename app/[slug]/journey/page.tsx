import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { JourneyProfileShell } from "@/app/[slug]/_components/JourneyProfileShell";
import { JourneySidebarNavCounts } from "@/app/[slug]/_components/JourneySidebarNavCounts";
import { CinsShell } from "@/components/cins/CinsShell";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import type { JourneyProfileView } from "@/components/journey/JourneySidebar";
import {
  getCurrentSessionAndProfile,
  type GiaiDoan,
} from "@/lib/auth/session";
import {
  normalizeLoaiMocVisibility,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";
import { parseComposeSearchParams } from "@/lib/journey/compose-types";
import {
  getAvatarUrl,
  getProfileCoverUrl,
  normalizeSocialLinks,
} from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ welcome?: string; view?: string; compose?: string; edit?: string }>;

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
  const { welcome, view, compose, edit } = await searchParams;

  const session = await getCurrentSessionAndProfile();

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

  const isOwner = session
    ? owner.auth_user_id === session.authUserId
    : false;

  if (isOwner && owner.giai_doan === null) {
    redirect("/onboarding");
  }

  if (!isOwner && owner.giai_doan === null) {
    notFound();
  }

  const emailPublic = owner.visibility_email === "public";
  const emailForView = isOwner || emailPublic ? owner.email_lien_he : null;

  const activeView: JourneyProfileView =
    view === "gallery" || view === "friends" ? view : "journey";

  const filterVisibility: LoaiMocVisibilityMap = normalizeLoaiMocVisibility(
    owner.journey_loai_moc_visibility,
  );

  const editProfileInitial: EditProfileInitial | undefined = isOwner
    ? {
        tenHienThi: owner.ten_hien_thi ?? "",
        bio: owner.bio ?? "",
        tinhThanh: owner.tinh_thanh ?? "",
        emailLienHe: owner.email_lien_he ?? session?.email ?? "",
        visibilityEmail: emailPublic ? "public" : "private",
        mxhLinks: normalizeSocialLinks(owner.mxh_links).map((l) => ({
          label: l.label,
          url: l.url,
        })),
        giaiDoan: owner.giai_doan ?? "moi_bat_dau",
      }
    : undefined;

  void welcome;

  const ownerName = owner.ten_hien_thi || `@${slug}`;
  const ownerAvatarUrl = getAvatarUrl(owner.avatar_id);
  const viewerProfileId = session?.profile?.id ?? null;

  const switchNav = (
    <JourneySidebarNavCounts ownerSlug={owner.slug} />
  );

  const initialCompose = isOwner
    ? parseComposeSearchParams(
        (() => {
          const params = new URLSearchParams();
          if (compose) params.set("compose", compose);
          if (edit) params.set("edit", edit);
          return params;
        })(),
      )
    : null;

  return (
    <CinsShell data-screen-label="Journey">
      <div className="cins-journey-page">
        <JourneyProfileShell
          activeView={activeView}
          owner={owner}
          ownerAvatarUrl={ownerAvatarUrl}
          ownerCoverUrl={getProfileCoverUrl(owner.cover_id)}
          emailForView={emailForView}
          ownerName={ownerName}
          isOwner={isOwner}
          viewerProfileId={viewerProfileId}
          filterVisibility={filterVisibility}
          editProfileInitial={editProfileInitial}
          switchNav={switchNav}
          initialCompose={initialCompose}
        />
      </div>
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

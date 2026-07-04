import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { StudioDetailView } from "@/components/to-chuc/StudioDetailView";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCurrentUserSystemRole } from "@/lib/auth/system-role";
import { getOrgAdminStatus, getOrgMemberStatus } from "@/lib/truong/org-admin";
import { loadOrgBaiDangBookmarkSocial } from "@/lib/truong/org-bai-dang-bookmark";
import { getStudioDetailPayloadCached } from "@/lib/to-chuc/studio-page-queries";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  slug: string;
};

export async function StudioDetailLoader({ slug }: Props) {
  const payload = await getStudioDetailPayloadCached(slug);
  if (!payload) notFound();

  const session = await getCurrentSessionAndProfile();
  const viewerProfileId = session?.profile?.id ?? null;

  const postIds = [...payload.baidang, ...payload.showcase].map((p) => p.id);

  const [canEdit, isOrgMember, bookmarkSocial, systemRole] = await Promise.all([
    getOrgAdminStatus(slug, viewerProfileId),
    getOrgMemberStatus(slug, viewerProfileId),
    loadOrgBaiDangBookmarkSocial(postIds, viewerProfileId),
    getCurrentUserSystemRole(),
  ]);

  const hydrate = (post: TruongBaiDang): TruongBaiDang => {
    const social = bookmarkSocial[post.id];
    if (!social) return post;
    return {
      ...post,
      viewerBookmarked: social.bookmarked,
      bookmarkCount: social.bookmarkCount,
    };
  };

  const payloadWithSocial = {
    ...payload,
    baidang: payload.baidang.map(hydrate),
    showcase: payload.showcase.map(hydrate),
  };

  return (
    <CinsShell data-screen-label="Studio-chi-tiet">
      <div
        className={`tdh-page tdh-page--v6 tdh-page--cso tdh-page--studio${canEdit ? " tdh-page--can-edit" : ""}`}
      >
        <StudioDetailView
          payload={payloadWithSocial}
          canEdit={canEdit}
          isOrgMember={isOrgMember}
          viewerProfileId={viewerProfileId}
          systemRole={systemRole}
        />
      </div>
    </CinsShell>
  );
}

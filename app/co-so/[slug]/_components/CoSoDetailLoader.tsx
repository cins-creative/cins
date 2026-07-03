import { notFound } from "next/navigation";

import { CoSoDetailView } from "@/components/co-so/CoSoDetailView";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentUserSystemRole } from "@/lib/auth/system-role";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadOrgBaiDangBookmarkSocial } from "@/lib/truong/org-bai-dang-bookmark";
import { getOrgAdminStatus, getOrgMemberStatus } from "@/lib/truong/org-admin";
import {
  canViewerManageKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc";
import { getCoSoDetailPayloadCached } from "@/lib/to-chuc/co-so-page-queries";
import { fetchStudioJobs } from "@/lib/to-chuc/studio-tuyen-dung-queries";

type Props = {
  slug: string;
};

export async function CoSoDetailLoader({ slug }: Props) {
  const payload = await getCoSoDetailPayloadCached(slug);
  if (!payload) notFound();

  const session = await getCurrentSessionAndProfile();
  const viewerProfileId = session?.profile?.id ?? null;
  const postIds = payload.baidang.map((p) => p.id);

  const [canEdit, isOrgMember, canManageKhoaHoc, bookmarkSocial, systemRole] =
    await Promise.all([
      getOrgAdminStatus(slug, viewerProfileId),
      getOrgMemberStatus(slug, viewerProfileId),
      canViewerManageKhoaHoc(viewerProfileId, payload.school.id),
      loadOrgBaiDangBookmarkSocial(postIds, viewerProfileId),
      getCurrentUserSystemRole(),
    ]);

  const jobs = await fetchStudioJobs(payload.school.id, canEdit);

  const payloadWithSocial = {
    ...payload,
    baidang: payload.baidang.map((post) => {
      const social = bookmarkSocial[post.id];
      if (!social) return post;
      return {
        ...post,
        viewerBookmarked: social.bookmarked,
        bookmarkCount: social.bookmarkCount,
      };
    }),
  };

  return (
    <CinsShell data-screen-label="Co-so-chi-tiet">
      <div
        className={`tdh-page tdh-page--v6 tdh-page--cso${canEdit ? " tdh-page--can-edit" : ""}`}
      >
        <CoSoDetailView
          payload={payloadWithSocial}
          canEdit={canEdit}
          isOrgMember={isOrgMember}
          canManageKhoaHoc={canManageKhoaHoc}
          systemRole={systemRole}
          jobs={jobs}
          viewerLoggedIn={Boolean(viewerProfileId)}
        />
      </div>
    </CinsShell>
  );
}

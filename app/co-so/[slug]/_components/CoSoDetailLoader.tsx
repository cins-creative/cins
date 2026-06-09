import { notFound } from "next/navigation";

import { CoSoDetailView } from "@/components/co-so/CoSoDetailView";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadOrgBaiDangBookmarkSocial } from "@/lib/truong/org-bai-dang-bookmark";
import { getOrgAdminStatus } from "@/lib/truong/org-admin";
import { getCoSoDetailPayloadCached } from "@/lib/to-chuc/co-so-page-queries";

type Props = {
  slug: string;
};

export async function CoSoDetailLoader({ slug }: Props) {
  const payload = await getCoSoDetailPayloadCached(slug);
  if (!payload) notFound();

  const session = await getCurrentSessionAndProfile();
  const canEdit = await getOrgAdminStatus(slug, session?.profile?.id ?? null);
  const viewerProfileId = session?.profile?.id ?? null;

  const postIds = payload.baidang.map((p) => p.id);
  const bookmarkSocial = await loadOrgBaiDangBookmarkSocial(
    postIds,
    viewerProfileId,
  );
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
        <CoSoDetailView payload={payloadWithSocial} canEdit={canEdit} />
      </div>
    </CinsShell>
  );
}

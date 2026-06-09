import { notFound } from "next/navigation";

import { TruongDetailView } from "@/components/truong/TruongDetailView";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadOrgBaiDangBookmarkSocial } from "@/lib/truong/org-bai-dang-bookmark";
import { getOrgAdminStatus } from "@/lib/truong/org-admin";
import { getTruongPagePayload } from "@/lib/truong/queries";

type Props = {
  slug: string;
};

export async function TruongDetailLoader({ slug }: Props) {
  const payload = await getTruongPagePayload(slug);
  if (!payload) notFound();

  const session = await getCurrentSessionAndProfile();
  const canEdit = await getOrgAdminStatus(slug, session?.authUserId ?? null);
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
    <CinsShell data-screen-label="Truong-chi-tiet">
      <div className={`tdh-page tdh-page--v6${canEdit ? " tdh-page--can-edit" : ""}`}>
        <TruongDetailView payload={payloadWithSocial} canEdit={canEdit} />
      </div>
    </CinsShell>
  );
}

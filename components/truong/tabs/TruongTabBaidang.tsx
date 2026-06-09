"use client";

import { useCallback } from "react";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { OrgBaiDangFilterProvider } from "@/components/truong/OrgBaiDangFilterContext";
import { OrgBaiDangJourneyTimeline } from "@/components/truong/OrgBaiDangJourneyTimeline";
import { TruongBaiDangEditProvider } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = { posts: TruongBaiDang[] };

function TruongTabBaidangContent({
  posts,
  orgId,
}: {
  posts: TruongBaiDang[];
  orgId: string;
}) {
  return (
    <OrgBaiDangFilterProvider orgId={orgId}>
      <TruongBaiDangEditProvider>
        <OrgBaiDangJourneyTimeline posts={posts} />
      </TruongBaiDangEditProvider>
    </OrgBaiDangFilterProvider>
  );
}

export function TruongTabBaidang({ posts: postsProp }: Props) {
  const ctx = useTruongInlineEdit();
  const posts = ctx?.baidang ?? postsProp;

  const onPostPublished = useCallback(
    (post: TruongBaiDang) => {
      if (!ctx) return;
      ctx.setBaidang((list) => [post, ...list]);
      ctx.showToast("Đã đăng bài");
    },
    [ctx],
  );

  const orgId = ctx?.orgId ?? "";

  if (!ctx?.isEditing) {
    if (!orgId) {
      return (
        <TruongBaiDangEditProvider>
          <OrgBaiDangJourneyTimeline posts={posts} />
        </TruongBaiDangEditProvider>
      );
    }
    return <TruongTabBaidangContent posts={posts} orgId={orgId} />;
  }

  const { school } = ctx;

  return (
    <JourneyComposeProvider
      ownerId={orgId}
      ownerSlug={school.slug}
      ownerName={school.ten}
      ownerAvatarId={school.avatar_id ?? school.logo_id}
      isOwner
      orgBaiDangCompose={{
        orgId,
        onPostPublished,
      }}
    >
      <TruongTabBaidangContent posts={posts} orgId={orgId} />
    </JourneyComposeProvider>
  );
}

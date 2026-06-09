"use client";

import { useCallback, useState } from "react";

import { CoSoOrgBaiDangTimeline } from "@/components/co-so/CoSoOrgBaiDangTimeline";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { TruongBaiDangEditProvider } from "@/components/truong/inline/TruongBaiDangEdit";
import type { TruongBaiDang, TruongDetail } from "@/lib/truong/types";
import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";

type Props = {
  posts: TruongBaiDang[];
  school: TruongDetail;
  orgId: string;
  canEdit: boolean;
  filters: CoSoFilterChip[];
};

function CoSoTabBaidangContent({
  posts,
  composeEnabled,
  ownerSlug,
  filters,
}: {
  posts: TruongBaiDang[];
  composeEnabled: boolean;
  ownerSlug?: string;
  filters: CoSoFilterChip[];
}) {
  return (
    <TruongBaiDangEditProvider>
      <CoSoOrgBaiDangTimeline
        posts={posts}
        composeEnabled={composeEnabled}
        ownerSlug={ownerSlug}
        orgFilters={filters}
      />
    </TruongBaiDangEditProvider>
  );
}

export function CoSoTabBaidang({
  posts: initialPosts,
  school,
  orgId,
  canEdit,
  filters,
}: Props) {
  const [posts, setPosts] = useState(initialPosts);

  const onPostPublished = useCallback((post: TruongBaiDang) => {
    setPosts((list) => [post, ...list]);
  }, []);

  if (!canEdit) {
    return (
      <CoSoTabBaidangContent
        posts={posts}
        composeEnabled={false}
        filters={filters}
      />
    );
  }

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
      <CoSoTabBaidangContent
        posts={posts}
        composeEnabled
        ownerSlug={school.slug}
        filters={filters}
      />
    </JourneyComposeProvider>
  );
}

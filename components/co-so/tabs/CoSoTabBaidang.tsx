"use client";

import { useCallback } from "react";

import { CoSoOrgBaiDangTimeline } from "@/components/co-so/CoSoOrgBaiDangTimeline";
import { OrgBaiDangPostDetailView } from "@/components/truong/OrgBaiDangPostDetailView";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { TruongBaiDangEditProvider } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { isTruongBaiDangScheduled } from "@/lib/truong/org-bai-dang-schedule";
import type { TruongBaiDang, TruongDetail } from "@/lib/truong/types";
import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";

type Props = {
  posts: TruongBaiDang[];
  school: TruongDetail;
  orgId: string;
  orgSlug: string;
  canEdit: boolean;
  filters: CoSoFilterChip[];
  activeBaiDangId?: string | null;
};

function CoSoTabBaidangContent({
  posts,
  school,
  composeEnabled,
  filters,
  activePost,
  orgSlug,
}: {
  posts: TruongBaiDang[];
  school: TruongDetail;
  composeEnabled: boolean;
  filters: CoSoFilterChip[];
  activePost: TruongBaiDang | null;
  orgSlug: string;
}) {
  if (activePost) {
    return (
      <OrgBaiDangPostDetailView
        post={activePost}
        school={school}
        orgSlug={orgSlug}
      />
    );
  }

  return (
    <TruongBaiDangEditProvider>
      <CoSoOrgBaiDangTimeline
        posts={posts}
        owner={school}
        composeEnabled={composeEnabled}
        orgFilters={filters}
      />
    </TruongBaiDangEditProvider>
  );
}

export function CoSoTabBaidang({
  posts: postsProp,
  school,
  orgId,
  orgSlug,
  canEdit,
  filters,
  activeBaiDangId = null,
}: Props) {
  const ctx = useTruongInlineEdit();
  const posts = ctx?.baidang ?? postsProp;
  const activePost = activeBaiDangId
    ? posts.find((p) => p.id === activeBaiDangId) ?? null
    : null;

  const onPostPublished = useCallback(
    (post: TruongBaiDang) => {
      if (!ctx) return;
      if (isTruongBaiDangScheduled(post)) {
        ctx.setScheduledBaidang((list) => [
          post,
          ...list.filter((p) => p.id !== post.id),
        ]);
        ctx.setBaidang((list) => list.filter((p) => p.id !== post.id));
        ctx.showToast("Đã hẹn đăng bài");
        return;
      }
      ctx.setScheduledBaidang((list) => list.filter((p) => p.id !== post.id));
      ctx.setBaidang((list) => [post, ...list.filter((p) => p.id !== post.id)]);
      ctx.showToast("Đã đăng bài");
    },
    [ctx],
  );

  const onPostUpdated = useCallback(
    (post: TruongBaiDang) => {
      if (!ctx) return;
      const merge = (prev: TruongBaiDang): TruongBaiDang => ({
        ...prev,
        ...post,
        noiDungBlocks: post.noiDungBlocks ?? prev.noiDungBlocks,
        personalFilters: prev.personalFilters,
        personalFilterSlugs: prev.personalFilterSlugs,
      });
      if (isTruongBaiDangScheduled(post)) {
        ctx.setScheduledBaidang((list) => {
          const has = list.some((p) => p.id === post.id);
          if (has) {
            return list.map((p) => (p.id === post.id ? merge(p) : p));
          }
          return [post, ...list];
        });
        ctx.setBaidang((list) => list.filter((p) => p.id !== post.id));
        ctx.showToast("Đã cập nhật lịch hẹn");
        return;
      }
      ctx.setScheduledBaidang((list) => list.filter((p) => p.id !== post.id));
      ctx.setBaidang((list) => {
        const has = list.some((p) => p.id === post.id);
        if (has) {
          return list.map((p) => (p.id === post.id ? merge(p) : p));
        }
        return [post, ...list];
      });
      ctx.showToast("Đã cập nhật bài đăng");
    },
    [ctx],
  );

  if (!canEdit || !ctx?.isEditing) {
    return (
      <CoSoTabBaidangContent
        posts={posts}
        school={school}
        composeEnabled={false}
        filters={filters}
        activePost={activePost}
        orgSlug={orgSlug}
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
        onPostUpdated,
      }}
    >
      <CoSoTabBaidangContent
        posts={posts}
        school={school}
        composeEnabled
        filters={filters}
        activePost={activePost}
        orgSlug={orgSlug}
      />
    </JourneyComposeProvider>
  );
}

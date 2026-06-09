"use client";

import { useCallback } from "react";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { OrgBaiDangFilterProvider } from "@/components/truong/OrgBaiDangFilterContext";
import { OrgBaiDangJourneyTimeline } from "@/components/truong/OrgBaiDangJourneyTimeline";
import { TruongBaiDangEditProvider } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { isTruongBaiDangScheduled } from "@/lib/truong/org-bai-dang-schedule";
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
      const merge = (
        prev: TruongBaiDang,
      ): TruongBaiDang => ({
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
        onPostUpdated,
      }}
    >
      <TruongTabBaidangContent posts={posts} orgId={orgId} />
    </JourneyComposeProvider>
  );
}

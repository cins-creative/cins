"use client";

import { useCallback, useMemo } from "react";

import { CoSoOrgBaiDangTimeline } from "@/components/co-so/CoSoOrgBaiDangTimeline";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { TruongBaiDangEditProvider } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { isTruongBaiDangScheduled } from "@/lib/truong/org-bai-dang-schedule";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";
import { STUDIO_SHOWCASE_LOAI } from "@/lib/to-chuc/studio-page-config";

type StudioVariant = "bai-dang" | "showcase";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten"
>;

type Props = {
  variant: StudioVariant;
  /** Fallback khi không có `TruongInlineEditProvider` (khách). */
  posts: TruongBaiDang[];
  owner?: OrgOwner | null;
  guestEmptyMessage?: string;
};

function isShowcasePost(post: TruongBaiDang): boolean {
  return (
    String(post.loai_bai_dang ?? "")
      .trim()
      .toLowerCase() === STUDIO_SHOWCASE_LOAI
  );
}

function filterByVariant(
  posts: ReadonlyArray<TruongBaiDang>,
  variant: StudioVariant,
): TruongBaiDang[] {
  return posts.filter((p) =>
    variant === "showcase" ? isShowcasePost(p) : !isShowcasePost(p),
  );
}

export function StudioTabBaiDang({
  variant,
  posts: postsProp,
  owner = null,
  guestEmptyMessage,
}: Props) {
  const ctx = useTruongInlineEdit();
  const allPosts = ctx?.baidang ?? postsProp;
  const posts = useMemo(
    () => filterByVariant(allPosts, variant),
    [allPosts, variant],
  );

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
      ctx.showToast(
        variant === "showcase" ? "Đã thêm vào showcase" : "Đã đăng bài",
      );
    },
    [ctx, variant],
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
          if (has) return list.map((p) => (p.id === post.id ? merge(p) : p));
          return [post, ...list];
        });
        ctx.setBaidang((list) => list.filter((p) => p.id !== post.id));
        ctx.showToast("Đã cập nhật lịch hẹn");
        return;
      }
      ctx.setScheduledBaidang((list) => list.filter((p) => p.id !== post.id));
      ctx.setBaidang((list) => {
        const has = list.some((p) => p.id === post.id);
        if (has) return list.map((p) => (p.id === post.id ? merge(p) : p));
        return [post, ...list];
      });
      ctx.showToast("Đã cập nhật bài đăng");
    },
    [ctx],
  );

  const content = (
    <TruongBaiDangEditProvider>
      <CoSoOrgBaiDangTimeline
        posts={posts}
        owner={owner}
        composeEnabled={Boolean(ctx?.isEditing)}
        guestEmptyMessage={guestEmptyMessage}
      />
    </TruongBaiDangEditProvider>
  );

  if (!ctx?.isEditing) {
    return content;
  }

  const { school, orgId } = ctx;

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
        ...(variant === "showcase"
          ? { forceLoaiBaiDang: STUDIO_SHOWCASE_LOAI }
          : {}),
      }}
    >
      {content}
    </JourneyComposeProvider>
  );
}

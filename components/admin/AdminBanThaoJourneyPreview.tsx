"use client";

import { CinsChatProvider } from "@/components/cins/CinsChatProvider";
import { JourneyPostBody } from "@/components/journey/JourneyPostBody";
import type { Block } from "@/lib/editor/types";
import type { MilestonePostDetail } from "@/lib/journey/milestone-post-types";

export type AdminBanThaoJourneyPreviewProps = {
  banThaoId: string;
  tieuDe: string | null;
  moTa: string | null;
  taoLuc: string;
  blocks: Block[];
  coverSeed: string | null;
  owner: {
    id: string;
    slug: string;
    tenHienThi: string;
    avatarId: string | null;
  } | null;
};

function buildPreviewDetail(
  props: AdminBanThaoJourneyPreviewProps,
): MilestonePostDetail {
  const owner = props.owner ?? {
    id: "preview-owner",
    slug: "preview",
    tenHienThi: "Preview",
    avatarId: null,
  };
  const title = props.tieuDe?.trim() || "(không tiêu đề)";
  const postSlug = `ban-thao-${props.banThaoId.slice(0, 8)}`;

  return {
    milestone: {
      id: `preview-ms-${props.banThaoId}`,
      tieuDe: title,
      moTa: props.moTa,
      thoiDiem: props.taoLuc,
      loaiMoc: "du_an",
      cheDoHienThi: "public",
      verifiedBy: null,
      verifier: null,
    },
    owner: {
      id: owner.id,
      slug: owner.slug,
      tenHienThi: owner.tenHienThi,
      avatarId: owner.avatarId,
    },
    posts: [
      {
        id: `preview-post-${props.banThaoId}`,
        slug: postSlug,
        tieuDe: title,
        moTa: props.moTa,
        noiDungHtml: null,
        noiDungBlocks: props.blocks.length > 0 ? props.blocks : null,
        coverId: props.coverSeed,
        articleTags: [],
        contributors: [],
      },
    ],
    comments: [],
    viewerCanComment: false,
    viewerIsOwner: false,
    social: {
      viewerLiked: false,
      viewerDisliked: false,
      viewerBookmarked: false,
      viewerCommented: false,
      viewerReactionEmoji: null,
      topReactionEmoji: null,
      likeCount: 0,
      dislikeCount: 0,
      bookmarkCount: 0,
      commentCount: 0,
    },
  };
}

export function AdminBanThaoJourneyPreview(
  props: AdminBanThaoJourneyPreviewProps,
) {
  const detail = buildPreviewDetail(props);
  const postSlug = detail.posts[0]?.slug ?? null;

  return (
    /* Admin shell không có CinsChatShellBridge — JourneyUserPopover cần context. */
    <CinsChatProvider viewerProfileId={null}>
      <div className="tkai-journey-preview j-post-page" data-preview="ban-thao">
        <JourneyPostBody
          initialDetail={detail}
          postSlug={postSlug}
          isOwner={false}
          hideOpenLink
          layout="split"
          commentsSlot={
            <p className="tkai-journey-preview__comments-note">
              Bản xem trước — bình luận tắt.
            </p>
          }
        />
      </div>
    </CinsChatProvider>
  );
}

"use client";

import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import type { Block } from "@/lib/editor/types";
import {
  blocksForArticleCardUnfold,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
import { resolveBaiDangUnfoldTomTat } from "@/lib/truong/bai-dang-content";

type Props = {
  title: string;
  tomTat?: string | null;
  /** Legacy HTML — khôi phục mô tả khi `tom_tat` bị cắt 200 ký tự. */
  noiDungHtml?: string | null;
  coverId?: string | null;
  blocks: ReadonlyArray<Block>;
  /** Card timeline giữ hero trên card — unfold chỉ render blocks. */
  blocksOnly?: boolean;
};

/** Unfold bài article — title · sub · blocks (`cover_id` chỉ thumb Gallery). */
export function JourneyUnfoldArticleContent({
  title,
  tomTat,
  noiDungHtml = null,
  coverId: _coverId,
  blocks,
  blocksOnly = false,
}: Props) {
  if (blocksOnly) {
    const unfoldBlocks = blocksForArticleCardUnfold(tomTat, blocks);
    if (unfoldBlocks.length === 0) return null;
    return <PostBlockRenderer blocks={unfoldBlocks} />;
  }
  const showTitle = shouldShowMilestoneCardTitle(title, blocks, tomTat);
  const unfoldTomTat =
    resolveBaiDangUnfoldTomTat({
      tom_tat: tomTat,
      noi_dung: noiDungHtml,
      noiDungBlocks: blocks,
    }) ?? tomTat?.trim() ?? null;

  return (
    <>
      {showTitle ? <h1 className="title-in title-ro">{title}</h1> : null}
      {unfoldTomTat ? (
        <p className="sub-in sub-ro">{unfoldTomTat}</p>
      ) : null}
      <PostBlockRenderer blocks={blocks} />
    </>
  );
}

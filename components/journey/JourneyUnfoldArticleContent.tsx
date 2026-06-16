"use client";

import { PostBlocksRenderer, PostCover } from "@/components/editor/PostRenderer";
import type { Block } from "@/lib/editor/types";
import { shouldShowMilestoneCardTitle } from "@/lib/journey/post-media";
import { resolveBaiDangUnfoldTomTat } from "@/lib/truong/bai-dang-content";
import { sanitizePersistableCoverId } from "@/lib/truong/image-ref";

type Props = {
  title: string;
  tomTat?: string | null;
  /** Legacy HTML — khôi phục mô tả khi `tom_tat` bị cắt 200 ký tự. */
  noiDungHtml?: string | null;
  coverId?: string | null;
  blocks: ReadonlyArray<Block>;
};

/** Unfold bài article — khớp editor canvas: title · sub · cover · blocks. */
export function JourneyUnfoldArticleContent({
  title,
  tomTat,
  noiDungHtml = null,
  coverId,
  blocks,
}: Props) {
  const coverSeed = sanitizePersistableCoverId(coverId, blocks);
  const showTitle = shouldShowMilestoneCardTitle(title, blocks);
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
      {coverSeed ? <PostCover seed={coverSeed} /> : null}
      <PostBlocksRenderer blocks={blocks} />
    </>
  );
}

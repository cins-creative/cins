"use client";

import { useMemo } from "react";

import { PostReadOnlyBlock } from "@/components/editor/PostRenderer";
import { ImageGrid } from "@/components/journey/ImageGrid";
import type { Block } from "@/lib/editor/types";
import { groupBlocksForRender } from "@/lib/journey/image-grid";

type Props = {
  blocks: ReadonlyArray<Block>;
  /** Modal / permalink — tự phát video khi mở. */
  mediaAutoplay?: boolean;
  /**
   * Permalink / media column — hiện đủ ảnh album (không cắt 6 + overlay +N).
   * Timeline card giữ mặc định false.
   */
  showAllImages?: boolean;
};

/**
 * Render Journey post blocks — gom các block `imgs` liên tiếp thành
 * Facebook-style image grid (render-time only, không đổi DB).
 */
export function PostBlockRenderer({
  blocks,
  mediaAutoplay = false,
  showAllImages = false,
}: Props) {
  const groups = useMemo(() => groupBlocksForRender(blocks), [blocks]);

  /* Chỉ block embed ĐẦU TIÊN được tự phát — nếu bài có nhiều video, để tất cả
     autoplay cùng lúc sẽ chồng tiếng (echo). Các video còn lại chờ user bấm. */
  const firstEmbedBlockId = useMemo(() => {
    for (const g of groups) {
      if (g.type === "block" && g.block.loai === "embed") return g.block.id;
    }
    return null;
  }, [groups]);

  if (groups.length === 0) return null;

  let imageGroupIndex = 0;

  return (
    <div className="blocks blocks-readonly post-blocks-fb">
      {groups.map((group, i) => {
        if (group.type === "image_grid") {
          const isFirstGroup = imageGroupIndex === 0;
          imageGroupIndex += 1;
          return (
            <div
              key={`grid-${i}`}
              className="block block-image-grid"
              data-block-type="imgs"
            >
              <div className="block-inner">
                <ImageGrid
                  images={group.images}
                  isFirstGroup={isFirstGroup}
                  readOnly
                  timelineLightbox
                  showAllImages={showAllImages}
                  albumLayoutMode={group.albumLayout}
                />
              </div>
            </div>
          );
        }

        return (
          <div
            key={group.block.id}
            className="block"
            data-block-type={group.block.loai}
          >
            <div className="block-inner">
              <PostReadOnlyBlock
                block={group.block}
                mediaAutoplay={
                  mediaAutoplay && group.block.id === firstEmbedBlockId
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

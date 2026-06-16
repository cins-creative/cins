"use client";

import { useMemo } from "react";

import { PostReadOnlyBlock } from "@/components/editor/PostRenderer";
import { ImageGrid } from "@/components/journey/ImageGrid";
import type { Block } from "@/lib/editor/types";
import { groupBlocksForRender } from "@/lib/journey/image-grid";

type Props = {
  blocks: ReadonlyArray<Block>;
};

/**
 * Render Journey post blocks — gom các block `imgs` liên tiếp thành
 * Facebook-style image grid (render-time only, không đổi DB).
 */
export function PostBlockRenderer({ blocks }: Props) {
  const groups = useMemo(() => groupBlocksForRender(blocks), [blocks]);

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
                  albumCarousel
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
              <PostReadOnlyBlock block={group.block} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

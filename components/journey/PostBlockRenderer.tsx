"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Fragment } from "react";

import { PostReadOnlyBlock } from "@/components/editor/PostRenderer";
import { PostReadOnlyImgs } from "@/components/editor/PostReadOnlyImgs";
import { DeferredMount } from "@/components/journey/DeferredMount";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { ImageLightbox } from "@/components/journey/ImageLightbox";
import type { Block } from "@/lib/editor/types";
import {
  extractImagesFromImgsBlock,
  extractPhotoGridImagesFromBlocks,
  groupBlocksForRender,
} from "@/lib/journey/image-grid";

/** Nhóm ảnh đầu mount ngay; phần còn lại chờ gần viewport. */
const EAGER_IMAGE_GROUPS = 2;

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

function maybeDeferImage(
  eager: boolean,
  key: string,
  node: ReactNode,
): ReactNode {
  if (eager) return <Fragment key={key}>{node}</Fragment>;
  return (
    <DeferredMount key={key} minHeight={280} rootMargin="600px 0px">
      {node}
    </DeferredMount>
  );
}

/**
 * Render Journey post blocks — gom các block `imgs` liên tiếp thành
 * Facebook-style image grid (render-time only, không đổi DB).
 * Lightbox filmstrip dùng pool mọi ảnh trong bài (giống chat gallery).
 */
export function PostBlockRenderer({
  blocks,
  mediaAutoplay = false,
  showAllImages = false,
}: Props) {
  const groups = useMemo(() => groupBlocksForRender(blocks), [blocks]);
  const allImages = useMemo(
    () => extractPhotoGridImagesFromBlocks(blocks),
    [blocks],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sharedLightbox = allImages.length > 1;

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
  let imageOffset = 0;

  return (
    <div className="blocks blocks-readonly post-blocks-fb">
      {groups.map((group, i) => {
        if (group.type === "image_grid") {
          const isFirstGroup = imageGroupIndex === 0;
          const eager = imageGroupIndex < EAGER_IMAGE_GROUPS;
          imageGroupIndex += 1;
          const offset = imageOffset;
          imageOffset += group.images.length;
          return maybeDeferImage(
            eager,
            `grid-${i}`,
            <div
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
                  lightboxImages={sharedLightbox ? allImages : undefined}
                  lightboxIndex={sharedLightbox ? lightboxIndex : undefined}
                  onLightboxIndexChange={
                    sharedLightbox ? setLightboxIndex : undefined
                  }
                  lightboxIndexOffset={sharedLightbox ? offset : 0}
                  suppressLightbox={sharedLightbox}
                />
              </div>
            </div>,
          );
        }

        const { block } = group;
        if (block.loai === "imgs") {
          const blockImages = extractImagesFromImgsBlock(block);
          const eager = imageGroupIndex < EAGER_IMAGE_GROUPS;
          imageGroupIndex += 1;
          const offset = imageOffset;
          imageOffset += blockImages.length;
          return maybeDeferImage(
            eager,
            block.id,
            <div className="block" data-block-type={block.loai}>
              <div className="block-inner">
                <PostReadOnlyImgs
                  block={block}
                  lightboxImages={sharedLightbox ? allImages : undefined}
                  lightboxIndex={sharedLightbox ? lightboxIndex : undefined}
                  onLightboxIndexChange={
                    sharedLightbox ? setLightboxIndex : undefined
                  }
                  lightboxIndexOffset={sharedLightbox ? offset : 0}
                  suppressLightbox={sharedLightbox}
                />
              </div>
            </div>,
          );
        }

        return (
          <div
            key={block.id}
            className="block"
            data-block-type={block.loai}
          >
            <div className="block-inner">
              <PostReadOnlyBlock
                block={block}
                mediaAutoplay={
                  mediaAutoplay && block.id === firstEmbedBlockId
                }
              />
            </div>
          </div>
        );
      })}

      {sharedLightbox && lightboxIndex !== null ? (
        <ImageLightbox
          images={allImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}

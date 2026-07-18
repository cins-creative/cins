"use client";

import { useMemo, useState } from "react";

import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { ShopKioskBlock } from "@/components/shop/ShopKioskBlock";
import {
  milestoneCardContentKind,
  milestoneCardPhotoGrid,
} from "@/lib/journey/milestone-card-kind";
import {
  chiChuNeedsCollapse,
  splitChiChuParagraphs,
} from "@/lib/journey/plain-text-bg";
import { chiChuBodyPlain } from "@/lib/journey/post-media";

type Props = {
  milestone: MilestoneItem;
  /** Người bán — ưu tiên owner cột mốc / tác phẩm. */
  sellerUserId?: string | null;
  sellerName?: string | null;
  sellerSlug?: string | null;
  viewerProfileId?: string | null;
};

/** Bài gốc gắn quầy — cùng card Journey + ticker bán hàng. */
export function ShopQuayReviewPost({
  milestone,
  sellerUserId,
  sellerName,
  sellerSlug,
  viewerProfileId = null,
}: Props) {
  const blocks = milestone.noiDungBlocks ?? null;
  const body = milestone.tacPhamMoTa ?? milestone.body ?? null;
  const preview = milestone.media?.[0] ?? null;
  const hasCoverPreview = Boolean(preview?.src);
  const cardKind = milestoneCardContentKind(blocks, hasCoverPreview, body);
  const photoGridImages = milestoneCardPhotoGrid(
    blocks,
    hasCoverPreview,
    body,
  );
  const isArticle = cardKind === "article";
  const isTextCard = cardKind === "text";

  const milestoneId =
    milestone.cotMocId?.trim() || milestone.id.trim();
  const resolvedSellerId =
    sellerUserId?.trim() ||
    milestone.postOwnerId?.trim() ||
    milestone.lensOwnerId?.trim() ||
    null;
  const resolvedSellerName =
    sellerName?.trim() ||
    milestone.lensOwnerName?.trim() ||
    null;
  const resolvedSellerSlug =
    sellerSlug?.trim() ||
    milestone.postOwnerSlug?.trim() ||
    milestone.lensOwnerSlug?.trim() ||
    null;
  const resolvedSellerAvatar = milestone.lensOwnerAvatarUrl ?? null;

  const chiChuCardText = useMemo(() => {
    if (!isTextCard) return null;
    return chiChuBodyPlain(milestone.title, body, blocks);
  }, [isTextCard, milestone.title, body, blocks]);

  const chiChuParagraphs = useMemo(
    () => (chiChuCardText ? splitChiChuParagraphs(chiChuCardText) : []),
    [chiChuCardText],
  );
  const chiChuCollapsible = Boolean(
    chiChuCardText &&
      chiChuNeedsCollapse(chiChuCardText, chiChuParagraphs.length),
  );
  const [chiChuExpanded, setChiChuExpanded] = useState(true);

  return (
    <div className="j-m-body-wrap shop-quay-review-post">
      <div
        className={
          "j-m-card jcard jcard--" +
          cardKind +
          (isArticle ? " has-unfold is-expanded" : "")
        }
      >
        <div className="j-m-card-main">
          <div className="jcard-body">
            <div className="jcard-content">
              <JourneyMilestoneCardBodyContent
                title={milestone.title}
                body={body}
                noiDungBlocks={blocks}
                preview={preview}
                photoGridImages={photoGridImages}
                articleTags={milestone.articleTags}
                contentKind={cardKind}
                hasLinkedPost={Boolean(milestone.postSlug)}
                captionExpandMode={
                  cardKind === "photo" || cardKind === "video"
                    ? "inline"
                    : "overlay"
                }
                chiChuExpanded={
                  chiChuCollapsible ? chiChuExpanded : undefined
                }
                onChiChuExpandedChange={
                  chiChuCollapsible ? setChiChuExpanded : undefined
                }
                expandTrigger={
                  isArticle
                    ? { enabled: false, expanded: true }
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {milestoneId ? (
          <ShopKioskBlock
            milestoneId={milestoneId}
            sellerUserId={resolvedSellerId}
            viewerProfileId={viewerProfileId}
            sellerName={resolvedSellerName}
            sellerAvatarUrl={resolvedSellerAvatar}
            sellerSlug={resolvedSellerSlug}
          />
        ) : null}

        {isArticle && blocks && blocks.length > 0 ? (
          <div className="j-m-card-unfold" data-open="true" aria-hidden={false}>
            <div className="j-m-card-unfold-inner">
              <div className="cins-editor-page cins-post-view j-m-unfold-post">
                <JourneyUnfoldArticleContent
                  blocksOnly
                  title={milestone.title}
                  tomTat={body}
                  blocks={blocks}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

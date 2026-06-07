"use client";

import { ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import { congDongImageUrl } from "@/lib/cong-dong/images";
import type { CongDongJourneyMirror, CongDongPostMedia } from "@/lib/cong-dong/types";
import {
  milestoneCardContentKind,
  milestoneCardPhotoGrid,
} from "@/lib/journey/milestone-card-kind";

type ExpandTriggerProps = {
  enabled: boolean;
  expanded?: boolean;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
};

type Props = {
  journeyMirror?: CongDongJourneyMirror | null;
  fallbackTitle?: string | null;
  fallbackBody: string;
  fallbackMedia?: CongDongPostMedia[];
  expandTrigger?: ExpandTriggerProps;
  unfold?: ReactNode;
  onCollapse?: () => void;
};

export function CongDongFeedPostContent({
  journeyMirror,
  fallbackTitle,
  fallbackBody,
  fallbackMedia = [],
  expandTrigger,
  unfold,
  onCollapse,
}: Props) {
  if (journeyMirror) {
    return (
      <JourneyMirrorBody
        mirror={journeyMirror}
        expandTrigger={expandTrigger}
        unfold={unfold}
        onCollapse={onCollapse}
      />
    );
  }

  const coverMedia = fallbackMedia[0];
  const coverSrc = coverMedia
    ? congDongImageUrl(coverMedia.cloudflareId)
    : null;
  const isStatusPost = !fallbackTitle && fallbackMedia.length === 0;

  return (
    <>
      {fallbackTitle ? <h3 className="cd-v4-p-title">{fallbackTitle}</h3> : null}
      <p
        className={`cd-v4-p-text${isStatusPost ? " is-status-only" : ""}`}
      >
        {fallbackBody}
      </p>
      {coverSrc ? (
        <div className="cd-v4-p-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc} alt="" loading="lazy" />
        </div>
      ) : null}
      {fallbackMedia.length > 1 ? (
        <div className="cd-v4-p-media-grid">
          {fallbackMedia.slice(1).map((m) => {
            const src = congDongImageUrl(m.cloudflareId);
            if (!src) return null;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={m.id} src={src} alt="" loading="lazy" />
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function JourneyMirrorBody({
  mirror,
  expandTrigger,
  unfold,
  onCollapse,
}: {
  mirror: CongDongJourneyMirror;
  expandTrigger?: ExpandTriggerProps;
  unfold?: ReactNode;
  onCollapse?: () => void;
}) {
  const blocks = mirror.noiDungBlocks;
  const cardKind = milestoneCardContentKind(blocks);
  const isArticle = cardKind === "article";
  const photoGridImages = milestoneCardPhotoGrid(blocks);
  const isExpanded = expandTrigger?.expanded ?? false;
  const showUnfold = isExpanded && Boolean(unfold);

  return (
    <div className="j-m-body-wrap">
      <div
        className={
          "j-m-card jcard jcard--" +
          cardKind +
          (isArticle ? " has-unfold" : "") +
          (showUnfold ? " is-expanded" : isArticle ? " is-collapsed" : "")
        }
      >
        <JourneyMilestoneCardBodyContent
          title={mirror.tieuDe}
          body={mirror.moTa}
          noiDungBlocks={blocks}
          preview={mirror.previewMedia}
          photoGridImages={photoGridImages}
          articleTags={mirror.articleTags}
          expandTrigger={expandTrigger}
        />

        {showUnfold ? (
          <div className="j-m-card-unfold" data-open="true" aria-hidden={false}>
            {unfold}
          </div>
        ) : null}

        {showUnfold && onCollapse ? (
          <div className="jcard-actions">
            <span className="action-spacer" aria-hidden />
            <button
              type="button"
              className="jcard-unfold-toggle"
              onClick={onCollapse}
              aria-label="Thu gọn"
            >
              <ChevronUp size={15} strokeWidth={2.2} aria-hidden />
              <span>Thu gọn</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";

import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import {
  commentReactionLabel,
  type CommentReactionSummary,
} from "@/lib/social/comments/types";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";

type Props = {
  commentId: string;
  reaction: CommentReactionSummary;
  disabled?: boolean;
  onToggle: (emoji: string, active: boolean) => void;
};

/**
 * Pill cảm xúc bình luận — emoji bật/tắt reaction; số mở danh sách người (giống JourneyLikeButton).
 */
export function CommentReactionPill({
  commentId,
  reaction,
  disabled = false,
  onToggle,
}: Props) {
  const isCoarse = useCoarsePointer();
  const [actorsOpen, setActorsOpen] = useState(false);
  const label = commentReactionLabel(reaction.emoji);
  const showCount = reaction.count > 0;
  const canRevealActors = reaction.count > 0;

  const toggle = useCallback(() => {
    onToggle(reaction.emoji, !reaction.viewerReacted);
  }, [onToggle, reaction.emoji, reaction.viewerReacted]);

  const openActors = useCallback(() => {
    if (canRevealActors) setActorsOpen(true);
  }, [canRevealActors]);

  const actorsModal =
    canRevealActors && actorsOpen ? (
      <JourneySocialActorsModal
        open={actorsOpen}
        onClose={() => setActorsOpen(false)}
        kind="like"
        loaiDoiTuong="binh_luan"
        idDoiTuong={commentId}
        emoji={reaction.emoji}
      />
    ) : null;

  const emojiSpan = (
    <span className="post-comments-reaction-emoji" aria-hidden>
      {label}
    </span>
  );

  const countSpan = showCount ? (
    <span className="post-comments-reaction-count" aria-hidden>
      {reaction.count}
    </span>
  ) : null;

  if (isCoarse) {
    return (
      <>
        <JourneyActionTouchChip
          className={
            "post-comments-reaction-pill" +
            (reaction.viewerReacted ? " is-active" : "")
          }
          ariaLabel={
            reaction.count > 1
              ? `${label} ${reaction.count} lượt`
              : label
          }
          ariaPressed={reaction.viewerReacted}
          disabled={disabled}
          onPress={toggle}
          onLongPress={canRevealActors ? openActors : undefined}
          longPressHint={
            canRevealActors ? "Giữ để xem người bày tỏ" : undefined
          }
        >
          {emojiSpan}
          {countSpan}
        </JourneyActionTouchChip>
        {actorsModal}
      </>
    );
  }

  if (!showCount) {
    return (
      <button
        type="button"
        className={
          "post-comments-reaction-pill" +
          (reaction.viewerReacted ? " is-active" : "")
        }
        disabled={disabled}
        aria-label={label}
        aria-pressed={reaction.viewerReacted}
        onClick={toggle}
      >
        {emojiSpan}
      </button>
    );
  }

  return (
    <>
      <span
        className={
          "post-comments-reaction-pill post-comments-reaction-pill--split" +
          (reaction.viewerReacted ? " is-active" : "")
        }
      >
        <button
          type="button"
          className="post-comments-reaction-part post-comments-reaction-part--emoji"
          disabled={disabled}
          aria-label={label}
          aria-pressed={reaction.viewerReacted}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
        >
          {emojiSpan}
        </button>
        <button
          type="button"
          className="post-comments-reaction-part post-comments-reaction-part--count"
          aria-label={
            reaction.count > 1
              ? `Xem ${reaction.count} người bày tỏ ${label}`
              : `Xem người bày tỏ ${label}`
          }
          onClick={(event) => {
            event.stopPropagation();
            openActors();
          }}
        >
          {countSpan}
        </button>
      </span>
      {actorsModal}
    </>
  );
}

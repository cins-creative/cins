"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import type { CommentReactionSummary } from "@/lib/social/comments/types";
import { REACTION_EMOJI } from "@/lib/social/reaction-emoji";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
import { Heart, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  commentId: string;
  reactions: CommentReactionSummary[];
  disabled?: boolean;
  onToggle: (emoji: string, active: boolean) => void;
};

function reactionOf(
  reactions: CommentReactionSummary[],
  emoji: string,
): CommentReactionSummary | undefined {
  return reactions.find((r) => r.emoji === emoji);
}

/**
 * Like / dislike trên bình luận — cùng pattern JourneyLikeButton / JourneyDislikeButton.
 */
export function CommentVoteButtons({
  commentId,
  reactions,
  disabled = false,
  onToggle,
}: Props) {
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const isCoarse = useCoarsePointer();
  const [actorsOpen, setActorsOpen] = useState<"like" | "dislike" | null>(null);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (authGate) {
        authGate.requireAuth(action);
        return;
      }
      router.push("/login");
    },
    [authGate, router],
  );

  const like = reactionOf(reactions, REACTION_EMOJI.LIKE);
  const dislike = reactionOf(reactions, REACTION_EMOJI.DISLIKE);
  const liked = Boolean(like?.viewerReacted);
  const disliked = Boolean(dislike?.viewerReacted);
  const likeCount = like?.count ?? 0;
  const dislikeCount = dislike?.count ?? 0;
  const showLikeCount = likeCount > 0;
  const showDislikeCount = dislikeCount > 0;

  const toggleLike = useCallback(() => {
    requireAuth(() => onToggle(REACTION_EMOJI.LIKE, !liked));
  }, [liked, onToggle, requireAuth]);

  const toggleDislike = useCallback(() => {
    requireAuth(() => onToggle(REACTION_EMOJI.DISLIKE, !disliked));
  }, [disliked, onToggle, requireAuth]);

  const likeActorsModal =
    actorsOpen === "like" && likeCount > 0 ? (
      <JourneySocialActorsModal
        open
        onClose={() => setActorsOpen(null)}
        kind="like"
        loaiDoiTuong="binh_luan"
        idDoiTuong={commentId}
        emoji={REACTION_EMOJI.LIKE}
      />
    ) : null;

  const dislikeActorsModal =
    actorsOpen === "dislike" && dislikeCount > 0 ? (
      <JourneySocialActorsModal
        open
        onClose={() => setActorsOpen(null)}
        kind="dislike"
        loaiDoiTuong="binh_luan"
        idDoiTuong={commentId}
        emoji={REACTION_EMOJI.DISLIKE}
      />
    ) : null;

  const likeIcon = (
    <Heart
      size={14}
      strokeWidth={1.8}
      fill={liked ? "currentColor" : "none"}
      aria-hidden
    />
  );
  const dislikeIcon = (
    <ThumbsDown
      size={14}
      strokeWidth={1.8}
      fill={disliked ? "currentColor" : "none"}
      aria-hidden
    />
  );

  if (isCoarse) {
    return (
      <div className="post-comments-votes">
        <JourneyActionTouchChip
          className={`action-btn${liked ? " is-liked" : ""}`}
          ariaLabel={liked ? "Bỏ thích" : "Thích"}
          ariaPressed={liked}
          disabled={disabled}
          onPress={toggleLike}
          onLongPress={
            likeCount > 0 ? () => setActorsOpen("like") : undefined
          }
          longPressHint={
            likeCount > 0 ? "Giữ để xem người thích" : undefined
          }
        >
          {likeIcon}
          {showLikeCount ? (
            <span className="action-btn-count action-btn-count--static" aria-hidden>
              {likeCount}
            </span>
          ) : null}
        </JourneyActionTouchChip>
        <JourneyActionTouchChip
          className={`action-btn${disliked ? " is-disliked" : ""}`}
          ariaLabel={disliked ? "Bỏ không thích" : "Không thích"}
          ariaPressed={disliked}
          disabled={disabled}
          onPress={toggleDislike}
          onLongPress={
            dislikeCount > 0 ? () => setActorsOpen("dislike") : undefined
          }
          longPressHint={
            dislikeCount > 0 ? "Giữ để xem người không thích" : undefined
          }
        >
          {dislikeIcon}
          {showDislikeCount ? (
            <span className="action-btn-count action-btn-count--static" aria-hidden>
              {`−${dislikeCount}`}
            </span>
          ) : null}
        </JourneyActionTouchChip>
        {likeActorsModal}
        {dislikeActorsModal}
      </div>
    );
  }

  return (
    <div className="post-comments-votes">
      {showLikeCount ? (
        <span className={`action-btn action-btn--split${liked ? " is-liked" : ""}`}>
          <button
            type="button"
            className="action-btn-part action-btn-part--icon"
            aria-label={liked ? "Bỏ thích" : "Thích"}
            aria-pressed={liked}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              toggleLike();
            }}
          >
            {likeIcon}
          </button>
          <button
            type="button"
            className="action-btn-count"
            aria-label={
              likeCount > 1
                ? `Xem ${likeCount} người thích`
                : "Xem người thích"
            }
            onClick={(event) => {
              event.stopPropagation();
              setActorsOpen("like");
            }}
          >
            {likeCount}
          </button>
        </span>
      ) : (
        <button
          type="button"
          className={`action-btn${liked ? " is-liked" : ""}`}
          aria-label={liked ? "Bỏ thích" : "Thích"}
          aria-pressed={liked}
          disabled={disabled}
          onClick={toggleLike}
        >
          {likeIcon}
        </button>
      )}

      {showDislikeCount ? (
        <span
          className={`action-btn action-btn--split${disliked ? " is-disliked" : ""}`}
        >
          <button
            type="button"
            className="action-btn-part action-btn-part--icon"
            aria-label={disliked ? "Bỏ không thích" : "Không thích"}
            aria-pressed={disliked}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              toggleDislike();
            }}
          >
            {dislikeIcon}
          </button>
          <button
            type="button"
            className="action-btn-count"
            aria-label={
              dislikeCount > 1
                ? `Xem ${dislikeCount} người không thích`
                : "Xem người không thích"
            }
            onClick={(event) => {
              event.stopPropagation();
              setActorsOpen("dislike");
            }}
          >
            {`−${dislikeCount}`}
          </button>
        </span>
      ) : (
        <button
          type="button"
          className={`action-btn${disliked ? " is-disliked" : ""}`}
          aria-label={disliked ? "Bỏ không thích" : "Không thích"}
          aria-pressed={disliked}
          disabled={disabled}
          onClick={toggleDislike}
        >
          {dislikeIcon}
        </button>
      )}

      {likeActorsModal}
      {dislikeActorsModal}
    </div>
  );
}

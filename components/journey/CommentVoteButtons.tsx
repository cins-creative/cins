"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import {
  EMOJI_PICK_DELAY_MS,
  useReactionEmojiPicker,
} from "@/components/journey/ReactionEmojiPicker";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import type {
  CommentReactionKey,
  CommentReactionSummary,
} from "@/lib/social/comments/types";
import {
  REACTION_EMOJI,
  isPositiveReactionEmoji,
  reactionEmojiLabel,
} from "@/lib/social/reaction-emoji";
import { Heart, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

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
 * Like / dislike trên bình luận — picker nhiều emoji giống JourneyLikeButton.
 */
export function CommentVoteButtons({
  commentId,
  reactions,
  disabled = false,
  onToggle,
}: Props) {
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const closePickerRef = useRef<() => void>(() => {});
  const openPickerRef = useRef<() => void>(() => {});
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
  const viewerPositive = reactions.find(
    (r) => r.viewerReacted && isPositiveReactionEmoji(r.emoji),
  );
  const liked = Boolean(viewerPositive);
  const reactionEmoji = viewerPositive?.emoji ?? null;
  const disliked = Boolean(dislike?.viewerReacted);
  const likeCount = like?.count ?? 0;
  const dislikeCount = dislike?.count ?? 0;
  const showLikeCount = likeCount > 0 && (!reactionEmoji || reactionEmoji === REACTION_EMOJI.LIKE);
  const showDislikeCount = dislikeCount > 0;
  const positiveTotal = useMemo(
    () =>
      reactions.reduce(
        (sum, r) =>
          isPositiveReactionEmoji(r.emoji) ? sum + r.count : sum,
        0,
      ),
    [reactions],
  );

  const toggleDislike = useCallback(() => {
    requireAuth(() => onToggle(REACTION_EMOJI.DISLIKE, !disliked));
  }, [disliked, onToggle, requireAuth]);

  const onPickEmoji = useCallback(
    (key: CommentReactionKey) => {
      requireAuth(() => {
        if (
          key === reactionEmoji ||
          (key === REACTION_EMOJI.LIKE && !reactionEmoji && liked)
        ) {
          closePickerRef.current();
          return;
        }
        onToggle(key, true);
        closePickerRef.current();
      });
    },
    [liked, onToggle, reactionEmoji, requireAuth],
  );

  const pickerApi = useReactionEmojiPicker({
    reactionEmoji,
    liked,
    pending: disabled,
    actorsCount: positiveTotal,
    showArcActors: positiveTotal > 0,
    portalDesktop: true,
    onPickEmoji,
    onOpenActors: () => setActorsOpen("like"),
  });
  closePickerRef.current = pickerApi.closePicker;
  openPickerRef.current = pickerApi.openPicker;

  const {
    wrapRef,
    isCoarse,
    useArc,
    pickerOpen,
    picker,
    consumeClickRef,
    openMobilePicker,
    desktopHoverProps,
  } = pickerApi;

  const onHeartPress = useCallback(() => {
    requireAuth(() => {
      if (liked) {
        closePickerRef.current();
        onToggle(reactionEmoji ?? REACTION_EMOJI.LIKE, false);
        return;
      }
      onToggle(REACTION_EMOJI.LIKE, true);
      if (!useArc) openPickerRef.current();
    });
  }, [liked, onToggle, reactionEmoji, requireAuth, useArc]);

  const likeActorsModal =
    actorsOpen === "like" && positiveTotal > 0 ? (
      <JourneySocialActorsModal
        open
        onClose={() => setActorsOpen(null)}
        kind="like"
        loaiDoiTuong="binh_luan"
        idDoiTuong={commentId}
        emoji={reactionEmoji ?? REACTION_EMOJI.LIKE}
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

  const glyphEmoji =
    liked &&
    reactionEmoji &&
    reactionEmoji !== REACTION_EMOJI.LIKE &&
    isPositiveReactionEmoji(reactionEmoji)
      ? reactionEmoji
      : null;

  const likeIcon = glyphEmoji ? (
    <span className="j-reaction-btn-emoji" aria-hidden>
      {reactionEmojiLabel(glyphEmoji)}
    </span>
  ) : (
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

  const heartButtonClass = `action-btn${liked ? " is-liked" : ""}${
    pickerOpen ? " is-picker-open" : ""
  }`;

  const dislikeBtn = isCoarse ? (
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
  ) : showDislikeCount ? (
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
  );

  const likeBtn = useArc ? (
    <span
      className={`j-reaction-wrap${pickerOpen ? " is-picking" : ""}`}
      ref={wrapRef}
    >
      <JourneyActionTouchChip
        className={heartButtonClass}
        ariaLabel={liked ? "Bỏ thích" : "Thích"}
        ariaPressed={liked}
        disabled={disabled}
        onPress={() => {
          if (consumeClickRef.current) {
            consumeClickRef.current = false;
            return;
          }
          onHeartPress();
        }}
        onLongPress={openMobilePicker}
        delayMs={EMOJI_PICK_DELAY_MS}
        moveThresholdPx={80}
        longPressHint="Vuốt để chọn cảm xúc hoặc xem người đã bày tỏ"
        buttonProps={{
          "aria-expanded": pickerOpen,
        }}
      >
        {likeIcon}
        {showLikeCount ? (
          <span className="action-btn-count action-btn-count--static" aria-hidden>
            {likeCount}
          </span>
        ) : null}
      </JourneyActionTouchChip>
      {picker}
    </span>
  ) : showLikeCount ? (
    <span className="j-reaction-wrap" ref={wrapRef} {...desktopHoverProps}>
      <span
        className={`action-btn action-btn--split${liked ? " is-liked" : ""}${
          pickerOpen ? " is-picker-open" : ""
        }`}
      >
        <button
          type="button"
          className="action-btn-part action-btn-part--icon"
          aria-label={liked ? "Bỏ thích" : "Thích"}
          aria-pressed={liked}
          aria-expanded={pickerOpen}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onHeartPress();
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
      {picker}
    </span>
  ) : (
    <span className="j-reaction-wrap" ref={wrapRef} {...desktopHoverProps}>
      <button
        type="button"
        className={heartButtonClass}
        aria-label={liked ? "Bỏ thích" : "Thích"}
        aria-pressed={liked}
        aria-expanded={pickerOpen}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onHeartPress();
        }}
      >
        {likeIcon}
      </button>
      {picker}
    </span>
  );

  return (
    <div className="post-comments-votes">
      {likeBtn}
      {dislikeBtn}
      {likeActorsModal}
      {dislikeActorsModal}
    </div>
  );
}

"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import {
  EMOJI_PICK_DELAY_MS,
  useReactionEmojiPicker,
} from "@/components/journey/ReactionEmojiPicker";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import type { CommentReactionKey } from "@/lib/social/comments/types";
import {
  REACTION_EMOJI,
  isPositiveReactionEmoji,
  reactionEmojiLabel,
} from "@/lib/social/reaction-emoji";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialCount?: number;
  /** Emoji cảm xúc hiện tại của viewer (`heart`, `joy`, …). */
  initialReactionEmoji?: string | null;
  /** Emoji được thả nhiều nhất — hiện trên nút khi viewer chưa thả cảm xúc. */
  initialTopReactionEmoji?: string | null;
  showCount?: boolean;
  loaiDoiTuong?: string;
  actorsMediaLabel?: JourneyActionActorsConfig["mediaLabel"];
  disableActorsReveal?: boolean;
  sharePath?: string | null;
  shareTitle?: string | null;
  commentCount?: number;
  /** Gate đăng nhập tùy chỉnh (vd. cộng đồng). */
  onRequireAuth?: (then: () => void) => void;
};

type SocialEvent = CustomEvent<{
  milestoneId: string;
  liked?: boolean;
  likeCount?: number;
  disliked?: boolean;
  dislikeCount?: number;
  reactionEmoji?: string | null;
  bookmarked?: boolean;
  bookmarkCount?: number;
}>;

export function JourneyLikeButton({
  milestoneId,
  initialLiked = false,
  initialCount = 0,
  initialReactionEmoji = null,
  initialTopReactionEmoji = null,
  showCount = false,
  loaiDoiTuong = SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  actorsMediaLabel,
  disableActorsReveal = false,
  onRequireAuth,
}: Props) {
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const requireAuth = useCallback(
    (action: () => void) => {
      if (onRequireAuth) {
        onRequireAuth(action);
        return;
      }
      if (authGate) {
        authGate.requireAuth(action);
        return;
      }
      router.push("/login");
    },
    [authGate, onRequireAuth, router],
  );
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [reactionEmoji, setReactionEmoji] = useState<string | null>(() =>
    initialLiked
      ? initialReactionEmoji && isPositiveReactionEmoji(initialReactionEmoji)
        ? initialReactionEmoji
        : REACTION_EMOJI.LIKE
      : null,
  );
  const [pending, startTransition] = useTransition();
  const [actorsOpen, setActorsOpen] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const closePickerRef = useRef<() => void>(() => {});
  const openPickerRef = useRef<() => void>(() => {});

  useEffect(() => {
    queueMicrotask(() => {
      setLiked(initialLiked);
      setCount(initialCount);
      setReactionEmoji(
        initialLiked
          ? initialReactionEmoji &&
            isPositiveReactionEmoji(initialReactionEmoji)
            ? initialReactionEmoji
            : REACTION_EMOJI.LIKE
          : null,
      );
    });
  }, [initialLiked, initialCount, initialReactionEmoji]);

  useEffect(() => {
    const onSocial = (event: Event) => {
      const detail = (event as SocialEvent).detail;
      if (detail.milestoneId !== milestoneId) return;
      if (typeof detail.likeCount === "number") setCount(detail.likeCount);
      if (detail.disliked === true) {
        setLiked(false);
        setReactionEmoji(null);
        closePickerRef.current();
        return;
      }
      if (typeof detail.liked === "boolean") {
        setLiked(detail.liked);
        if (!detail.liked) setReactionEmoji(null);
      }
      if (detail.reactionEmoji !== undefined) {
        setReactionEmoji(
          detail.reactionEmoji && isPositiveReactionEmoji(detail.reactionEmoji)
            ? detail.reactionEmoji
            : detail.liked
              ? REACTION_EMOJI.LIKE
              : null,
        );
      }
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  const postReaction = useCallback(
    (emoji: string, active: boolean) => {
      const prevLiked = liked;
      const prevCount = count;
      const prevEmoji = reactionEmoji;

      let nextLiked = active;
      let nextCount = prevCount;
      let nextEmoji: string | null = active ? emoji : null;

      if (active) {
        if (!prevLiked) nextCount = prevCount + 1;
        nextLiked = true;
      } else {
        nextLiked = false;
        nextCount = Math.max(0, prevCount - 1);
        nextEmoji = null;
      }

      setLiked(nextLiked);
      setCount(nextCount);
      setReactionEmoji(nextEmoji);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: {
            milestoneId,
            liked: nextLiked,
            likeCount: nextCount,
            reactionEmoji: nextEmoji,
            ...(nextLiked ? { disliked: false } : {}),
          },
        }),
      );

      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: loaiDoiTuong,
            id_doi_tuong: milestoneId,
            emoji,
            active,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) return;
          setLiked(prevLiked);
          setCount(prevCount);
          setReactionEmoji(prevEmoji);
          setPickerErr(
            typeof json.error === "string" ? json.error : "Không gửi được.",
          );
          return;
        }
        const syncedLiked = Boolean(json.liked);
        const syncedCount = Number(json.likeCount ?? json.count ?? nextCount);
        const syncedEmoji =
          typeof json.viewerEmoji === "string" &&
          isPositiveReactionEmoji(json.viewerEmoji)
            ? json.viewerEmoji
            : syncedLiked
              ? emoji
              : null;
        const syncedDisliked = Boolean(json.disliked);
        const syncedDislikeCount =
          typeof json.dislikeCount === "number" ? json.dislikeCount : undefined;
        setLiked(syncedLiked);
        setCount(syncedCount);
        setReactionEmoji(syncedEmoji);
        window.dispatchEvent(
          new CustomEvent("cins:social-action", {
            detail: {
              milestoneId,
              liked: syncedLiked,
              likeCount: syncedCount,
              reactionEmoji: syncedEmoji,
              disliked: syncedDisliked,
              ...(syncedDislikeCount !== undefined
                ? { dislikeCount: syncedDislikeCount }
                : {}),
            },
          }),
        );
      });
    },
    [count, liked, loaiDoiTuong, milestoneId, reactionEmoji],
  );

  /**
   * Tap trái tim:
   * - Desktop: chưa thích → thả tim + mở bảng; đã thích → bỏ thích
   * - Mobile: chỉ thả / bỏ tim — bảng emoji mở khi giữ
   */
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
        postReaction(key, true);
        closePickerRef.current();
      });
    },
    [liked, postReaction, reactionEmoji, requireAuth],
  );

  const pickerApi = useReactionEmojiPicker({
    reactionEmoji,
    liked,
    pending,
    pickerErr,
    actorsCount: count,
    showArcActors: !disableActorsReveal,
    portalDesktop: true,
    onPickEmoji,
    onOpenActors: () => setActorsOpen(true),
  });
  closePickerRef.current = pickerApi.closePicker;
  openPickerRef.current = pickerApi.openPicker;

  const {
    wrapRef,
    useArc,
    pickerOpen,
    picker,
    consumeClickRef,
    openMobilePicker,
    desktopHoverProps,
  } = pickerApi;

  const onHeartPress = useCallback(() => {
    requireAuth(() => {
      setPickerErr(null);
      if (liked) {
        closePickerRef.current();
        postReaction(reactionEmoji ?? REACTION_EMOJI.LIKE, false);
        return;
      }
      postReaction(REACTION_EMOJI.LIKE, true);
      if (!useArc) openPickerRef.current();
    });
  }, [liked, postReaction, reactionEmoji, requireAuth, useArc]);

  const actors = useMemo<JourneyActionActorsConfig | null>(() => {
    if (disableActorsReveal || count <= 0) return null;
    return {
      kind: "like",
      loaiDoiTuong,
      idDoiTuong: milestoneId,
      count,
      mediaLabel: actorsMediaLabel,
    };
  }, [
    actorsMediaLabel,
    count,
    disableActorsReveal,
    loaiDoiTuong,
    milestoneId,
  ]);

  const showCountChip = showCount && count > 0;

  const actorsModal =
    !disableActorsReveal && actorsOpen ? (
      <JourneySocialActorsModal
        open={actorsOpen}
        onClose={() => setActorsOpen(false)}
        kind="like"
        loaiDoiTuong={loaiDoiTuong}
        idDoiTuong={milestoneId}
        mediaLabel={actorsMediaLabel}
      />
    ) : null;

  /* Ưu tiên cảm xúc của chính viewer; nếu chưa thả → emoji được thả nhiều nhất
     (chủ journey thấy được mọi người đang bày tỏ emoji gì). Tim là icon mặc định. */
  const ownEmojiGlyph =
    liked &&
    reactionEmoji &&
    reactionEmoji !== REACTION_EMOJI.LIKE &&
    isPositiveReactionEmoji(reactionEmoji)
      ? reactionEmoji
      : null;
  const topEmojiGlyph =
    !liked &&
    count > 0 &&
    initialTopReactionEmoji &&
    initialTopReactionEmoji !== REACTION_EMOJI.LIKE &&
    isPositiveReactionEmoji(initialTopReactionEmoji)
      ? initialTopReactionEmoji
      : null;
  const glyphEmoji = ownEmojiGlyph ?? topEmojiGlyph;

  const heartIcon = glyphEmoji ? (
    <span className="j-reaction-btn-emoji" aria-hidden>
      {reactionEmojiLabel(glyphEmoji)}
    </span>
  ) : (
    <Heart
      size={16}
      strokeWidth={1.8}
      fill={liked ? "currentColor" : "none"}
      aria-hidden
    />
  );

  const heartButtonClass = `action-btn${liked ? " is-liked" : ""}${
    pickerOpen ? " is-picker-open" : ""
  }`;

  if (useArc) {
    return (
      <span
        className={`j-reaction-wrap${pickerOpen ? " is-picking" : ""}`}
        ref={wrapRef}
      >
        <JourneyActionTouchChip
          className={heartButtonClass}
          ariaLabel={liked ? "Bỏ thích" : "Thích"}
          ariaPressed={liked}
          disabled={pending}
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
          {heartIcon}
          {showCountChip ? (
            <span
              className="action-btn-count action-btn-count--static"
              aria-hidden
            >
              {count}
            </span>
          ) : null}
        </JourneyActionTouchChip>
        {picker}
        {actorsModal}
      </span>
    );
  }

  if (!showCountChip) {
    return (
      <span className="j-reaction-wrap" ref={wrapRef} {...desktopHoverProps}>
        <button
          type="button"
          className={heartButtonClass}
          aria-label={liked ? "Bỏ thích" : "Thích"}
          aria-pressed={liked}
          aria-expanded={pickerOpen}
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation();
            onHeartPress();
          }}
        >
          {heartIcon}
        </button>
        {picker}
      </span>
    );
  }

  return (
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
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation();
            onHeartPress();
          }}
        >
          {heartIcon}
        </button>
        {actors ? (
          <JourneyActionActorsCount actors={actors} />
        ) : (
          <span className="action-btn-count action-btn-count--static" aria-hidden>
            {count}
          </span>
        )}
      </span>
      {picker}
      {actorsModal}
    </span>
  );
}

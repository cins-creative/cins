"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import {
  COMMENT_REACTION_EMOJIS,
  type CommentReactionKey,
} from "@/lib/social/comments/types";
import {
  REACTION_EMOJI,
  isPositiveReactionEmoji,
  reactionEmojiLabel,
} from "@/lib/social/reaction-emoji";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
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

/** Bảng đổi cảm xúc — không gồm dislike (nút riêng). */
const EMOJI_PICKER = COMMENT_REACTION_EMOJIS.filter(
  (e) => e.key !== REACTION_EMOJI.DISLIKE,
);

type Props = {
  milestoneId: string;
  initialLiked?: boolean;
  initialCount?: number;
  /** Emoji cảm xúc hiện tại của viewer (`heart`, `joy`, …). */
  initialReactionEmoji?: string | null;
  showCount?: boolean;
  loaiDoiTuong?: string;
  actorsMediaLabel?: JourneyActionActorsConfig["mediaLabel"];
  disableActorsReveal?: boolean;
  sharePath?: string | null;
  shareTitle?: string | null;
  commentCount?: number;
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
  showCount = false,
  loaiDoiTuong = SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  actorsMediaLabel,
  disableActorsReveal = false,
}: Props) {
  const authGate = useOptionalAuthGate();
  const router = useRouter();
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
  const isCoarse = useCoarsePointer();
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

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
        setPickerOpen(false);
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

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setPickerErr(null);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && wrapRef.current?.contains(target)) return;
      closePicker();
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") closePicker();
    }
    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", onDocPointer);
      document.addEventListener("touchstart", onDocPointer, { passive: true });
    }, 0);
    document.addEventListener("keydown", onEsc);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
      document.removeEventListener("keydown", onEsc);
    };
  }, [closePicker, pickerOpen]);

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
   * Click trái tim:
   * - Chưa thích → thả tim + mở bảng emoji
   * - Đã thích → bỏ thích + đóng bảng
   */
  const onHeartPress = useCallback(() => {
    requireAuth(() => {
      setPickerErr(null);
      if (liked) {
        closePicker();
        postReaction(reactionEmoji ?? REACTION_EMOJI.LIKE, false);
        return;
      }
      postReaction(REACTION_EMOJI.LIKE, true);
      setPickerOpen(true);
    });
  }, [closePicker, liked, postReaction, reactionEmoji, requireAuth]);

  /** Đổi sang emoji khác — giữ tương tác; click ngoài / ❤️ = giữ cảm xúc hiện tại. */
  const onPickEmoji = useCallback(
    (key: CommentReactionKey) => {
      if (key === reactionEmoji || (key === REACTION_EMOJI.LIKE && !reactionEmoji && liked)) {
        closePicker();
        return;
      }
      postReaction(key, true);
      closePicker();
    },
    [closePicker, liked, postReaction, reactionEmoji],
  );

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
  const actorsLabel =
    actorsMediaLabel === "anh" ? "Người thích ảnh" : "Người thích";

  const openActors = useCallback(() => {
    if (actors) setActorsOpen(true);
  }, [actors]);

  const actorsModal =
    actors && actorsOpen ? (
      <JourneySocialActorsModal
        open={actorsOpen}
        onClose={() => setActorsOpen(false)}
        kind={actors.kind}
        loaiDoiTuong={actors.loaiDoiTuong}
        idDoiTuong={actors.idDoiTuong}
        mediaLabel={actors.mediaLabel}
        emoji={actors.emoji}
      />
    ) : null;

  const picker = pickerOpen ? (
    <div className="j-reaction-picker" role="menu" aria-label="Đổi emoji">
      {EMOJI_PICKER.map((e) => {
        const active =
          e.key === reactionEmoji ||
          (e.key === REACTION_EMOJI.LIKE &&
            liked &&
            (!reactionEmoji || reactionEmoji === REACTION_EMOJI.LIKE));
        return (
          <button
            key={e.key}
            type="button"
            role="menuitem"
            className={"j-reaction-picker-opt" + (active ? " is-active" : "")}
            aria-label={
              e.key === REACTION_EMOJI.LIKE ? "Giữ tim" : `Đổi sang ${e.label}`
            }
            disabled={pending}
            onClick={(event) => {
              event.stopPropagation();
              onPickEmoji(e.key);
            }}
          >
            <span className="j-reaction-picker-opt-emoji" aria-hidden>
              {e.label}
            </span>
          </button>
        );
      })}
      <p className="j-reaction-picker-hint">
        Chọn emoji khác nếu muốn · chạm ra ngoài để giữ tim
      </p>
      {pickerErr ? (
        <p className="j-reaction-picker-err" role="alert">
          {pickerErr}
        </p>
      ) : null}
    </div>
  ) : null;

  const showEmojiGlyph =
    liked &&
    reactionEmoji &&
    reactionEmoji !== REACTION_EMOJI.LIKE &&
    isPositiveReactionEmoji(reactionEmoji);

  const heartIcon = showEmojiGlyph ? (
    <span className="j-reaction-btn-emoji" aria-hidden>
      {reactionEmojiLabel(reactionEmoji)}
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

  if (isCoarse) {
    return (
      <span className="j-reaction-wrap" ref={wrapRef}>
        <JourneyActionTouchChip
          className={heartButtonClass}
          ariaLabel={liked ? "Bỏ thích" : "Thích"}
          ariaPressed={liked}
          disabled={pending}
          onPress={onHeartPress}
          onLongPress={actors ? openActors : undefined}
          longPressHint={
            actors ? `Giữ để xem ${actorsLabel.toLowerCase()}` : undefined
          }
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
      <span className="j-reaction-wrap" ref={wrapRef}>
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
    <span className="j-reaction-wrap" ref={wrapRef}>
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

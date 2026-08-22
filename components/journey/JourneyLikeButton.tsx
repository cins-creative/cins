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
import {
  useArcReactionPicker,
  useCoarsePointer,
} from "@/lib/ui/use-coarse-pointer";
import { Heart, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

/** Bảng đổi cảm xúc — 6 emoji một hàng; dislike là nút riêng. */
const EMOJI_PICKER = COMMENT_REACTION_EMOJIS.filter(
  (e) => e.key !== REACTION_EMOJI.DISLIKE,
).slice(0, 6);

/** Mobile option 2: đảo hàng — trái tim ở mép phải, mở picker bắt đầu từ tim. */
const EMOJI_PICKER_ARC = [...EMOJI_PICKER].reverse();
const EMOJI_ARC_DEFAULT_INDEX = EMOJI_PICKER_ARC.length - 1;
const EMOJI_ARC_SLOT_PX = 28;
const EMOJI_ARC_DOWN_PX = 24;
const EMOJI_PICK_DELAY_MS = 280;
/** Lệch trên/dưới quá ngưỡng so với nút reaction → không chọn. */
const EMOJI_PICK_CANCEL_Y = 100;

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
  const isCoarse = useCoarsePointer();
  const useArc = useArcReactionPicker();
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
  const hoverCloseTimer = useRef(0);
  const hotKeyRef = useRef<string | null>(null);
  const gestureMovedRef = useRef(false);
  const consumeClickRef = useRef(false);
  const [hotKey, setHotKey] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(EMOJI_ARC_DEFAULT_INDEX);
  const [actorsHot, setActorsHot] = useState(false);
  const [pickArmed, setPickArmed] = useState(true);
  const pickArmedRef = useRef(true);
  const [portalReady, setPortalReady] = useState(false);
  const [opt2Mounted, setOpt2Mounted] = useState(false);
  const [opt2In, setOpt2In] = useState(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const focusIndexRef = useRef(EMOJI_ARC_DEFAULT_INDEX);
  const actorsHotRef = useRef(false);
  const pickerLayerRef = useRef<HTMLDivElement>(null);

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
    setHotKey(null);
    hotKeyRef.current = null;
    setActorsHot(false);
    actorsHotRef.current = false;
    setPickArmed(true);
    pickArmedRef.current = true;
    originRef.current = null;
    setFocusIndex(EMOJI_ARC_DEFAULT_INDEX);
    focusIndexRef.current = EMOJI_ARC_DEFAULT_INDEX;
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!useArc) {
      setOpt2Mounted(false);
      setOpt2In(false);
      return;
    }
    if (pickerOpen) {
      setOpt2Mounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setOpt2In(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setOpt2In(false);
    const timer = window.setTimeout(() => setOpt2Mounted(false), 240);
    return () => window.clearTimeout(timer);
  }, [pickerOpen, useArc]);

  const openPickerOnHover = useCallback(() => {
    if (isCoarse) return;
    window.clearTimeout(hoverCloseTimer.current);
    setPickerOpen(true);
  }, [isCoarse]);

  const scheduleClosePickerOnLeave = useCallback(() => {
    if (isCoarse) return;
    window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => {
      closePicker();
    }, 160);
  }, [closePicker, isCoarse]);

  useEffect(() => {
    return () => window.clearTimeout(hoverCloseTimer.current);
  }, []);

  useEffect(() => {
    /* Option 2: chỉ mở khi giữ — không bung picker ngay touchstart. */
    if (!isCoarse || useArc) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".action-btn, .j-reaction-picker")) return;
      gestureMovedRef.current = false;
      hotKeyRef.current = null;
      setHotKey(null);
      setPickerErr(null);
      setPickerOpen(true);
    };
    wrap.addEventListener("touchstart", onStart, { passive: true });
    return () => wrap.removeEventListener("touchstart", onStart);
  }, [isCoarse, useArc]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && wrapRef.current?.contains(target)) return;
      if (target && pickerLayerRef.current?.contains(target)) return;
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
   * Tap trái tim:
   * - Desktop: chưa thích → thả tim + mở bảng; đã thích → bỏ thích
   * - Mobile: chỉ thả / bỏ tim — bảng emoji mở khi giữ
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
      if (!isCoarse) setPickerOpen(true);
    });
  }, [closePicker, isCoarse, liked, postReaction, reactionEmoji, requireAuth]);

  const openMobilePicker = useCallback(() => {
    const startKey = EMOJI_PICKER_ARC[EMOJI_ARC_DEFAULT_INDEX]?.key ?? null;
    setPickerErr(null);
    setHotKey(startKey);
    hotKeyRef.current = startKey;
    setFocusIndex(EMOJI_ARC_DEFAULT_INDEX);
    focusIndexRef.current = EMOJI_ARC_DEFAULT_INDEX;
    setActorsHot(false);
    actorsHotRef.current = false;
    setPickArmed(true);
    pickArmedRef.current = true;
    originRef.current = null;
    gestureMovedRef.current = false;
    setPickerOpen(true);
  }, []);

  /** Đổi sang emoji khác — giữ tương tác; click ngoài / ❤️ = giữ cảm xúc hiện tại. */
  const onPickEmoji = useCallback(
    (key: CommentReactionKey) => {
      requireAuth(() => {
        if (
          key === reactionEmoji ||
          (key === REACTION_EMOJI.LIKE && !reactionEmoji && liked)
        ) {
          closePicker();
          return;
        }
        postReaction(key, true);
        closePicker();
      });
    },
    [closePicker, liked, postReaction, reactionEmoji, requireAuth],
  );

  useEffect(() => {
    if (!pickerOpen || !isCoarse) {
      document.documentElement.removeAttribute("data-cins-reaction-picking");
      return;
    }
    document.documentElement.setAttribute("data-cins-reaction-picking", "");

    const pickFromPoint = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const hit = el?.closest("[data-reaction-pick]");
      const key =
        hit instanceof HTMLElement ? hit.dataset.reactionPick ?? null : null;
      hotKeyRef.current = key;
      setHotKey(key);
    };

    const pickFromArc = (x: number, y: number) => {
      if (!originRef.current) originRef.current = { x, y };
      const wrap = wrapRef.current?.getBoundingClientRect();
      const cy = wrap
        ? wrap.top + wrap.height / 2
        : originRef.current.y;
      if (Math.abs(y - cy) > EMOJI_PICK_CANCEL_Y) {
        pickArmedRef.current = false;
        setPickArmed(false);
        actorsHotRef.current = false;
        setActorsHot(false);
        hotKeyRef.current = null;
        setHotKey(null);
        return;
      }
      pickArmedRef.current = true;
      setPickArmed(true);
      const dx = x - originRef.current.x;
      const dy = y - originRef.current.y;
      if (
        showArcActors &&
        dy > EMOJI_ARC_DOWN_PX &&
        dy > Math.abs(dx) * 0.45
      ) {
        actorsHotRef.current = true;
        setActorsHot(true);
        hotKeyRef.current = "actors";
        setHotKey("actors");
        return;
      }
      actorsHotRef.current = false;
      setActorsHot(false);
      const next = Math.min(
        EMOJI_PICKER_ARC.length - 1,
        Math.max(
          0,
          Math.round(EMOJI_ARC_DEFAULT_INDEX + dx / EMOJI_ARC_SLOT_PX),
        ),
      );
      focusIndexRef.current = next;
      setFocusIndex(next);
      const key = EMOJI_PICKER_ARC[next]?.key ?? null;
      hotKeyRef.current = key;
      setHotKey(key);
    };

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      gestureMovedRef.current = true;
      if (event.cancelable) event.preventDefault();
      if (useArc) {
        pickFromArc(touch.clientX, touch.clientY);
        return;
      }
      pickFromPoint(touch.clientX, touch.clientY);
    };

    const onEnd = () => {
      const key = hotKeyRef.current;
      const moved = gestureMovedRef.current;
      if (key === "actors") {
        consumeClickRef.current = true;
        closePicker();
        setActorsOpen(true);
        return;
      }
      if (key) {
        consumeClickRef.current = true;
        onPickEmoji(key as CommentReactionKey);
        return;
      }
      if (moved) consumeClickRef.current = true;
      closePicker();
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      document.documentElement.removeAttribute("data-cins-reaction-picking");
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [closePicker, disableActorsReveal, isCoarse, onPickEmoji, pickerOpen, useArc]);

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

  const showArcActors = useArc && !disableActorsReveal;

  const desktopPicker = (
    <div className="j-reaction-picker" role="menu" aria-label="Đổi emoji">
      {EMOJI_PICKER.map((e) => {
        const active =
          e.key === reactionEmoji ||
          (e.key === REACTION_EMOJI.LIKE &&
            liked &&
            (!reactionEmoji || reactionEmoji === REACTION_EMOJI.LIKE));
        const hot = hotKey === e.key;
        return (
          <button
            key={e.key}
            type="button"
            role="menuitem"
            data-reaction-pick={e.key}
            className={
              "j-reaction-picker-opt" +
              (active ? " is-active" : "") +
              (hot ? " is-hot" : "")
            }
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
      {pickerErr ? (
        <p className="j-reaction-picker-err" role="alert">
          {pickerErr}
        </p>
      ) : null}
    </div>
  );

  const opt2Picker = (
    <div
      ref={pickerLayerRef}
      className={
        "j-reaction-picker j-reaction-picker--opt2" +
        (opt2In ? " is-in" : "") +
        (actorsHot ? " is-actors" : "")
      }
      role="menu"
      aria-label="Đổi emoji"
    >
      <div className="j-reaction-picker-opt2-stage">
        <div className="j-reaction-picker-opt2-glass" aria-hidden />
        {EMOJI_PICKER_ARC.map((e, index) => {
          const offset = index - focusIndex;
          const hot = pickArmed && !actorsHot && offset === 0;
          const active =
            e.key === reactionEmoji ||
            (e.key === REACTION_EMOJI.LIKE &&
              liked &&
              (!reactionEmoji || reactionEmoji === REACTION_EMOJI.LIKE));
          const arcY = offset * offset * 9;
          return (
            <button
              key={e.key}
              type="button"
              role="menuitem"
              className={
                "j-reaction-picker-opt j-reaction-picker-opt--opt2" +
                (active ? " is-active" : "") +
                (hot ? " is-hot" : "")
              }
              style={
                {
                  "--off": String(offset),
                  "--arc-y": `${arcY}px`,
                } as CSSProperties
              }
              aria-label={
                e.key === REACTION_EMOJI.LIKE
                  ? "Giữ tim"
                  : `Đổi sang ${e.label}`
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
        {showArcActors ? (
          <button
            type="button"
            role="menuitem"
            data-reaction-pick="actors"
            className={
              "j-reaction-picker-opt2-actors" +
              (pickArmed && actorsHot ? " is-hot" : "")
            }
            aria-label="xem Reaction"
            onClick={(event) => {
              event.stopPropagation();
              closePicker();
              setActorsOpen(true);
            }}
          >
            <Users
              className="j-reaction-picker-actors-ico"
              size={22}
              strokeWidth={2.1}
            />
            <span className="j-reaction-picker-actors-count">
              {count > 99 ? "99+" : count}
            </span>
            <span className="j-reaction-picker-opt2-actors-label">
              xem Reaction
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );

  const picker = useArc
    ? opt2Mounted && portalReady
      ? createPortal(opt2Picker, document.body)
      : null
    : pickerOpen
      ? desktopPicker
      : null;

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

  if (isCoarse) {
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

  const desktopHoverProps = {
    onMouseEnter: openPickerOnHover,
    onMouseLeave: scheduleClosePickerOnLeave,
  };

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

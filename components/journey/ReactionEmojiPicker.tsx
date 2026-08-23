"use client";

import { Users } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import {
  COMMENT_REACTION_EMOJIS,
  type CommentReactionKey,
} from "@/lib/social/comments/types";
import { REACTION_EMOJI } from "@/lib/social/reaction-emoji";
import {
  useArcReactionPicker,
  useCoarsePointer,
} from "@/lib/ui/use-coarse-pointer";

/** Bảng đổi cảm xúc — 6 emoji một hàng; dislike là nút riêng. */
export const EMOJI_PICKER = COMMENT_REACTION_EMOJIS.filter(
  (e) => e.key !== REACTION_EMOJI.DISLIKE,
).slice(0, 6);

/** Mobile option 2: đảo hàng — trái tim ở mép phải, mở picker bắt đầu từ tim. */
export const EMOJI_PICKER_ARC = [...EMOJI_PICKER].reverse();
export const EMOJI_ARC_DEFAULT_INDEX = EMOJI_PICKER_ARC.length - 1;
const EMOJI_ARC_SLOT_PX = 28;
const EMOJI_ARC_DOWN_PX = 24;
export const EMOJI_PICK_DELAY_MS = 280;
const EMOJI_PICK_CANCEL_Y = 100;

type Opts = {
  reactionEmoji: string | null;
  liked: boolean;
  pending?: boolean;
  pickerErr?: string | null;
  actorsCount?: number;
  showArcActors?: boolean;
  /** Desktop: portal + fixed — thoát overflow unfold / comment sheet. */
  portalDesktop?: boolean;
  onPickEmoji: (key: CommentReactionKey) => void;
  onOpenActors?: () => void;
};

export function useReactionEmojiPicker({
  reactionEmoji,
  liked,
  pending = false,
  pickerErr = null,
  actorsCount = 0,
  showArcActors = false,
  portalDesktop = false,
  onPickEmoji,
  onOpenActors,
}: Opts) {
  const isCoarse = useCoarsePointer();
  const useArc = useArcReactionPicker();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const pickerLayerRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimer = useRef(0);
  const hotKeyRef = useRef<string | null>(null);
  const gestureMovedRef = useRef(false);
  const consumeClickRef = useRef(false);
  const pickArmedRef = useRef(true);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const focusIndexRef = useRef(EMOJI_ARC_DEFAULT_INDEX);
  const actorsHotRef = useRef(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hotKey, setHotKey] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(EMOJI_ARC_DEFAULT_INDEX);
  const [actorsHot, setActorsHot] = useState(false);
  const [pickArmed, setPickArmed] = useState(true);
  const [portalReady, setPortalReady] = useState(false);
  const [opt2Mounted, setOpt2Mounted] = useState(false);
  const [opt2In, setOpt2In] = useState(false);
  const [desktopPos, setDesktopPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
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
      const id = window.requestAnimationFrame(() => setOpt2In(true));
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

  useLayoutEffect(() => {
    if (!pickerOpen || useArc || !portalDesktop) {
      setDesktopPos(null);
      return;
    }
    const sync = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      setDesktopPos({
        left: r.left + r.width / 2,
        top: r.top - 6,
      });
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    const vv = window.visualViewport;
    vv?.addEventListener("scroll", sync);
    vv?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      vv?.removeEventListener("resize", sync);
    };
  }, [pickerOpen, portalDesktop, useArc]);

  const openMobilePicker = useCallback(() => {
    const startKey = EMOJI_PICKER_ARC[EMOJI_ARC_DEFAULT_INDEX]?.key ?? null;
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
        onOpenActors?.();
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
  }, [
    closePicker,
    isCoarse,
    onOpenActors,
    onPickEmoji,
    pickerOpen,
    showArcActors,
    useArc,
  ]);

  const isOptionActive = (key: string) =>
    key === reactionEmoji ||
    (key === REACTION_EMOJI.LIKE &&
      liked &&
      (!reactionEmoji || reactionEmoji === REACTION_EMOJI.LIKE));

  const desktopHoverProps = {
    onMouseEnter: openPickerOnHover,
    onMouseLeave: scheduleClosePickerOnLeave,
  };

  const desktopPicker = (
    <div
      ref={portalDesktop ? pickerLayerRef : undefined}
      className={
        "j-reaction-picker" + (portalDesktop ? " j-reaction-picker--portal" : "")
      }
      role="menu"
      aria-label="Đổi emoji"
      style={
        portalDesktop && desktopPos
          ? { left: desktopPos.left, top: desktopPos.top }
          : undefined
      }
      {...(portalDesktop ? desktopHoverProps : {})}
    >
      {EMOJI_PICKER.map((e) => {
        const active = isOptionActive(e.key);
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
          const active = isOptionActive(e.key);
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
              onOpenActors?.();
            }}
          >
            <Users
              className="j-reaction-picker-actors-ico"
              size={22}
              strokeWidth={2.1}
            />
            <span className="j-reaction-picker-actors-count">
              {actorsCount > 99 ? "99+" : actorsCount}
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
      ? portalDesktop
        ? portalReady && desktopPos
          ? createPortal(desktopPicker, document.body)
          : null
        : desktopPicker
      : null;

  return {
    wrapRef: wrapRef as RefObject<HTMLSpanElement>,
    isCoarse,
    useArc,
    pickerOpen,
    picker,
    consumeClickRef,
    openMobilePicker,
    openPicker: () => setPickerOpen(true),
    closePicker,
    desktopHoverProps,
  };
}

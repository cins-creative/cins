"use client";

import {
  Bold,
  Italic,
  List,
  ListOrdered,
  SmilePlus,
  Strikethrough,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { EmojiPickerPopover } from "@/components/editor/compose/EmojiPickerPopover";
import { getTextareaCaretRect } from "@/lib/editor/textarea-caret";
import {
  applyLinePrefix,
  applyWrap,
  continueListOnEnter,
  insertAt,
} from "@/lib/editor/textarea-format";

type Props = {
  value: string;
  onChange: (next: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** DOM node thật — effect bind lại khi mount (ref object không trigger re-render). */
  textareaEl: HTMLTextAreaElement | null;
  maxLength?: number;
};

type BubblePos = { left: number; top: number };

function restoreSelection(
  ta: HTMLTextAreaElement,
  start: number,
  end: number,
) {
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start, end);
  });
}

/** Dòng chứa caret đang trống / chỉ whitespace. */
export function isCaretOnEmptyLine(value: string, caret: number): boolean {
  const i = Math.max(0, Math.min(caret, value.length));
  const lineStart = value.lastIndexOf("\n", i - 1) + 1;
  let lineEnd = value.indexOf("\n", i);
  if (lineEnd < 0) lineEnd = value.length;
  return value.slice(lineStart, lineEnd).trim().length === 0;
}

function shouldShowFormatBubble(
  ta: HTMLTextAreaElement,
  value: string,
): boolean {
  if (document.activeElement !== ta) return false;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (start !== end) return true;
  return isCaretOnEmptyLine(value, start);
}

function bubblePositionFor(ta: HTMLTextAreaElement): BubblePos {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const idx = start !== end ? Math.floor((start + end) / 2) : start;
  const caret = getTextareaCaretRect(ta, idx);
  const gap = 8;
  const approxH = 42;
  const approxW = 260;
  let left = caret.left;
  let top = caret.top - approxH - gap;
  if (top < 8) {
    top = caret.top + caret.height + gap;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - approxW - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - approxH - 8));
  return { left, top };
}

export function MinimalBodyFormatBar({
  value,
  onChange,
  textareaRef,
  textareaEl,
  maxLength,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<BubblePos>({ left: 0, top: 0 });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const keepOpenRef = useRef(false);
  const emojiOpenRef = useRef(false);
  emojiOpenRef.current = emojiOpen;

  const syncVisibility = useCallback(() => {
    const ta = textareaEl ?? textareaRef.current;
    if (!ta) {
      setVisible(false);
      return;
    }
    if (keepOpenRef.current || emojiOpenRef.current) {
      setPos(bubblePositionFor(ta));
      setVisible(true);
      return;
    }
    if (!shouldShowFormatBubble(ta, ta.value)) {
      setVisible(false);
      return;
    }
    setPos(bubblePositionFor(ta));
    setVisible(true);
  }, [textareaEl, textareaRef]);

  useEffect(() => {
    const ta = textareaEl ?? textareaRef.current;
    if (!ta) return;

    const onAny = () => {
      requestAnimationFrame(syncVisibility);
    };
    const onBlur = () => {
      window.setTimeout(() => {
        if (keepOpenRef.current || emojiOpenRef.current) return;
        if (document.activeElement === ta) {
          syncVisibility();
          return;
        }
        setVisible(false);
        setEmojiOpen(false);
      }, 0);
    };

    ta.addEventListener("keyup", onAny);
    ta.addEventListener("keydown", onAny);
    ta.addEventListener("click", onAny);
    ta.addEventListener("select", onAny);
    ta.addEventListener("mouseup", onAny);
    ta.addEventListener("focus", onAny);
    ta.addEventListener("blur", onBlur);
    ta.addEventListener("scroll", onAny);
    document.addEventListener("selectionchange", onAny);
    window.addEventListener("resize", onAny);
    window.addEventListener("scroll", onAny, true);

    syncVisibility();

    return () => {
      ta.removeEventListener("keyup", onAny);
      ta.removeEventListener("keydown", onAny);
      ta.removeEventListener("click", onAny);
      ta.removeEventListener("select", onAny);
      ta.removeEventListener("mouseup", onAny);
      ta.removeEventListener("focus", onAny);
      ta.removeEventListener("blur", onBlur);
      ta.removeEventListener("scroll", onAny);
      document.removeEventListener("selectionchange", onAny);
      window.removeEventListener("resize", onAny);
      window.removeEventListener("scroll", onAny, true);
    };
  }, [syncVisibility, textareaEl, textareaRef]);

  useLayoutEffect(() => {
    if (visible) syncVisibility();
  }, [value, visible, syncVisibility]);

  const commit = useCallback(
    (next: string, start: number, end: number) => {
      let out = next;
      if (maxLength != null && out.length > maxLength) {
        out = out.slice(0, maxLength);
      }
      onChange(out);
      const ta = textareaEl ?? textareaRef.current;
      if (ta) {
        restoreSelection(
          ta,
          Math.min(start, out.length),
          Math.min(end, out.length),
        );
      }
      requestAnimationFrame(syncVisibility);
    },
    [maxLength, onChange, syncVisibility, textareaEl, textareaRef],
  );

  const withSelection = useCallback(
    (
      fn: (
        value: string,
        start: number,
        end: number,
      ) => { value: string; selectionStart: number; selectionEnd: number },
    ) => {
      const ta = textareaEl ?? textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const result = fn(value, start, end);
      commit(result.value, result.selectionStart, result.selectionEnd);
    },
    [commit, textareaEl, textareaRef, value],
  );

  const onBold = () =>
    withSelection((v, s, e) => applyWrap(v, s, e, "**", "**"));
  const onItalic = () =>
    withSelection((v, s, e) => applyWrap(v, s, e, "*", "*"));
  const onStrike = () =>
    withSelection((v, s, e) => applyWrap(v, s, e, "~~", "~~"));
  const onBullet = () =>
    withSelection((v, s, e) => applyLinePrefix(v, s, e, "bullet"));
  const onOrdered = () =>
    withSelection((v, s, e) => applyLinePrefix(v, s, e, "ordered"));

  const onEmoji = (emoji: string) => {
    const ta = textareaEl ?? textareaRef.current;
    if (!ta) return;
    const idx = ta.selectionStart;
    const result = insertAt(value, idx, emoji);
    commit(result.value, result.selectionStart, result.selectionEnd);
  };

  const holdFocus = {
    onMouseDown: (e: ReactMouseEvent) => {
      e.preventDefault();
      keepOpenRef.current = true;
    },
    onMouseUp: () => {
      keepOpenRef.current = false;
    },
  };

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ed-mota-format-bar ed-mota-format-bar--float"
      role="toolbar"
      aria-label="Định dạng mô tả"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => {
        e.preventDefault();
        keepOpenRef.current = true;
      }}
      onMouseUp={() => {
        keepOpenRef.current = false;
      }}
    >
      <button
        type="button"
        className="ed-mota-fmt-btn"
        title="Đậm (Ctrl+B)"
        aria-label="Đậm"
        {...holdFocus}
        onClick={onBold}
      >
        <Bold size={15} strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        className="ed-mota-fmt-btn"
        title="Nghiêng (Ctrl+I)"
        aria-label="Nghiêng"
        {...holdFocus}
        onClick={onItalic}
      >
        <Italic size={15} strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        className="ed-mota-fmt-btn"
        title="Gạch ngang (Ctrl+Shift+X)"
        aria-label="Gạch ngang"
        {...holdFocus}
        onClick={onStrike}
      >
        <Strikethrough size={15} strokeWidth={2.4} aria-hidden />
      </button>
      <span className="ed-mota-fmt-sep" aria-hidden />
      <button
        type="button"
        className="ed-mota-fmt-btn"
        title="Danh sách"
        aria-label="Danh sách gạch đầu dòng"
        {...holdFocus}
        onClick={onBullet}
      >
        <List size={15} strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        className="ed-mota-fmt-btn"
        title="Danh sách số"
        aria-label="Danh sách đánh số"
        {...holdFocus}
        onClick={onOrdered}
      >
        <ListOrdered size={15} strokeWidth={2.4} aria-hidden />
      </button>
      <span className="ed-mota-fmt-sep" aria-hidden />
      <div className="ed-mota-emoji-wrap">
        <button
          ref={emojiBtnRef}
          type="button"
          className={`ed-mota-fmt-btn${emojiOpen ? " is-active" : ""}`}
          title="Chèn emoji"
          aria-label="Chèn emoji"
          aria-expanded={emojiOpen}
          {...holdFocus}
          onClick={() => setEmojiOpen((o) => !o)}
        >
          <SmilePlus size={15} strokeWidth={2.4} aria-hidden />
        </button>
        <EmojiPickerPopover
          open={emojiOpen}
          onClose={() => {
            setEmojiOpen(false);
            keepOpenRef.current = false;
            requestAnimationFrame(syncVisibility);
          }}
          onPick={onEmoji}
          anchorRef={emojiBtnRef}
        />
      </div>
    </div>,
    document.body,
  );
}

/** Bắt shortcut format + Enter tiếp tục list khi textarea mô tả đang focus. */
export function handleMinimalBodyFormatKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  ctx: {
    value: string;
    onChange: (next: string) => void;
    maxLength?: number;
  },
): boolean {
  const ta = e.currentTarget;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;

  const applyResult = (result: {
    value: string;
    selectionStart: number;
    selectionEnd: number;
  }) => {
    let out = result.value;
    if (ctx.maxLength != null && out.length > ctx.maxLength) {
      out = out.slice(0, ctx.maxLength);
    }
    ctx.onChange(out);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(
        Math.min(result.selectionStart, out.length),
        Math.min(result.selectionEnd, out.length),
      );
    });
  };

  // Enter trên dòng `- ` / `1. ` → item mới; item trống → thoát list.
  // Shift+Enter giữ xuống dòng thường.
  if (
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey
  ) {
    const listResult = continueListOnEnter(ctx.value, start, end);
    if (listResult) {
      e.preventDefault();
      applyResult(listResult);
      return true;
    }
  }

  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return false;

  let result: ReturnType<typeof applyWrap> | null = null;

  if (e.key.toLowerCase() === "b" && !e.shiftKey) {
    e.preventDefault();
    result = applyWrap(ctx.value, start, end, "**", "**");
  } else if (e.key.toLowerCase() === "i" && !e.shiftKey) {
    e.preventDefault();
    result = applyWrap(ctx.value, start, end, "*", "*");
  } else if (e.key.toLowerCase() === "x" && e.shiftKey) {
    e.preventDefault();
    result = applyWrap(ctx.value, start, end, "~~", "~~");
  }

  if (!result) return false;
  applyResult(result);
  return true;
}

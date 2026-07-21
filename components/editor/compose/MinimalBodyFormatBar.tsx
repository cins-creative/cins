"use client";

import { SmilePlus } from "lucide-react";
import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";

import { EmojiPickerPopover } from "@/components/editor/compose/EmojiPickerPopover";
import {
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

/** Nút emoji góc phải dưới ô mô tả — không còn thanh định dạng đậm/nghiêng/list. */
export function MinimalBodyFormatBar({
  value,
  onChange,
  textareaRef,
  textareaEl,
  maxLength,
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);

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
    },
    [maxLength, onChange, textareaEl, textareaRef],
  );

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
    },
  };

  return (
    <div className="ed-mota-emoji-wrap ed-mota-emoji-wrap--corner">
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
        onClose={() => setEmojiOpen(false)}
        onPick={onEmoji}
        anchorRef={emojiBtnRef}
        placement="top-end"
      />
    </div>
  );
}

/** Enter tiếp tục list `- ` / `1. `; không còn shortcut đậm/nghiêng/gạch. */
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

  return false;
}

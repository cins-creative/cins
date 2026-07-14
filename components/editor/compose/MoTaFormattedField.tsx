"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { renderMoTaMarkdownHighlight } from "@/lib/editor/mo-ta-markdown";

type OverlayProps = {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  textareaEl?: HTMLTextAreaElement | null;
};

/** Lớp render bold/italic/… phía dưới textarea trong suốt. */
function MoTaMarkdownOverlay({
  value,
  textareaRef,
  textareaEl,
}: OverlayProps) {
  const hlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ta = textareaEl ?? textareaRef.current;
    const hl = hlRef.current;
    if (!ta || !hl) return;

    const syncScroll = () => {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    };
    syncScroll();
    ta.addEventListener("scroll", syncScroll);
    return () => ta.removeEventListener("scroll", syncScroll);
  }, [textareaEl, textareaRef, value]);

  const nodes = renderMoTaMarkdownHighlight(value);

  return (
    <div ref={hlRef} className="ed-md-highlight" aria-hidden>
      {nodes}
      {value.endsWith("\n") ? "\u200b" : null}
    </div>
  );
}

type Props = OverlayProps & {
  /** Typography / khung — gắn lên wrapper (sub-in, b-text, ed-minimal-body…). */
  className?: string;
  children: ReactNode;
};

/**
 * Bọc textarea format: lưu markdown, hiển thị đậm/nghiêng/gạch ngang.
 * Textarea con chỉ cần class `ed-md-input`.
 */
export function MoTaFormattedField({
  value,
  className,
  textareaRef,
  textareaEl,
  children,
}: Props) {
  return (
    <div className={["ed-md-field", className].filter(Boolean).join(" ")}>
      <MoTaMarkdownOverlay
        value={value}
        textareaRef={textareaRef}
        textareaEl={textareaEl}
      />
      {children}
    </div>
  );
}

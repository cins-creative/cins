"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { BlockInsertPicker } from "@/components/editor/compose/BlockInsertPicker";
import type { ComposePickerEntry } from "@/lib/article/compose/types";
import {
  collectScrollResizeTargets,
  computeCenteredAnchoredMenuPosition,
} from "@/lib/ui/clamp-fixed-menu-position";

const PICKER_MAX_W = 420;
const PICKER_EST_H = 280;

type Props<T extends string> = {
  idx: number;
  open: boolean;
  onToggle: (next: boolean) => void;
  onPick: (t: T) => void;
  catalog: ComposePickerEntry[];
  starter?: boolean;
  anchorPicker?: boolean;
};

export function AddZone<T extends string>({
  open,
  onToggle,
  onPick,
  catalog,
  starter,
  anchorPicker = true,
}: Props<T>) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updatePickerPos = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const measuredH = pickerRef.current?.getBoundingClientRect().height;
    const menuHeight = measuredH && measuredH > 0 ? measuredH : PICKER_EST_H;
    const width = Math.min(PICKER_MAX_W, window.innerWidth - 24);
    const { top, left, maxHeight } = computeCenteredAnchoredMenuPosition(
      rect,
      { width, height: menuHeight },
      { maxHeightCap: 480, minVisibleHeight: 160 },
    );
    setPickerPos({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorPicker) {
      setPickerPos(null);
      return;
    }
    updatePickerPos();
  }, [anchorPicker, open, updatePickerPos]);

  useEffect(() => {
    if (!open || !anchorPicker) return;
    const scrollTargets = collectScrollResizeTargets(btnRef.current);
    const onReflow = () => updatePickerPos();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", onReflow, { passive: true });
    }
    window.addEventListener("resize", onReflow);
    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", onReflow);
      }
      window.removeEventListener("resize", onReflow);
    };
  }, [anchorPicker, open, updatePickerPos]);

  useEffect(() => {
    if (!open || !anchorPicker || !pickerRef.current) return;
    const node = pickerRef.current;
    const ro = new ResizeObserver(() => updatePickerPos());
    ro.observe(node);
    return () => ro.disconnect();
  }, [anchorPicker, open, updatePickerPos, pickerPos?.top]);

  const pickerStyle: React.CSSProperties | undefined =
    anchorPicker && pickerPos
      ? {
          position: "fixed",
          top: pickerPos.top,
          left: pickerPos.left,
          width: pickerPos.width,
          transform: "none",
          maxHeight: pickerPos.maxHeight,
          overflowY: "auto",
        }
      : undefined;

  const picker = open ? (
    <BlockInsertPicker
      catalog={catalog}
      onPick={(t) => {
        onPick(t as T);
        onToggle(false);
      }}
      style={pickerStyle}
      pickerRef={pickerRef}
    />
  ) : null;

  const portaledPicker =
    open && anchorPicker && pickerPos && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-editor-page picker-portal-root">{picker}</div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`add-zone${open ? " open" : ""}${starter ? " starter" : ""}`}
    >
      <button
        ref={btnRef}
        type="button"
        className="add-btn"
        onClick={(e) => {
          e.stopPropagation();
          const next = !open;
          onToggle(next);
          if (next && anchorPicker) {
            requestAnimationFrame(() => updatePickerPos());
          }
        }}
        aria-label="Chèn block"
        title="Chèn block"
      >
        +
      </button>
      {starter ? (
        <span className="add-hint">Bắt đầu — chọn loại block</span>
      ) : null}
      {anchorPicker ? portaledPicker : picker}
    </div>
  );
}

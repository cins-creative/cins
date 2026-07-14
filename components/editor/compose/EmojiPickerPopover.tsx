"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";

import {
  EMOJI_GROUPS,
  type EmojiGroupId,
} from "@/lib/editor/emoji-catalog";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  /** Neo: phần tử nút emoji trên format bar. */
  anchorRef: RefObject<HTMLElement | null>;
};

export function EmojiPickerPopover({
  open,
  onClose,
  onPick,
  anchorRef,
}: Props) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [groupId, setGroupId] = useState<EmojiGroupId>("cam_xuc");
  const active = EMOJI_GROUPS.find((g) => g.id === groupId) ?? EMOJI_GROUPS[0]!;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      id={panelId}
      className="ed-emoji-popover"
      role="dialog"
      aria-label="Chèn emoji"
    >
      <div className="ed-emoji-tabs" role="tablist">
        {EMOJI_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === groupId}
            className={`ed-emoji-tab${g.id === groupId ? " is-active" : ""}`}
            onClick={() => setGroupId(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="ed-emoji-grid" role="listbox" aria-label={active.label}>
        {active.emojis.map((em) => (
          <button
            key={`${groupId}-${em}`}
            type="button"
            className="ed-emoji-cell"
            role="option"
            aria-label={em}
            onClick={() => {
              onPick(em);
              onClose();
            }}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

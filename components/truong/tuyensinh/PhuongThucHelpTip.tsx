"use client";

import { useEffect, useId, useRef, useState } from "react";

import { labelPhuongThuc, phuongThucTooltip } from "@/lib/truong/phuong-thuc";

type Props = {
  code: string | null;
};

export function PhuongThucHelpTip({ code }: Props) {
  const tip = phuongThucTooltip(code);
  const title = labelPhuongThuc(code);
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const apply = () => setHoverCapable(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!tip) return null;

  return (
    <span className="ptxt-help" ref={wrapRef}>
      <button
        type="button"
        className="ptxt-help-btn"
        aria-expanded={open}
        aria-controls={tipId}
        aria-label={`Giải thích: ${title}`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={hoverCapable ? () => setOpen(true) : undefined}
        onMouseLeave={hoverCapable ? () => setOpen(false) : undefined}
        onFocus={hoverCapable ? () => setOpen(true) : undefined}
        onBlur={
          hoverCapable
            ? (e) => {
                if (!wrapRef.current?.contains(e.relatedTarget as Node))
                  setOpen(false);
              }
            : undefined
        }
      >
        <span aria-hidden>?</span>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`ptxt-help-pop${open ? " ptxt-help-pop--open" : ""}`}
      >
        {tip}
      </span>
    </span>
  );
}

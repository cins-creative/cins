"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function ShopPhanLoaiInput({
  value,
  options,
  onChange,
  placeholder = "—",
  className,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const current = value.trim();
  const items = useMemo(() => {
    const set = new Set(options.map((o) => o.trim()).filter(Boolean));
    if (current) set.add(current);
    return [...set].sort((a, b) =>
      a.localeCompare(b, "vi", { sensitivity: "base" }),
    );
  }, [options, current]);

  function syncRect() {
    const el = triggerRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }

  useEffect(() => {
    if (!open) return;
    syncRect();
    function onReposition() {
      syncRect();
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (wrapRef.current?.contains(t)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, listId]);

  const showMenu = open && !disabled && rect != null;
  const label = current || placeholder;

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="shop-phan-loai-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`shop-phan-loai-trigger${className ? ` ${className}` : ""}${open ? " is-open" : ""}${!current ? " is-empty" : ""}`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={showMenu}
        aria-controls={listId}
        title={current || undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => {
            const next = !o;
            if (next) syncRect();
            return next;
          });
        }}
      >
        <span className="shop-phan-loai-trigger-label">{label}</span>
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
      </button>
      {showMenu
        ? createPortal(
            <ul
              id={listId}
              className="shop-phan-loai-menu"
              role="listbox"
              aria-label={ariaLabel}
              style={{
                top: rect.bottom + 2,
                left: rect.left,
                width: Math.max(rect.width, 160),
              }}
            >
              <li role="option" aria-selected={!current}>
                <button
                  type="button"
                  className={`shop-phan-loai-option${!current ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick("")}
                >
                  {placeholder}
                </button>
              </li>
              {items.length === 0 ? (
                <li className="shop-phan-loai-empty" role="presentation">
                  Chưa có loại — tạo trong panel Loại hàng
                </li>
              ) : (
                items.map((opt) => (
                  <li key={opt} role="option" aria-selected={opt === current}>
                    <button
                      type="button"
                      className={`shop-phan-loai-option${opt === current ? " is-active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(opt)}
                    >
                      {opt}
                    </button>
                  </li>
                ))
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

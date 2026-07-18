"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  placeholder,
  className,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const q = value.trim().toLowerCase();
  const filtered = options
    .filter((o) => !q || o.toLowerCase().includes(q))
    .slice(0, 16);

  function syncRect() {
    const el = inputRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }

  useEffect(() => {
    if (!open) return;
    syncRect();
    function onReposition() {
      syncRect();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const showMenu = open && !disabled && filtered.length > 0 && rect != null;

  return (
    <div className="shop-phan-loai-wrap">
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showMenu}
        aria-controls={listId}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          syncRect();
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          syncRect();
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
      />
      {showMenu
        ? createPortal(
            <ul
              id={listId}
              className="shop-phan-loai-menu"
              role="listbox"
              style={{
                top: rect.bottom + 2,
                left: rect.left,
                width: Math.max(rect.width, 140),
              }}
            >
              {filtered.map((opt) => (
                <li key={opt} role="option" aria-selected={opt === value}>
                  <button
                    type="button"
                    className="shop-phan-loai-option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    {opt}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

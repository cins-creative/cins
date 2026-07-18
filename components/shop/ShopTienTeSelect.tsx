"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PRESET = ["VND", "USD", "JPY", "EUR", "KRW", "CNY", "THB"] as const;

type Props = {
  value: string;
  knownCodes?: string[];
  disabled?: boolean;
  "aria-label"?: string;
  title?: string;
  onChange: (tienTe: string) => void;
};

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function ShopTienTeSelect({
  value,
  knownCodes = [],
  disabled,
  "aria-label": ariaLabel,
  title,
  onChange,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const options = useMemo(() => {
    const set = new Set<string>([...PRESET, ...knownCodes]);
    const current = value.trim().toUpperCase();
    if (current) set.add(current);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [knownCodes, value]);

  const q = draft.trim().toLowerCase();
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

  function commit(raw: string) {
    const code = normalizeCode(raw) || "VND";
    setDraft(code);
    if (code !== value) onChange(code);
  }

  const showMenu = open && !disabled && filtered.length > 0 && rect != null;

  return (
    <div className="shop-tien-te-wrap">
      <input
        ref={inputRef}
        className="shop-tien-te"
        value={draft}
        disabled={disabled}
        maxLength={8}
        placeholder="VND"
        aria-label={ariaLabel}
        title={title}
        aria-autocomplete="list"
        aria-expanded={showMenu}
        aria-controls={listId}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          syncRect();
        }}
        onChange={(e) => {
          const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          setDraft(next.slice(0, 8));
          setOpen(true);
          syncRect();
        }}
        onBlur={() => {
          commit(draft);
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            setOpen(false);
            inputRef.current?.blur();
          }
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
                width: Math.max(rect.width, 100),
              }}
            >
              {filtered.map((opt) => (
                <li key={opt} role="option" aria-selected={opt === draft}>
                  <button
                    type="button"
                    className="shop-phan-loai-option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(opt);
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

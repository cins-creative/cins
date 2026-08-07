"use client";

import { Check, ChevronDown, ImagePlus, Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type ShopComboPickerOption = {
  id: string;
  label: string;
  thumbUrl: string | null;
  hint?: string | null;
};

type Props = {
  label: string;
  placeholder: string;
  options: ShopComboPickerOption[];
  selectedIds: string[];
  multiple: boolean;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
};

export function ShopComboDieuKienPicker({
  label,
  placeholder,
  options,
  selectedIds,
  multiple,
  disabled,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const optionMap = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options],
  );

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => optionMap.get(id))
        .filter((o): o is ShopComboPickerOption => Boolean(o)),
    [optionMap, selectedIds],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("vi");
    if (!needle) return options;
    return options.filter(
      (o) =>
        o.label.toLocaleLowerCase("vi").includes(needle) ||
        (o.hint?.toLocaleLowerCase("vi").includes(needle) ?? false),
    );
  }, [options, q]);

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]!.label
        : `${selected.length} mục đã chọn`;

  function toggle(id: string) {
    if (multiple) {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id],
      );
      return;
    }
    onChange([id]);
    setOpen(false);
  }

  function clearAll() {
    onChange([]);
  }

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="shop-combo-picker-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="shop-combo-picker-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="shop-combo-picker-sheet-head">
                <div className="shop-combo-picker-sheet-titles">
                  <h3 id={titleId}>{label}</h3>
                  <p>
                    {multiple
                      ? selected.length > 0
                        ? `Đã chọn ${selected.length}`
                        : "Chọn một hoặc nhiều"
                      : "Chọn một mục"}
                  </p>
                </div>
                <button
                  type="button"
                  className="shop-combo-picker-sheet-close"
                  aria-label="Đóng"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} strokeWidth={2.2} aria-hidden />
                </button>
              </header>

              <label className="shop-combo-picker-search">
                <Search size={15} strokeWidth={2.2} aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={q}
                  placeholder="Tìm…"
                  disabled={disabled}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                {q ? (
                  <button
                    type="button"
                    className="shop-combo-picker-search-clear"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setQ("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={14} strokeWidth={2.4} aria-hidden />
                  </button>
                ) : null}
              </label>

              <div
                className="shop-combo-picker-options"
                id={listId}
                role="listbox"
                aria-multiselectable={multiple || undefined}
                aria-label={label}
              >
                {filtered.map((o) => {
                  const on = selectedIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className={`shop-combo-picker-option${on ? " is-on" : ""}`}
                      disabled={disabled}
                      onClick={() => toggle(o.id)}
                    >
                      <span
                        className={`shop-combo-picker-check${on ? " is-on" : ""}`}
                        aria-hidden
                      >
                        {on ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      {o.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.thumbUrl}
                          alt=""
                          className="shop-combo-picker-thumb"
                        />
                      ) : (
                        <span
                          className="shop-combo-picker-thumb is-empty"
                          aria-hidden
                        >
                          <ImagePlus size={16} />
                        </span>
                      )}
                      <span className="shop-combo-picker-copy">
                        <strong>{o.label}</strong>
                        {o.hint ? <em>{o.hint}</em> : null}
                      </span>
                    </button>
                  );
                })}
                {filtered.length === 0 ? (
                  <p className="shop-combo-picker-empty">Không khớp.</p>
                ) : null}
              </div>

              <footer className="shop-combo-picker-sheet-foot">
                {selected.length > 0 ? (
                  <button
                    type="button"
                    className="shop-combo-picker-sheet-ghost"
                    disabled={disabled}
                    onClick={clearAll}
                  >
                    Xóa chọn
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="shop-combo-picker-sheet-done"
                  onClick={() => setOpen(false)}
                >
                  {multiple ? "Xong" : "Đóng"}
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  const triggerThumb = selected[0]?.thumbUrl ?? null;

  return (
    <div className="shop-combo-picker">
      <button
        type="button"
        className={`shop-combo-picker-trigger${open ? " is-open" : ""}${
          selected.length ? " has-value" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {triggerThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={triggerThumb}
            alt=""
            className="shop-combo-picker-trigger-thumb"
          />
        ) : selected.length > 0 ? (
          <span className="shop-combo-picker-trigger-thumb is-empty" aria-hidden>
            <ImagePlus size={14} />
          </span>
        ) : null}
        <span className="shop-combo-picker-summary">{summary}</span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>

      {multiple && selected.length > 0 ? (
        <div className="shop-combo-picker-tags">
          {selected.map((o) => (
            <button
              key={o.id}
              type="button"
              className="shop-combo-picker-tag"
              disabled={disabled}
              onClick={() => toggle(o.id)}
              title={`Bỏ «${o.label}»`}
            >
              {o.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.thumbUrl} alt="" className="shop-combo-picker-tag-thumb" />
              ) : null}
              <span>{o.label}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      {overlay}
    </div>
  );
}

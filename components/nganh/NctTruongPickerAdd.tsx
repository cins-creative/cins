"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  searchTruongPicker,
  type TruongPickerItem,
} from "@/app/nganh/actions";

type Props = {
  linkedOrgIds: string[];
  busy: boolean;
  onPick: (orgSlug: string) => void;
};

export function NctTruongPickerAdd({ linkedOrgIds, busy, onPick }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TruongPickerItem[]>([]);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      const r = await searchTruongPicker(q, linkedOrgIds);
      setLoading(false);
      if (r.ok) setItems(r.items);
      else setItems([]);
    },
    [linkedOrgIds],
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void load(query), query ? 280 : 0);
    return () => window.clearTimeout(t);
  }, [open, query, load]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPicker() {
    setOpen(true);
    setQuery("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pick(item: TruongPickerItem) {
    onPick(item.slug);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="nct-mon-group-add nct-truong-picker-add" ref={rootRef}>
      <button
        type="button"
        className="nct-mon-group-add-btn"
        disabled={busy}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
      >
        {busy ? "Đang xử lý…" : "+ Thêm trường"}
      </button>

      {open ? (
        <div className="nct-mon-picker" id={listId}>
          <input
            ref={inputRef}
            type="search"
            className="nct-inline-input nct-mon-picker-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trường đại học…"
            aria-label="Tìm trường đào tạo"
            autoComplete="off"
          />
          <div
            className="nct-mon-picker-list"
            role="listbox"
            aria-busy={loading}
          >
            {loading ? (
              <p className="nct-mon-picker-status">Đang tải…</p>
            ) : items.length === 0 ? (
              <p className="nct-mon-picker-status">
                {query.trim()
                  ? "Không tìm thấy trường phù hợp."
                  : "Không còn trường để thêm."}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  className="nct-mon-picker-option"
                  onClick={() => pick(item)}
                >
                  <span className="nct-mon-picker-option-title">
                    {item.title}
                    {item.ma_truong ? (
                      <span className="nct-mon-picker-option-meta">
                        {" "}
                        · {item.ma_truong}
                      </span>
                    ) : null}
                  </span>
                  <span className="nct-mon-picker-option-slug">{item.slug}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

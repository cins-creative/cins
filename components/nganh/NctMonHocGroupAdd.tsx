"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  searchMonHocPicker,
  type MonHocPickerItem,
} from "@/app/nganh/actions";
import { getCoverUrl } from "@/lib/articles/cover";
import type { MonHocCapDo } from "@/lib/nganh/monHoc";

type Props = {
  capDo: MonHocCapDo;
  linkedIds: string[];
  busy: boolean;
  onSave: (slugs: string[]) => void;
};

function monThumbInitials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.trim().slice(0, 2).toUpperCase() || "MH";
}

export function NctMonHocGroupAdd({ capDo, linkedIds, busy, onSave }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<MonHocPickerItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const linkedKey = linkedIds.join(",");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const r = await searchMonHocPicker("", linkedIds);
    setLoading(false);
    if (r.ok) setAllItems(r.items);
    else setAllItems([]);
  }, [linkedIds]);

  useEffect(() => {
    if (!open) return;
    void loadAll();
  }, [open, linkedKey, loadAll]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [allItems, query]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSelectedIds(new Set());
        setQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectedIds(new Set());
        setQuery("");
      }
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
    setSelectedIds(new Set());
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    const slugs = allItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.slug);
    if (!slugs.length) return;
    onSave(slugs);
    setOpen(false);
    setSelectedIds(new Set());
    setQuery("");
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="nct-mon-group-add" ref={rootRef}>
      <button
        type="button"
        className="nct-mon-group-add-btn"
        disabled={busy}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
      >
        {busy ? "Đang xử lý…" : "+ Thêm môn"}
      </button>

      {open ? (
        <div
          className="nct-mon-picker nct-mon-picker--multi"
          id={listId}
          role="dialog"
          aria-label={`Chọn môn ${capDo}`}
        >
          <input
            ref={inputRef}
            type="search"
            className="nct-inline-input nct-mon-picker-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lọc theo tên hoặc slug…"
            aria-label={`Lọc môn ${capDo}`}
            autoComplete="off"
          />
          <p className="nct-mon-picker-meta" aria-live="polite">
            {loading
              ? "Đang tải danh sách…"
              : `${visibleItems.length} môn${query.trim() ? " khớp" : " có thể thêm"}`}
            {selectedCount > 0 ? ` · đã chọn ${selectedCount}` : null}
          </p>
          <div
            className="nct-mon-picker-list"
            role="listbox"
            aria-multiselectable="true"
            aria-busy={loading}
          >
            {loading ? (
              <p className="nct-mon-picker-status">Đang tải…</p>
            ) : visibleItems.length === 0 ? (
              <p className="nct-mon-picker-status">
                {query.trim()
                  ? "Không có môn khớp bộ lọc."
                  : "Không còn môn để thêm."}
              </p>
            ) : (
              visibleItems.map((item) => {
                const checked = selectedIds.has(item.id);
                const coverUrl = getCoverUrl(item.cover_id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={[
                      "nct-mon-picker-option",
                      "nct-mon-picker-option--multi",
                      checked ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span
                      className="nct-mon-picker-check"
                      aria-hidden
                      data-checked={checked ? "1" : undefined}
                    />
                    <span className="nct-mon-picker-thumb">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt=""
                          width={48}
                          height={36}
                          className="nct-mon-picker-thumb-img"
                          sizes="48px"
                        />
                      ) : (
                        <span className="nct-mon-picker-thumb-ph">
                          {monThumbInitials(item.title)}
                        </span>
                      )}
                    </span>
                    <span className="nct-mon-picker-option-text">
                      <span className="nct-mon-picker-option-title">
                        {item.title}
                      </span>
                      <span className="nct-mon-picker-option-slug">
                        {item.slug}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="nct-mon-picker-footer">
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-viewer"
              onClick={() => {
                setOpen(false);
                setSelectedIds(new Set());
                setQuery("");
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-admin"
              disabled={busy || selectedCount === 0}
              onClick={handleSave}
            >
              Lưu{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

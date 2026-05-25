"use client";

import { useEffect, useRef, useState } from "react";

import {
  ADMIN_TABLE_COLUMNS,
  defaultVisibleColumnIds,
  defaultVisibleFilterIds,
} from "@/lib/admin/article-fields";

type ToggleItem = { id: string; label: string; locked?: boolean };

type Props = {
  columns: ToggleItem[];
  visibleColumns: Set<string>;
  onColumnsChange: (ids: Set<string>) => void;
  filters?: ToggleItem[];
  visibleFilters?: Set<string>;
  onFiltersChange?: (ids: Set<string>) => void;
};

export function AdminTableSettings({
  columns,
  visibleColumns,
  onColumnsChange,
  filters,
  visibleFilters,
  onFiltersChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (
    id: string,
    current: Set<string>,
    onChange: (next: Set<string>) => void,
    locked?: boolean,
  ) => {
    if (locked) return;
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <div className="admin-table-settings" ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost admin-table-settings__btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Ẩn/hiện cột và bộ lọc"
      >
        ⚙ Cột & lọc
      </button>

      {open ? (
        <div className="admin-table-settings__panel" role="dialog" aria-label="Cài đặt bảng">
          <p className="admin-table-settings__section">Cột bảng</p>
          <ul className="admin-table-settings__checks">
            {columns.map((c) => (
              <li key={c.id}>
                <label className="admin-table-settings__label">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(c.id)}
                    disabled={c.locked}
                    onChange={() => toggle(c.id, visibleColumns, onColumnsChange, c.locked)}
                  />
                  <span>{c.label}</span>
                  {c.locked ? (
                    <span className="admin-table-settings__lock">cố định</span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>

          {filters && visibleFilters && onFiltersChange ? (
            <>
              <p className="admin-table-settings__section">Bộ lọc toolbar</p>
              <ul className="admin-table-settings__checks">
                {filters.map((f) => (
                  <li key={f.id}>
                    <label className="admin-table-settings__label">
                      <input
                        type="checkbox"
                        checked={visibleFilters.has(f.id)}
                        onChange={() => toggle(f.id, visibleFilters, onFiltersChange)}
                      />
                      <span>{f.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="admin-table-settings__actions">
            <button
              type="button"
              className="admin-table-settings__link"
              onClick={() => {
                onColumnsChange(new Set(columns.map((c) => c.id)));
                if (filters && onFiltersChange) {
                  onFiltersChange(new Set(filters.map((f) => f.id)));
                }
              }}
            >
              Hiện tất cả
            </button>
            <button
              type="button"
              className="admin-table-settings__link"
              onClick={() => {
                const compactCols = new Set(defaultVisibleColumnIds());
                for (const c of ADMIN_TABLE_COLUMNS) {
                  if (c.locked) compactCols.add(c.id);
                }
                onColumnsChange(compactCols);
                if (filters && onFiltersChange) {
                  onFiltersChange(new Set(defaultVisibleFilterIds()));
                }
              }}
            >
              Mặc định gọn
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

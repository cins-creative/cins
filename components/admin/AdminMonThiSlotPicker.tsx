"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { MonThiThumb } from "@/components/truong/MonThiThumb";
import { getAdminMonThiThumbDisplayUrl } from "@/lib/admin/mon-thi-display";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import {
  groupMonThiCatalog,
  labelMonThiLoai,
  type MonThiCatalogGroup,
} from "@/lib/truong/mon-thi-catalog";

type Props = {
  id: string;
  value: string;
  onChange: (monId: string) => void;
  options: AdminMonThiRow[];
  /** Môn đã chọn ở slot khác — ẩn khỏi danh sách. */
  excludeIds?: string[];
  required?: boolean;
  menuZIndex?: number;
};

function monThumbUrl(row: AdminMonThiRow): string | null {
  return getAdminMonThiThumbDisplayUrl(row);
}

function filterGroups(
  groups: MonThiCatalogGroup[],
  needle: string,
  exclude: Set<string>,
): MonThiCatalogGroup[] {
  const q = needle.trim().toLowerCase();
  const out: MonThiCatalogGroup[] = [];
  for (const group of groups) {
    const items = group.items.filter((item) => {
      if (exclude.has(item.id)) return false;
      if (!q) return true;
      const loaiLabel = labelMonThiLoai(item.loai).toLowerCase();
      return (
        item.ten.toLowerCase().includes(q) ||
        loaiLabel.includes(q) ||
        group.label.toLowerCase().includes(q)
      );
    });
    if (items.length) out.push({ ...group, items });
  }
  return out;
}

export function AdminMonThiSlotPicker({
  id,
  value,
  onChange,
  options,
  excludeIds = [],
  required = false,
  menuZIndex = 1100,
}: Props) {
  const menuId = useId();
  const searchId = `${id}-search`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [menuStyle, setMenuStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const catalogItems = useMemo(
    () =>
      options.map((row) => ({
        id: row.id,
        ten: row.ten,
        loai: row.loai,
        ma: row.ma,
        thumbnail_id: row.thumbnail_id,
        thumbnail_url: monThumbUrl(row),
      })),
    [options],
  );

  const groups = useMemo(() => groupMonThiCatalog(catalogItems), [catalogItems]);
  const filteredGroups = useMemo(
    () => filterGroups(groups, q, exclude),
    [groups, q, exclude],
  );

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const gap = 6;
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    if (left < 8) left = 8;

    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 240 && spaceAbove >= 160;
    const maxHeight = Math.min(
      280,
      Math.max(140, (openUp ? spaceAbove : spaceBelow) - 16),
    );

    if (openUp) {
      setMenuStyle({
        bottom: window.innerHeight - rect.top + gap,
        left,
        width,
        maxHeight,
      });
    } else {
      setMenuStyle({
        top: rect.bottom + gap,
        left,
        width,
        maxHeight,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition, filteredGroups.length]);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || portalRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (monId: string) => {
    onChange(monId);
    setOpen(false);
  };

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-admin admin-mon-thi-pick-portal" ref={portalRef}>
            <div
              id={menuId}
              ref={menuRef}
              className="admin-mon-thi-pick-menu"
              role="listbox"
              aria-label="Chọn môn thi"
              style={{
                position: "fixed",
                top: menuStyle.top,
                bottom: menuStyle.bottom,
                left: menuStyle.left,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
                zIndex: menuZIndex,
              }}
            >
              <div className="admin-mon-thi-pick-search">
                <Search size={14} aria-hidden />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={q}
                  placeholder="Tìm tên hoặc loại môn…"
                  autoComplete="off"
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
              </div>
              <div className="admin-mon-thi-pick-menu-scroll">
                {filteredGroups.length === 0 ? (
                  <p className="admin-mon-thi-pick-empty">
                    {q.trim()
                      ? "Không có môn phù hợp."
                      : "Không còn môn để chọn."}
                  </p>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.loaiKey} className="admin-mon-thi-pick-group">
                      <p className="admin-mon-thi-pick-group-label">{group.label}</p>
                      <ul className="admin-mon-thi-pick-group-list">
                        {group.items.map((item) => {
                          const active = item.id === value;
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={active}
                                className={`admin-mon-thi-pick-option${active ? " is-active" : ""}`}
                                onClick={() => pick(item.id)}
                              >
                                <MonThiThumb
                                  className="admin-mon-thi-pick-thumb"
                                  ten={item.ten}
                                  loai={item.loai}
                                  ma={item.ma}
                                  thumbnail_id={item.thumbnail_id}
                                  thumbnail_url={item.thumbnail_url}
                                />
                                <span className="admin-mon-thi-pick-option-name">
                                  {item.ten}
                                </span>
                                {active ? (
                                  <Check
                                    className="admin-mon-thi-pick-option-check"
                                    size={15}
                                    strokeWidth={2.2}
                                    aria-hidden
                                  />
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="admin-mon-thi-pick" ref={wrapRef}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`admin-mon-thi-pick-trigger${open ? " is-open" : ""}${selected ? " has-value" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <MonThiThumb
            className="admin-mon-thi-pick-thumb admin-mon-thi-pick-thumb--trigger"
            ten={selected.ten}
            loai={selected.loai}
            ma={selected.ma}
            thumbnail_id={selected.thumbnail_id}
            thumbnail_url={monThumbUrl(selected)}
          />
        ) : null}
        <span className="admin-mon-thi-pick-trigger-text">
          {selected ? (
            <>
              <span className="admin-mon-thi-pick-trigger-name">{selected.ten}</span>
              <span
                className={`admin-mon-thi-pick-loai-pill admin-mon-thi-pick-loai-pill--${selected.loai?.trim() || "default"}`}
              >
                {labelMonThiLoai(selected.loai)}
              </span>
            </>
          ) : (
            <span className="admin-mon-thi-pick-trigger-placeholder">
              Chọn môn thi…
            </span>
          )}
        </span>
        <ChevronDown
          className="admin-mon-thi-pick-chevron"
          size={14}
          aria-hidden
        />
      </button>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="admin-mon-thi-pick-validity"
          value={value}
          required
          readOnly
          onChange={() => {}}
        />
      ) : null}
      {menu}
    </div>
  );
}

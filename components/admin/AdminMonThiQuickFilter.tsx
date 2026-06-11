"use client";

import { Check, ChevronDown, Filter } from "lucide-react";
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

import { hasAdminMonThiRealThumb } from "@/lib/admin/mon-thi-display";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import { distinctMonThiLoai, labelMonThiLoai } from "@/lib/truong/mon-thi-catalog";

/** `""` = tất cả · `active` · `thumb` · `loai:<key>` */
export type AdminMonThiQuickFilterId = string;

export function matchesAdminMonThiQuickFilter(
  row: AdminMonThiRow,
  filterId: AdminMonThiQuickFilterId,
): boolean {
  if (!filterId) return true;
  if (filterId === "active") return row.trang_thai === "active";
  if (filterId === "thumb") return hasAdminMonThiRealThumb(row);
  if (filterId.startsWith("loai:")) {
    const k = filterId.slice(5);
    if (k === "__khac__") return !row.loai?.trim();
    return (row.loai ?? "") === k;
  }
  return true;
}

type FilterOption = {
  id: AdminMonThiQuickFilterId;
  label: string;
  count: number;
  group: "overview" | "loai";
};

function buildOptions(rows: AdminMonThiRow[]): FilterOption[] {
  const byLoai = new Map<string, number>();
  let active = 0;
  let realThumb = 0;
  for (const r of rows) {
    const k = r.loai?.trim() || "__khac__";
    byLoai.set(k, (byLoai.get(k) ?? 0) + 1);
    if (r.trang_thai === "active") active += 1;
    if (hasAdminMonThiRealThumb(r)) realThumb += 1;
  }

  const loaiKeys = distinctMonThiLoai(rows);
  const options: FilterOption[] = [
    { id: "", label: "Tất cả môn", count: rows.length, group: "overview" },
    { id: "active", label: "Đang active", count: active, group: "overview" },
    { id: "thumb", label: "Ảnh thật (CF)", count: realThumb, group: "overview" },
  ];

  for (const k of loaiKeys) {
    options.push({
      id: `loai:${k}`,
      label: k === "__khac__" ? "Khác / chưa gán loại" : labelMonThiLoai(k),
      count: byLoai.get(k) ?? 0,
      group: "loai",
    });
  }

  return options;
}

type Props = {
  rows: AdminMonThiRow[];
  value: AdminMonThiQuickFilterId;
  onChange: (value: AdminMonThiQuickFilterId) => void;
  menuZIndex?: number;
};

export function AdminMonThiQuickFilter({
  rows,
  value,
  onChange,
  menuZIndex = 120,
}: Props) {
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const options = useMemo(() => buildOptions(rows), [rows]);
  const activeOption = useMemo(
    () => options.find((o) => o.id === value) ?? options[0],
    [options, value],
  );

  const overviewOptions = options.filter((o) => o.group === "overview");
  const loaiOptions = options.filter((o) => o.group === "loai");

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
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
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) {
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

  function pick(id: AdminMonThiQuickFilterId) {
    onChange(id);
    setOpen(false);
  }

  function renderOption(opt: FilterOption) {
    const selected = opt.id === value;
    return (
      <button
        key={opt.id || "__all__"}
        type="button"
        role="option"
        aria-selected={selected}
        className={`admin-mon-thi-qf-option${selected ? " is-active" : ""}`}
        onClick={() => pick(opt.id)}
      >
        <span className="admin-mon-thi-qf-option-label">{opt.label}</span>
        <span className="admin-mon-thi-qf-option-count">{opt.count}</span>
        {selected ? (
          <Check className="admin-mon-thi-qf-option-check" size={14} strokeWidth={2.2} />
        ) : null}
      </button>
    );
  }

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-admin admin-mon-thi-qf-portal">
            <div
              id={menuId}
              ref={menuRef}
              className="admin-mon-thi-qf-menu"
              role="listbox"
              aria-label="Lọc môn thi"
              style={{
                position: "fixed",
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
                zIndex: menuZIndex,
              }}
            >
              <p className="admin-mon-thi-qf-group-label">Tổng quan</p>
              {overviewOptions.map(renderOption)}
              {loaiOptions.length > 0 ? (
                <>
                  <p className="admin-mon-thi-qf-group-label">Theo loại</p>
                  {loaiOptions.map(renderOption)}
                </>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="admin-mon-thi-qf" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`admin-mon-thi-qf-trigger${open ? " is-open" : ""}${value ? " has-filter" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Filter className="admin-mon-thi-qf-icon" size={14} aria-hidden />
        <span className="admin-mon-thi-qf-trigger-label">
          {activeOption?.label ?? "Lọc môn"}
        </span>
        <span className="admin-mon-thi-qf-trigger-count">{activeOption?.count ?? 0}</span>
        <ChevronDown className="admin-mon-thi-qf-chevron" size={14} aria-hidden />
      </button>
      {menu}
    </div>
  );
}

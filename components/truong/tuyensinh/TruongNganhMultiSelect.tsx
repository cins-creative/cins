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

import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongNganhProgram } from "@/lib/truong/types";

type Props = {
  id?: string;
  label?: string;
  programs: TruongNganhProgram[];
  applyAll: boolean;
  selectedIds: Set<string>;
  onApplyAllChange: (all: boolean) => void;
  onSelectedChange: (ids: Set<string>) => void;
  disabled?: boolean;
  menuZIndex?: number;
};

function nganhThumbInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NH";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0] ?? ""}${words[words.length - 1]![0] ?? ""}`.toUpperCase();
}

function nganhThumbLabel(prog: TruongNganhProgram): string {
  const code = prog.ma_nganh?.trim();
  if (code) return code.slice(0, 4).toUpperCase();
  return nganhThumbInitials(prog.nganhTitle);
}

function NganhMsThumb({ prog }: { prog: TruongNganhProgram }) {
  const thumbUrl =
    prog.cover_src?.trim() ||
    getCfImageUrlWithFallbacks(prog.cover_id, ["public", "cover", "medium"]);
  const hasImg = Boolean(thumbUrl);

  return (
    <span
      className={`tdh-nganh-ms-thumb${hasImg ? " tdh-nganh-ms-thumb--img" : " tdh-nganh-ms-thumb--ph"}`}
      aria-hidden
    >
      {hasImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl!} alt="" className="tdh-nganh-ms-thumb-img" />
      ) : (
        <span className="tdh-nganh-ms-thumb-mark">{nganhThumbLabel(prog)}</span>
      )}
    </span>
  );
}

function summaryLabel(
  applyAll: boolean,
  selectedIds: Set<string>,
  programs: TruongNganhProgram[],
): string {
  if (applyAll) return "Tất cả ngành";
  if (selectedIds.size === 0) return "Chọn ngành…";

  const names = [...selectedIds]
    .map((id) => programs.find((p) => p.id === id)?.nganhTitle)
    .filter(Boolean) as string[];

  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} · ${names[1]}`;
  return `${names[0]} +${names.length - 1} ngành`;
}

export function TruongNganhMultiSelect({
  id,
  label = "Áp dụng cho ngành",
  programs,
  applyAll,
  selectedIds,
  onApplyAllChange,
  onSelectedChange,
  disabled = false,
  menuZIndex = 10070,
}: Props) {
  const menuId = useId();
  const searchId = id ? `${id}-search` : undefined;
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

  const sortedPrograms = useMemo(
    () => [...programs].sort((a, b) => a.nganhTitle.localeCompare(b.nganhTitle, "vi")),
    [programs],
  );

  const filteredPrograms = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sortedPrograms;
    return sortedPrograms.filter((p) => {
      const hay = [p.nganhTitle, p.ma_nganh, p.ten_chuong_trinh]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [sortedPrograms, q]);

  const triggerLabel = useMemo(
    () => summaryLabel(applyAll, selectedIds, programs),
    [applyAll, selectedIds, programs],
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
  }, [open, updateMenuPosition, filteredPrograms.length]);

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

  function selectAll() {
    onApplyAllChange(true);
    onSelectedChange(new Set());
  }

  function toggleProgram(programId: string) {
    const next = applyAll ? new Set<string>() : new Set(selectedIds);
    if (next.has(programId)) next.delete(programId);
    else next.add(programId);
    onApplyAllChange(false);
    onSelectedChange(next);
  }

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div className="tdh-nganh-ms-portal" ref={portalRef}>
            <div
              id={menuId}
              ref={menuRef}
              className="tdh-nganh-ms-menu"
              role="listbox"
              aria-multiselectable="true"
              aria-label={label}
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
              <div className="tdh-nganh-ms-search">
                <Search size={14} aria-hidden />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={q}
                  placeholder="Tìm tên hoặc mã ngành…"
                  autoComplete="off"
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                />
              </div>
              <div className="tdh-nganh-ms-menu-scroll">
                <p className="tdh-nganh-ms-group-label">Phạm vi</p>
                <button
                  type="button"
                  role="option"
                  aria-selected={applyAll}
                  className={`tdh-nganh-ms-option${applyAll ? " is-active" : ""}`}
                  onClick={selectAll}
                >
                  <span className="tdh-nganh-ms-option-all-icon" aria-hidden>
                    ∗
                  </span>
                  <span className="tdh-nganh-ms-option-name">Tất cả ngành</span>
                  {applyAll ? (
                    <Check className="tdh-nganh-ms-option-check" size={15} strokeWidth={2.2} />
                  ) : null}
                </button>

                {sortedPrograms.length > 0 ? (
                  <>
                    <p className="tdh-nganh-ms-group-label">Ngành đào tạo</p>
                    {filteredPrograms.length === 0 ? (
                      <p className="tdh-nganh-ms-empty">Không có ngành phù hợp.</p>
                    ) : (
                      <ul className="tdh-nganh-ms-list">
                        {filteredPrograms.map((p) => {
                          const checked = !applyAll && selectedIds.has(p.id);
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={checked}
                                className={`tdh-nganh-ms-option${checked ? " is-active" : ""}`}
                                onClick={() => toggleProgram(p.id)}
                              >
                                <NganhMsThumb prog={p} />
                                <span className="tdh-nganh-ms-option-name">
                                  {p.nganhTitle}
                                </span>
                                {checked ? (
                                  <Check
                                    className="tdh-nganh-ms-option-check"
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
                    )}
                  </>
                ) : (
                  <p className="tdh-nganh-ms-empty">Chưa có ngành đào tạo trên trang.</p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const selectedCount = applyAll ? programs.length : selectedIds.size;

  return (
    <div className="tdh-inline-field tdh-nganh-ms" ref={wrapRef}>
      <span id={id ? `${id}-label` : undefined}>{label}</span>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`tdh-nganh-ms-trigger${open ? " is-open" : ""}${applyAll || selectedIds.size ? " has-value" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-labelledby={id ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tdh-nganh-ms-trigger-label">{triggerLabel}</span>
        {!applyAll && selectedIds.size > 0 ? (
          <span className="tdh-nganh-ms-trigger-count">{selectedIds.size}</span>
        ) : applyAll && programs.length > 0 ? (
          <span className="tdh-nganh-ms-trigger-count">{programs.length}</span>
        ) : null}
        <ChevronDown className="tdh-nganh-ms-chevron" size={14} aria-hidden />
      </button>
      {!applyAll && selectedIds.size > 0 ? (
        <span className="tdh-inline-field-hint">
          {selectedCount} ngành được chọn — bấm lại để bỏ chọn.
        </span>
      ) : null}
      {menu}
    </div>
  );
}

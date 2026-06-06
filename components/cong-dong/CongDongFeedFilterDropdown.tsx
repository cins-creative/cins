"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CongDongFilterIcon } from "@/components/cong-dong/CongDongFilterIcon";
import { filterToolbarLabel } from "@/components/cong-dong/CongDongFilterChip";
import type { CongDongFilter } from "@/lib/cong-dong/types";

type Props = {
  filters: CongDongFilter[];
  activeFilterSlugs: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
  /** `compose`: bắt buộc chọn một nhãn (không có "Tất cả"). */
  variant?: "feed" | "compose";
  className?: string;
  /** z-index menu portal — mặc định 9150. */
  menuZIndex?: number;
};

export function CongDongFeedFilterDropdown({
  filters,
  activeFilterSlugs,
  onChange,
  disabled = false,
  variant = "feed",
  className,
  menuZIndex = 9150,
}: Props) {
  const isCompose = variant === "compose";
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const activeFilter =
    activeFilterSlugs.length === 1
      ? filters.find((f) => f.slug === activeFilterSlugs[0])
      : undefined;

  const triggerLabel = activeFilter
    ? filterToolbarLabel(activeFilter.ten)
    : isCompose
      ? "Chọn loại"
      : "Tất cả";

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: rect.width,
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

  const pick = (slugs: string[]) => {
    onChange(slugs);
    setOpen(false);
  };

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            id={menuId}
            ref={menuRef}
            className="cd-v4-filter-dd-menu cd-v4-filter-dd-menu--portal"
            role="listbox"
            aria-label={isCompose ? "Chọn loại bài đăng" : "Chọn nhãn lọc"}
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
              zIndex: menuZIndex,
            }}
          >
            {!isCompose ? (
              <button
                type="button"
                role="option"
                aria-selected={activeFilterSlugs.length === 0}
                className={`cd-v4-filter-dd-item${activeFilterSlugs.length === 0 ? " is-active" : ""}`}
                onClick={() => pick([])}
              >
                <span>Tất cả</span>
                {activeFilterSlugs.length === 0 ? (
                  <Check size={15} strokeWidth={2.2} aria-hidden />
                ) : null}
              </button>
            ) : null}
            {filters.map((filter) => {
              const active = activeFilterSlugs.includes(filter.slug);
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`cd-v4-filter-dd-item${active ? " is-active" : ""}`}
                  onClick={() =>
                    pick(
                      isCompose
                        ? [filter.slug]
                        : active
                          ? []
                          : [filter.slug],
                    )
                  }
                >
                  <span className="cd-v4-filter-dd-item-main">
                    <CongDongFilterIcon
                      name={filter.icon}
                      size={15}
                      color={filter.mau}
                    />
                    <span>{filterToolbarLabel(filter.ten)}</span>
                  </span>
                  {active ? (
                    <Check size={15} strokeWidth={2.2} aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`cd-v4-filter-dd${className ? ` ${className}` : ""}`}
      ref={wrapRef}
    >
      <button
        ref={btnRef}
        type="button"
        className={`cd-v4-filter-dd-trigger${open ? " is-open" : ""}${activeFilter ? " has-filter" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={
          activeFilter
            ? ({ "--cd-filter-mau": activeFilter.mau } as React.CSSProperties)
            : undefined
        }
      >
        {activeFilter ? (
          <CongDongFilterIcon
            name={activeFilter.icon}
            size={15}
            color={activeFilter.mau}
          />
        ) : null}
        <span className="cd-v4-filter-dd-label">{triggerLabel}</span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </button>
      {menu}
    </div>
  );
}

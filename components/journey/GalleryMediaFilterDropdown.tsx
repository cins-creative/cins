"use client";

import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  GALLERY_MEDIA_FILTER_OPTIONS,
  galleryMediaFilterLabel,
  type GalleryMediaFilter,
} from "@/lib/journey/post-media";

const GALLERY_FILTER_MENU_MIN_WIDTH = 148;

type Props = {
  filter: GalleryMediaFilter;
  onFilterChange: (filter: GalleryMediaFilter) => void;
  className?: string;
  /** Số tác phẩm — hiển thị trong nút toolbar (`.j-tlb-dd-count`). */
  count?: number;
  /** `toolbar` — nút `.j-tlb-dd-btn` trên context bar gallery chính. */
  variant?: "compact" | "toolbar";
};

export function GalleryMediaFilterDropdown({
  filter,
  onFilterChange,
  className,
  count,
  variant = "compact",
}: Props) {
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const updateMenuPosition = () => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - GALLERY_FILTER_MENU_MIN_WIDTH),
    });
  };

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
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    const timerId = window.setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 0);
    document.addEventListener("keydown", onEsc);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        className="j-tlb-dd-menu is-portal j-gallery-dd-menu"
        role="listbox"
        aria-label="Lọc tác phẩm theo loại"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: "max-content",
          minWidth: GALLERY_FILTER_MENU_MIN_WIDTH,
          maxWidth: "min(200px, calc(100vw - 16px))",
          display: "block",
        }}
      >
        {GALLERY_MEDIA_FILTER_OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className={"j-dd-opt" + (filter === opt.id ? " is-active" : "")}
          >
            <button
              type="button"
              role="option"
              aria-selected={filter === opt.id}
              className="j-dd-opt-main j-gallery-dd-opt"
              onClick={() => {
                onFilterChange(opt.id);
                setOpen(false);
              }}
            >
              <span className="j-dd-lbl">{opt.label}</span>
            </button>
          </div>
        ))}
      </div>
    ) : null;

  const label = galleryMediaFilterLabel(filter);
  const countLabel =
    count != null ? count.toLocaleString("vi-VN") : null;
  const isToolbar = variant === "toolbar";

  return (
    <>
      <div
        ref={wrapRef}
        className={
          (isToolbar ? "j-tlb-filter" : "j-gallery-dd") +
          (open ? " is-open" : "") +
          (className ? ` ${className}` : "")
        }
      >
        <button
          ref={btnRef}
          type="button"
          className={isToolbar ? "j-tlb-dd-btn" : "j-gallery-dd-btn"}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={
            countLabel != null
              ? `Lọc tác phẩm: ${label}, ${countLabel} tác phẩm`
              : `Lọc tác phẩm: ${label}`
          }
        >
          <span>{label}</span>
          {countLabel != null ? (
            <span className="j-tlb-dd-count">{countLabel}</span>
          ) : null}
          <span
            className={isToolbar ? "j-tlb-dd-caret" : "j-gallery-dd-caret"}
            aria-hidden
          >
            <ChevronDown size={isToolbar ? 14 : 12} strokeWidth={isToolbar ? 1.8 : 2} />
          </span>
        </button>
      </div>

      {portalReady && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

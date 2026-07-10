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
  galleryMediaFilterButtonLabel,
  type GalleryMediaFilter,
} from "@/lib/journey/post-media";
import { computeFixedMenuPosition } from "@/lib/ui/clamp-fixed-menu-position";

const GALLERY_FILTER_MENU_MIN_WIDTH = 168;
const GALLERY_FILTER_MENU_EST_HEIGHT = 260;

type Props = {
  filter: GalleryMediaFilter;
  onFilterChange: (filter: GalleryMediaFilter) => void;
  className?: string;
  /** `toolbar` — nút `.j-tlb-dd-btn` trên context bar gallery chính. */
  variant?: "compact" | "toolbar";
};

export function GalleryMediaFilterDropdown({
  filter,
  onFilterChange,
  className,
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
    const menuEl = menuRef.current;
    const menuWidth =
      menuEl?.offsetWidth ||
      Math.min(220, Math.max(GALLERY_FILTER_MENU_MIN_WIDTH, window.innerWidth - 16));
    const menuHeight = menuEl?.offsetHeight || GALLERY_FILTER_MENU_EST_HEIGHT;
    setMenuStyle(
      computeFixedMenuPosition(rect, { width: menuWidth, height: menuHeight }),
    );
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    const rafId = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(rafId);
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
        className="j-tlb-dd-menu is-portal j-gallery-dd-menu j-gallery-media-dd-menu"
        role="listbox"
        aria-label="Lọc theo loại nội dung"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: "max-content",
          minWidth: GALLERY_FILTER_MENU_MIN_WIDTH,
          maxWidth: "min(220px, calc(100vw - 16px))",
          display: "block",
        }}
      >
        <div className="j-dd-section-label">Loại nội dung</div>
        {GALLERY_MEDIA_FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.id;
          return (
            <div
              key={opt.id}
              className={"j-dd-opt" + (active ? " is-active" : "")}
            >
              <button
                type="button"
                role="option"
                aria-selected={active}
                className="j-dd-opt-main j-gallery-dd-opt"
                onClick={() => {
                  onFilterChange(opt.id);
                  setOpen(false);
                }}
              >
                <span className="j-dd-lbl">{opt.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    ) : null;

  const label = galleryMediaFilterButtonLabel(filter);
  const isToolbar = variant === "toolbar";

  return (
    <>
      <div
        ref={wrapRef}
        className={
          (isToolbar ? "j-tlb-filter j-gallery-media-filter" : "j-gallery-dd") +
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
          aria-label={`Loại nội dung: ${label}`}
        >
          <span>{label}</span>
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

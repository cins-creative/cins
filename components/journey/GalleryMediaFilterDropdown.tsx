"use client";

import {
  Check,
  ChevronDown,
  Code2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
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

const MEDIA_FILTER_ICON: Record<GalleryMediaFilter, LucideIcon> = {
  all: Sparkles,
  article: FileText,
  photo: ImageIcon,
  video: Video,
  embed: Code2,
};

type Props = {
  filter: GalleryMediaFilter;
  onFilterChange: (filter: GalleryMediaFilter) => void;
  className?: string;
  /**
   * `compact` — pill nhỏ aside cũ.
   * `toolbar` — `.j-tlb-dd-btn` trên gallery chính.
   * `icon` — nút icon 32px như `.wj-filter-btn` (World Journey).
   */
  variant?: "compact" | "toolbar" | "icon";
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

  const isIcon = variant === "icon";
  const label = galleryMediaFilterButtonLabel(filter);
  const ActiveIcon = MEDIA_FILTER_ICON[filter] ?? Sparkles;

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        className={
          "j-tlb-dd-menu is-portal j-gallery-dd-menu j-gallery-media-dd-menu" +
          (isIcon ? " j-gallery-media-dd-menu--icon" : "")
        }
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
        {!isIcon ? (
          <div className="j-dd-section-label">Loại nội dung</div>
        ) : null}
        {GALLERY_MEDIA_FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.id;
          const OptIcon = MEDIA_FILTER_ICON[opt.id];
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
                {isIcon ? (
                  <span className="j-dd-ico" aria-hidden>
                    <OptIcon size={13} strokeWidth={1.7} />
                  </span>
                ) : null}
                <span className="j-dd-lbl">{opt.label}</span>
                {isIcon ? (
                  <Check
                    className="j-gallery-media-check"
                    size={13}
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    ) : null;

  const isToolbar = variant === "toolbar";
  const wrapClass = isIcon
    ? "j-tlb-filter j-gallery-media-filter j-gallery-media-filter--icon"
    : isToolbar
      ? "j-tlb-filter j-gallery-media-filter"
      : "j-gallery-dd";

  return (
    <>
      <div
        ref={wrapRef}
        className={
          wrapClass + (open ? " is-open" : "") + (className ? ` ${className}` : "")
        }
      >
        <button
          ref={btnRef}
          type="button"
          className={
            isIcon
              ? "j-gallery-media-icon-btn"
              : isToolbar
                ? "j-tlb-dd-btn"
                : "j-gallery-dd-btn"
          }
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Loại nội dung: ${galleryMediaFilterLabel(filter)}`}
          title={galleryMediaFilterLabel(filter)}
        >
          {isIcon ? (
            <ActiveIcon size={15} strokeWidth={2} aria-hidden />
          ) : (
            <>
              <span>{label}</span>
              <span
                className={isToolbar ? "j-tlb-dd-caret" : "j-gallery-dd-caret"}
                aria-hidden
              >
                <ChevronDown
                  size={isToolbar ? 14 : 12}
                  strokeWidth={isToolbar ? 1.8 : 2}
                />
              </span>
            </>
          )}
        </button>
      </div>

      {portalReady && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

"use client";

import {
  ArrowDownAZ,
  ArrowUpDown,
  Clock3,
  Heart,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { computeFixedMenuPosition } from "@/lib/ui/clamp-fixed-menu-position";

export type CongDongFeedSortMode = "moi" | "tuongtac" | "az";

const SORT_OPTIONS: ReadonlyArray<{
  id: CongDongFeedSortMode;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "moi", label: "Mới nhất", Icon: Clock3 },
  { id: "tuongtac", label: "Tương tác", Icon: Heart },
  { id: "az", label: "A → Z", Icon: ArrowDownAZ },
];

const MENU_MIN_WIDTH = 168;
const MENU_EST_HEIGHT = 160;

type Props = {
  sortMode: CongDongFeedSortMode;
  onSortModeChange: (mode: CongDongFeedSortMode) => void;
  disabled?: boolean;
};

/**
 * Sort feed — nút icon `.j-tlb-dd-btn.is-icon` đồng bộ Journey / Gallery filter.
 */
export function CongDongFeedSortDropdown({
  sortMode,
  onSortModeChange,
  disabled = false,
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

  const current =
    SORT_OPTIONS.find((o) => o.id === sortMode) ?? SORT_OPTIONS[0];

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
      Math.min(240, Math.max(MENU_MIN_WIDTH, window.innerWidth - 16));
    const menuHeight = menuEl?.offsetHeight || MENU_EST_HEIGHT;
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
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", onDocPointerDown, true);
    }, 0);
    document.addEventListener("keydown", onEsc);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", onDocPointerDown, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        className="j-tlb-dd-menu is-portal"
        role="listbox"
        aria-label="Sắp xếp bài đăng"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: "max-content",
          minWidth: MENU_MIN_WIDTH,
          maxWidth: "min(280px, calc(100vw - 16px))",
          display: "block",
        }}
      >
        {SORT_OPTIONS.map((opt) => {
          const active = opt.id === sortMode;
          return (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={active}
              className={`j-dd-opt${active ? " is-active" : ""}`}
              onClick={() => {
                onSortModeChange(opt.id);
                setOpen(false);
              }}
            >
              <span className="j-dd-opt-main">
                <span className="j-dd-ico" aria-hidden>
                  <opt.Icon size={13} strokeWidth={1.7} />
                </span>
                <span className="j-dd-lbl">{opt.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div
      ref={wrapRef}
      className={"j-tlb-filter" + (open ? " is-open" : "")}
    >
      <button
        ref={btnRef}
        type="button"
        className="j-tlb-dd-btn is-icon"
        disabled={disabled}
        aria-label={`Sắp xếp: ${current.label}`}
        title={`Sắp xếp: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className="j-tlb-dd-ico" aria-hidden>
          <ArrowUpDown size={14} strokeWidth={1.8} />
        </span>
      </button>
      {portalReady && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

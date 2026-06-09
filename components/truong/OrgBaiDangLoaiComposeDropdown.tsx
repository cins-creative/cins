"use client";

import {
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  GraduationCap,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  BAI_DANG_LOAI_LABELS,
  BAI_DANG_LOAI_VALUES,
  type BaiDangLoai,
} from "@/lib/truong/bai-dang";

const LOAI_ICON: Record<BaiDangLoai, LucideIcon> = {
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  hoc_bong: Award,
  su_kien: CalendarDays,
  khac: Megaphone,
};

type Props = {
  value: BaiDangLoai;
  onChange: (loai: BaiDangLoai) => void;
  disabled?: boolean;
  className?: string;
  menuZIndex?: number;
};

export function OrgBaiDangLoaiComposeDropdown({
  value,
  onChange,
  disabled = false,
  className,
  menuZIndex = 9150,
}: Props) {
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

  const ActiveIcon = LOAI_ICON[value];
  const triggerLabel = BAI_DANG_LOAI_LABELS[value];

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

  const pick = (loai: BaiDangLoai) => {
    onChange(loai);
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
            aria-label="Chọn loại bài đăng"
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
              zIndex: menuZIndex,
            }}
          >
            {BAI_DANG_LOAI_VALUES.map((loai) => {
              const active = value === loai;
              const Icon = LOAI_ICON[loai];
              return (
                <button
                  key={loai}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`cd-v4-filter-dd-item${active ? " is-active" : ""}`}
                  onClick={() => pick(loai)}
                >
                  <span className="cd-v4-filter-dd-item-main">
                    <Icon size={15} strokeWidth={2} aria-hidden />
                    <span>{BAI_DANG_LOAI_LABELS[loai]}</span>
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
        className={`cd-v4-filter-dd-trigger has-filter${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <ActiveIcon size={15} strokeWidth={2} aria-hidden />
        <span className="cd-v4-filter-dd-label">{triggerLabel}</span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </button>
      {menu}
    </div>
  );
}

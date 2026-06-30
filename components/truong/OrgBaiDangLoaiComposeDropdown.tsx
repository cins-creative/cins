"use client";

import {
  Award,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  Megaphone,
  Package,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  collectScrollResizeTargets,
  computeFixedMenuPosition,
} from "@/lib/ui/clamp-fixed-menu-position";
import { loaiBaiDangCssClass } from "@/lib/truong/bai-dang";
import {
  SCHOOL_LOAI_CONFIG,
  loaiOptionLabel,
  type OrgBaiDangLoaiOption,
} from "@/lib/truong/org-bai-dang-loai-options";

const LOAI_ICON_BY_VALUE: Record<string, LucideIcon> = {
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  hoc_bong: Award,
  su_kien: CalendarDays,
  khac: FileText,
  showcase: Package,
};

function loaiIcon(value: string): LucideIcon {
  return LOAI_ICON_BY_VALUE[value] ?? Megaphone;
}

const LOAI_MENU_W = 232;
const LOAI_MENU_EST_H = 220;
const LOAI_MENU_Z = 9600;

type Props = {
  value: string;
  onChange: (loai: string) => void;
  /** Danh sách loại — mặc định 5 loại trường/cơ sở. */
  options?: OrgBaiDangLoaiOption[];
  disabled?: boolean;
  menuZIndex?: number;
};

export function OrgBaiDangLoaiComposeDropdown({
  value,
  onChange,
  options = SCHOOL_LOAI_CONFIG.options,
  disabled = false,
  menuZIndex = LOAI_MENU_Z,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const ActiveIcon = loaiIcon(value);
  const lc = loaiBaiDangCssClass(value);

  const currentLabel = useMemo(
    () => loaiOptionLabel({ ...SCHOOL_LOAI_CONFIG, options }, value),
    [options, value],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuHeight =
      menuRef.current?.getBoundingClientRect().height || LOAI_MENU_EST_H;
    const { top, left } = computeFixedMenuPosition(
      rect,
      { width: LOAI_MENU_W, height: menuHeight },
      { gap: 6, margin: 8 },
    );
    setMenuStyle({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    const scrollTargets = collectScrollResizeTargets(btnRef.current);
    const onReflow = () => updateMenuPosition();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", onReflow, { passive: true });
    }
    window.addEventListener("resize", onReflow);
    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", onReflow);
      }
      window.removeEventListener("resize", onReflow);
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

  const pick = (loai: string) => {
    onChange(loai);
    setOpen(false);
  };

  const menu =
    open && menuStyle && portalReady && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-editor-page vis-portal-root">
            <div
              ref={menuRef}
              className="org-compose-loai-menu is-portal"
              role="listbox"
              aria-label="Chọn loại bài đăng"
              style={{
                position: "fixed",
                top: menuStyle.top,
                left: menuStyle.left,
                width: LOAI_MENU_W,
                zIndex: menuZIndex,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {options.map((option) => {
                const active = value === option.value;
                const Icon = loaiIcon(option.value);
                const itemLc = loaiBaiDangCssClass(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`org-compose-loai-opt org-compose-loai-opt--${itemLc}${active ? " is-active" : ""}`}
                    onClick={() => pick(option.value)}
                  >
                    <span className="org-compose-loai-opt-ico" aria-hidden>
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="org-compose-loai-opt-label">
                      {option.label}
                    </span>
                    {active ? (
                      <Check size={15} strokeWidth={2.2} aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`org-compose-loai-select vis-select${open ? " open" : ""}`}
      ref={wrapRef}
    >
      <button
        ref={btnRef}
        type="button"
        className={`org-compose-loai-btn org-compose-loai-btn--${lc}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="ico" aria-hidden>
          <ActiveIcon size={14} strokeWidth={1.9} />
        </span>
        <span>{currentLabel}</span>
        <span className="caret" aria-hidden>▾</span>
      </button>
      {menu}
    </div>
  );
}

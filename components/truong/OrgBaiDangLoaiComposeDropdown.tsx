"use client";

import {
  Award,
  CalendarDays,
  Check,
  GraduationCap,
  Megaphone,
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
import {
  BAI_DANG_LOAI_LABELS,
  BAI_DANG_LOAI_VALUES,
  loaiBaiDangCssClass,
  type BaiDangLoai,
} from "@/lib/truong/bai-dang";

const LOAI_ICON: Record<BaiDangLoai, LucideIcon> = {
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  hoc_bong: Award,
  su_kien: CalendarDays,
  khac: Megaphone,
};

const LOAI_MENU_W = 232;
const LOAI_MENU_EST_H = 220;
const LOAI_MENU_Z = 9600;

type Props = {
  value: BaiDangLoai;
  onChange: (loai: BaiDangLoai) => void;
  disabled?: boolean;
  menuZIndex?: number;
};

export function OrgBaiDangLoaiComposeDropdown({
  value,
  onChange,
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

  const ActiveIcon = LOAI_ICON[value];
  const lc = loaiBaiDangCssClass(value);

  const currentLabel = useMemo(
    () => BAI_DANG_LOAI_LABELS[value],
    [value],
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

  const pick = (loai: BaiDangLoai) => {
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
              {BAI_DANG_LOAI_VALUES.map((loai) => {
                const active = value === loai;
                const Icon = LOAI_ICON[loai];
                const itemLc = loaiBaiDangCssClass(loai);
                return (
                  <button
                    key={loai}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`org-compose-loai-opt org-compose-loai-opt--${itemLc}${active ? " is-active" : ""}`}
                    onClick={() => pick(loai)}
                  >
                    <span className="org-compose-loai-opt-ico" aria-hidden>
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="org-compose-loai-opt-label">
                      {BAI_DANG_LOAI_LABELS[loai]}
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

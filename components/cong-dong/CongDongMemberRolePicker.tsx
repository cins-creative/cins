"use client";

import { ChevronDown } from "lucide-react";
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
  assignableRoleLabel,
  assignableRolePermissionSummary,
  assignableRolePermissions,
  CONG_DONG_ASSIGNABLE_ROLES,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";

const MENU_GAP = 6;
const MENU_Z_INDEX = 10650;
const MENU_MIN_WIDTH = 260;
const MENU_MAX_WIDTH = 300;
const MENU_EST_HEIGHT = 280;

type MenuStyle = {
  top: number;
  left: number;
  width: number;
  openAbove: boolean;
};

type Props = {
  value: CongDongVaiTro;
  onChange: (next: CongDongVaiTro) => void;
  disabled?: boolean;
  ariaLabel: string;
  compact?: boolean;
};

export function CongDongMemberRolePicker({
  value,
  onChange,
  disabled = false,
  ariaLabel,
  compact = false,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(
      Math.max(rect.width, MENU_MIN_WIDTH),
      MENU_MAX_WIDTH,
    );
    const menuHeight = menuRef.current?.offsetHeight ?? MENU_EST_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const openAbove =
      spaceBelow < menuHeight && rect.top > menuHeight + MENU_GAP;
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - width - 8),
    );
    setMenuStyle({
      top: openAbove ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      left,
      width,
      openAbove,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    let frame = requestAnimationFrame(() => {
      updateMenuPosition();
      frame = requestAnimationFrame(updateMenuPosition);
    });
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      const target = ev.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const menu =
    open && menuStyle ? (
      <ul
        ref={menuRef}
        id={listId}
        className="cd-v4-members-role-picker-menu is-portal"
        role="listbox"
        aria-label={ariaLabel}
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: menuStyle.width,
          zIndex: MENU_Z_INDEX,
          transform: menuStyle.openAbove ? "translateY(-100%)" : undefined,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {CONG_DONG_ASSIGNABLE_ROLES.map((role) => (
          <li key={role}>
            <button
              type="button"
              className={`cd-v4-members-role-picker-option${value === role ? " is-active" : ""}`}
              role="option"
              aria-selected={value === role}
              onClick={() => {
                onChange(role);
                setOpen(false);
              }}
            >
              <span className="cd-v4-members-role-picker-option-label">
                {assignableRoleLabel(role)}
              </span>
              <ul className="cd-v4-members-role-picker-perms">
                {assignableRolePermissions(role).map((perm) => (
                  <li key={perm}>{perm}</li>
                ))}
              </ul>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div
      className={`cd-v4-members-role-picker${compact ? " is-compact" : ""}`}
      ref={wrapRef}
    >
      <button
        ref={btnRef}
        type="button"
        className="cd-v4-members-role-picker-btn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cd-v4-members-role-picker-copy">
          <span className="cd-v4-members-role-picker-label">
            {assignableRoleLabel(value)}
          </span>
          {!compact ? (
            <span className="cd-v4-members-role-picker-summary">
              {assignableRolePermissionSummary(value)}
            </span>
          ) : null}
        </span>
        <ChevronDown size={15} strokeWidth={2} aria-hidden />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

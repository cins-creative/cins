"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  assignableRoleLabel,
  assignableRolePermissionSummary,
  assignableRolePermissions,
  CONG_DONG_ASSIGNABLE_ROLES,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      className={`cd-v4-members-role-picker${compact ? " is-compact" : ""}`}
      ref={wrapRef}
    >
      <button
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
          <span className="cd-v4-members-role-picker-summary">
            {assignableRolePermissionSummary(value)}
          </span>
        </span>
        <ChevronDown size={15} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <ul
          id={listId}
          className="cd-v4-members-role-picker-menu"
          role="listbox"
          aria-label={ariaLabel}
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
      ) : null}
    </div>
  );
}

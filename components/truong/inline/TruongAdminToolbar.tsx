"use client";

import { Eye, Pencil, Shield, ShieldCheck } from "lucide-react";
import { createPortal } from "react-dom";

import { useTopbarPageSlot } from "@/components/cins/useTopbarPageSlot";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  isElevatedRole,
  SYSTEM_ROLE_LABELS,
} from "@/lib/auth/system-role-labels";

export function TruongAdminToolbar() {
  const ctx = useTruongInlineEdit();
  const slot = useTopbarPageSlot();

  // Thành viên cơ bản (không có quyền sửa trang) → không hiển thị gì.
  if (!ctx?.canEdit || !slot) return null;

  const {
    isEditing,
    saving,
    systemRole,
    setEditMode,
  } = ctx;

  const elevated = isElevatedRole(systemRole);
  const roleKey = elevated ? systemRole : "org";
  const roleLabel = elevated ? SYSTEM_ROLE_LABELS[systemRole] : "Quản trị";
  const RoleIcon =
    roleKey === "super_admin"
      ? Shield
      : roleKey === "admin"
        ? ShieldCheck
        : Pencil;

  return createPortal(
    <div className="tb-truong-admin" role="group" aria-label="Quản trị trang trường">
      {isEditing && saving ? (
        <span className="tb-truong-admin-saving" aria-live="polite">
          Đang lưu…
        </span>
      ) : null}
      <button
        type="button"
        className={`tb-truong-admin-btn tb-truong-role-btn tb-truong-role-btn--${roleKey}${
          isEditing ? " is-active" : ""
        }`}
        aria-pressed={isEditing}
        title={
          isEditing
            ? "Đang ở chế độ quản trị — bấm để xem như người dùng"
            : `Vai trò: ${roleLabel} — bấm để bật chế độ quản trị`
        }
        onClick={() => setEditMode(!isEditing)}
      >
        {isEditing ? (
          <Eye size={14} strokeWidth={2} aria-hidden />
        ) : (
          <RoleIcon size={14} strokeWidth={2} aria-hidden />
        )}
        <span className="tb-truong-role-name">{roleLabel}</span>
        <span className="tb-truong-role-state" aria-hidden>
          {isEditing ? "Đang sửa" : "Xem"}
        </span>
      </button>
    </div>,
    slot,
  );
}

"use client";

import { ClipboardList, Eye, Pencil, Settings, Shield, ShieldCheck } from "lucide-react";
import { createPortal } from "react-dom";

import { useTopbarPageSlot } from "@/components/cins/useTopbarPageSlot";
import type { TruongSettingsSection } from "@/components/truong/TruongPageSettingsModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  isElevatedRole,
  SYSTEM_ROLE_LABELS,
} from "@/lib/auth/system-role-labels";

type Props = {
  onOpenSettings?: (section: TruongSettingsSection) => void;
  /** Deep-link sang dashboard `/quan-ly` (CoSo / Studio). */
  quanLyHref?: string | null;
  quanLyLabel?: string;
};

export function TruongAdminToolbar({
  onOpenSettings,
  quanLyHref,
  quanLyLabel = "Quản trị",
}: Props) {
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
    <div className="tb-truong-admin" role="group" aria-label="Quản trị trang">
      {isEditing && saving ? (
        <span className="tb-truong-admin-saving" aria-live="polite">
          Đang lưu…
        </span>
      ) : null}
      {quanLyHref ? (
        <a
          href={quanLyHref}
          className="tb-truong-admin-btn tb-truong-admin-btn--icon"
          aria-label={quanLyLabel}
          title={quanLyLabel}
        >
          <ClipboardList size={16} strokeWidth={2} aria-hidden />
        </a>
      ) : null}
      {isEditing && onOpenSettings ? (
        <button
          type="button"
          className="tb-truong-admin-btn tb-truong-admin-btn--icon"
          aria-label="Sửa thông tin"
          title="Sửa thông tin"
          onClick={() => onOpenSettings("identity")}
        >
          <Settings size={16} strokeWidth={2} aria-hidden />
        </button>
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

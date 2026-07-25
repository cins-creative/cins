"use client";

import { ClipboardList, Eye, Pencil, Settings2, Shield, ShieldCheck } from "lucide-react";
import { createPortal } from "react-dom";

import { useTopbarPageSlot } from "@/components/cins/useTopbarPageSlot";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  isElevatedRole,
  SYSTEM_ROLE_LABELS,
} from "@/lib/auth/system-role-labels";

type Props = {
  onOpenSettings?: () => void;
  quanLyHref?: string | null;
  /** Link thẳng tới tab Cơ sở trong Quản trị (ưu tiên hơn modal). */
  coSoSettingsHref?: string | null;
};

export function CoSoAdminToolbar({
  onOpenSettings,
  quanLyHref,
  coSoSettingsHref,
}: Props) {
  const ctx = useTruongInlineEdit();
  const slot = useTopbarPageSlot();

  if (!slot) return null;

  const isEditing = ctx?.isEditing ?? false;
  const saving = ctx?.saving ?? false;
  const systemRole = ctx?.systemRole ?? null;
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
    <div className="tb-truong-admin" role="group" aria-label="Quản trị cơ sở đào tạo">
      {isEditing && saving ? (
        <span className="tb-truong-admin-saving" aria-live="polite">
          Đang lưu…
        </span>
      ) : null}
      {quanLyHref ? (
        <a
          href={quanLyHref}
          className="tb-truong-admin-btn tb-truong-admin-btn--icon"
          aria-label="Quản trị cơ sở"
          title="Quản trị cơ sở"
        >
          <ClipboardList size={16} strokeWidth={2} aria-hidden />
        </a>
      ) : null}
      {coSoSettingsHref ? (
        <a
          href={coSoSettingsHref}
          className="tb-truong-admin-btn tb-truong-admin-btn--icon"
          aria-label="Thông tin cơ sở"
          title="Thông tin cơ sở"
        >
          <Settings2 size={16} strokeWidth={2} aria-hidden />
        </a>
      ) : onOpenSettings ? (
        <button
          type="button"
          className="tb-truong-admin-btn tb-truong-admin-btn--icon"
          aria-label="Quản lý cơ sở"
          title="Quản lý cơ sở"
          onClick={onOpenSettings}
        >
          <Settings2 size={16} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      {ctx?.canEdit ? (
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
          onClick={() => ctx.setEditMode(!isEditing)}
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
      ) : null}
    </div>,
    slot,
  );
}

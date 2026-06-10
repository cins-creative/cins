"use client";

import { Pencil, Settings2 } from "lucide-react";
import { createPortal } from "react-dom";

import { useTopbarPageSlot } from "@/components/cins/useTopbarPageSlot";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

type Props = {
  onOpenSettings: () => void;
};

export function CoSoAdminToolbar({ onOpenSettings }: Props) {
  const ctx = useTruongInlineEdit();
  const slot = useTopbarPageSlot();

  if (!slot) return null;

  const isEditing = ctx?.isEditing ?? false;
  const saving = ctx?.saving ?? false;
  const avatarDraft = ctx?.avatarDraft ?? null;
  const coverDraft = ctx?.coverDraft ?? null;

  return createPortal(
    <div className="tb-truong-admin" role="group" aria-label="Quản trị cơ sở đào tạo">
      {isEditing && saving ? (
        <span className="tb-truong-admin-saving" aria-live="polite">
          Đang lưu…
        </span>
      ) : null}
      {ctx?.canEdit && isEditing && avatarDraft ? (
        <button
          type="button"
          className="tb-truong-admin-save"
          disabled={saving}
          onClick={() => void ctx.commitAvatarDraft()}
        >
          Lưu logo
        </button>
      ) : null}
      {ctx?.canEdit && isEditing && coverDraft ? (
        <button
          type="button"
          className="tb-truong-admin-save"
          disabled={saving}
          onClick={() => void ctx.commitCoverDraft()}
        >
          Lưu bìa
        </button>
      ) : null}
      <button
        type="button"
        className="tb-truong-admin-btn tb-truong-admin-btn--icon"
        aria-label="Quản lý cơ sở"
        title="Quản lý cơ sở"
        onClick={onOpenSettings}
      >
        <Settings2 size={16} strokeWidth={2} aria-hidden />
      </button>
      {ctx?.canEdit ? (
        <button
          type="button"
          className={`tb-truong-admin-btn${isEditing ? " is-active" : ""}`}
          aria-pressed={isEditing}
          title={
            isEditing
              ? "Xem như người dùng"
              : "Bật chế độ quản trị cơ sở"
          }
          onClick={() => ctx.setEditMode(!isEditing)}
        >
          <Pencil size={14} strokeWidth={2} aria-hidden />
          <span>{isEditing ? "Đang sửa" : "Quản trị"}</span>
        </button>
      ) : null}
    </div>,
    slot,
  );
}

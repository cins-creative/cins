"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

const TOPBAR_SLOT_ID = "app-topbar-page-slot";

export function CoSoAdminToolbar() {
  const ctx = useTruongInlineEdit();
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(TOPBAR_SLOT_ID));
  }, []);

  if (!ctx?.canEdit || !slot) return null;

  const {
    isEditing,
    saving,
    avatarDraft,
    coverDraft,
    setEditMode,
    commitAvatarDraft,
    commitCoverDraft,
  } = ctx;

  return createPortal(
    <div className="tb-truong-admin" role="group" aria-label="Quản trị cơ sở đào tạo">
      {isEditing && saving ? (
        <span className="tb-truong-admin-saving" aria-live="polite">
          Đang lưu…
        </span>
      ) : null}
      {isEditing && avatarDraft ? (
        <button
          type="button"
          className="tb-truong-admin-save"
          disabled={saving}
          onClick={() => void commitAvatarDraft()}
        >
          Lưu logo
        </button>
      ) : null}
      {isEditing && coverDraft ? (
        <button
          type="button"
          className="tb-truong-admin-save"
          disabled={saving}
          onClick={() => void commitCoverDraft()}
        >
          Lưu bìa
        </button>
      ) : null}
      <button
        type="button"
        className={`tb-truong-admin-btn${isEditing ? " is-active" : ""}`}
        aria-pressed={isEditing}
        title={
          isEditing
            ? "Xem như người dùng"
            : "Bật chế độ quản trị cơ sở"
        }
        onClick={() => setEditMode(!isEditing)}
      >
        <Pencil size={14} strokeWidth={2} aria-hidden />
        <span>{isEditing ? "Đang sửa" : "Quản trị"}</span>
      </button>
    </div>,
    slot,
  );
}

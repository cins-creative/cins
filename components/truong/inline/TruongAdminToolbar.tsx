"use client";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

export function TruongAdminToolbar() {
  const ctx = useTruongInlineEdit();
  if (!ctx?.canEdit) return null;

  return (
    <div className="tdh-admin-toolbar fade f1" role="banner">
      {ctx.isEditing ? (
        <>
          <span className="tdh-admin-toolbar-badge">Chế độ quản trị</span>
          {ctx.saving ? (
            <span className="tdh-admin-toolbar-saving">Đang lưu…</span>
          ) : null}
          {ctx.avatarDraft ? (
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-save-logo"
              disabled={ctx.saving}
              onClick={() => void ctx.commitAvatarDraft()}
            >
              Lưu logo
            </button>
          ) : null}
          {ctx.coverDraft ? (
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-save-logo"
              disabled={ctx.saving}
              onClick={() => void ctx.commitCoverDraft()}
            >
              Lưu ảnh bìa
            </button>
          ) : null}
          <div className="tdh-admin-toolbar-actions">
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-viewer"
              onClick={() => ctx.setEditMode(false)}
            >
              Xem như người dùng
            </button>
            </div>
        </>
      ) : (
        <>
          <span className="tdh-admin-toolbar-hint">
            Bạn có quyền quản trị trang trường này
          </span>
          <div className="tdh-admin-toolbar-actions">
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-admin"
              onClick={() => ctx.setEditMode(true)}
            >
              Chế độ quản trị
            </button>
          </div>
        </>
      )}
    </div>
  );
}

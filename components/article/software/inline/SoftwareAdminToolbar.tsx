"use client";

import { useSoftwareInlineEdit } from "@/components/article/software/inline/SoftwareInlineEditContext";

export function SoftwareAdminToolbar() {
  const ctx = useSoftwareInlineEdit();
  if (!ctx?.canEdit) return null;

  return (
    <div className="tdh-admin-toolbar fade f1" role="banner">
      {ctx.isEditing ? (
        <>
          <span className="tdh-admin-toolbar-badge">Chế độ quản trị</span>
          <span className="tdh-admin-toolbar-hint">
            Sửa trực tiếp trên trang — nhấn Lưu để ghi vào cơ sở dữ liệu
          </span>
          {ctx.saving ? (
            <span className="tdh-admin-toolbar-saving">Đang lưu…</span>
          ) : null}
          <div className="tdh-admin-toolbar-actions">
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-admin"
              disabled={ctx.saving}
              onClick={() => void ctx.saveAll()}
            >
              Lưu thay đổi
            </button>
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
            Bạn có quyền quản trị trang phần mềm này
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

"use client";

import { useNganhHubEdit } from "@/components/nganh/hub/NganhHubEditContext";

export function NganhHubAdminToolbar() {
  const ctx = useNganhHubEdit();
  if (!ctx?.canEdit) return null;

  return (
    <div className="nct-admin-toolbar-host hn-hub-admin-toolbar-host">
      <div className="tdh-admin-toolbar fade f1" role="banner">
        {ctx.isEditing ? (
          <>
            <span className="tdh-admin-toolbar-badge">Quản trị danh sách ngành</span>
            <span className="tdh-admin-toolbar-hint">
              Bấm ảnh thẻ để đổi thumbnail · dùng «Thêm ngành» trong từng nhóm
            </span>
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
              Bạn có quyền quản trị ngành học trên CINs
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
    </div>
  );
}
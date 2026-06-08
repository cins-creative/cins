"use client";

import { useNgheArticleDraftOptional } from "@/components/article/nghe/NgheArticleDraftContext";

function IconEdit() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/** Nút biểu tượng sửa trong hero nghề — bật/tắt sửa tại chỗ (cần `NgheArticleDraftProvider`). */
export function NgheHeroDraftEditButton() {
  const ctx = useNgheArticleDraftOptional();
  if (!ctx?.canEdit) return null;
  const open = ctx.open;
  return (
    <button
      type="button"
      className="nghe-hero-draft-edit"
      onClick={() => (open ? ctx.closePanel() : ctx.openPanel())}
      aria-label={
        open
          ? "Thu gọn (giữ bản nháp trên trang, có thể mở lại)"
          : "Sửa toàn bộ nội dung bài (chế độ thử)"
      }
      title={open ? "Thu gọn — giữ bản nháp" : "Sửa bài (thử)"}
      data-nghe-draft-active={open ? "true" : "false"}
    >
      <IconEdit />
    </button>
  );
}

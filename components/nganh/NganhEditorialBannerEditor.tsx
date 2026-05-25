"use client";

import { useState } from "react";

import { EditorialImages } from "@/components/nganh/EditorialImages";
import { NganhMediaEmpty } from "@/components/nganh/NganhMediaEmpty";
import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import { InlineMultiImageGallery } from "@/components/shared/InlineMultiImageGallery";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";

function normalizeList(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

export function NganhEditorialBannerEditor({
  editorialImages,
}: {
  editorialImages: string[];
}) {
  const ctx = useNganhInlineEdit();
  const [modalOpen, setModalOpen] = useState(false);

  if (!ctx?.isEditing) {
    if (editorialImages.length === 0) return null;
    return <EditorialImages images={editorialImages} />;
  }

  const list = ctx.editorial_images;
  const previewKey = list.join("\n");

  return (
    <>
      <div className="nct-editorial-edit">
        <div className="nct-editorial-edit-preview">
          <p className="nct-editorial-edit-preview-label">Xem trước banner</p>
          {list.length > 0 ? (
            <EditorialImages key={previewKey} images={list} />
          ) : (
            <NganhMediaEmpty
              title="Chưa có ảnh trong danh sách"
              hint="Bấm biểu tượng chỉnh sửa để thêm ảnh"
            />
          )}
          <button
            type="button"
            className="nct-editorial-edit-trigger"
            onClick={() => setModalOpen(true)}
            aria-label="Chỉnh sửa ảnh banner"
          >
            <NctEditIcon />
            <span className="nct-editorial-edit-trigger-text">Sửa</span>
          </button>
        </div>
      </div>

      <TruongInlineModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        className="tdh-inline-modal--wide nct-editorial-modal"
        labelledBy="nct-editorial-modal-title"
      >
        <h3 id="nct-editorial-modal-title" className="tdh-inline-modal-title">
          Ảnh minh họa (banner)
        </h3>
        <NganhEditorialBannerPanel onDone={() => setModalOpen(false)} />
      </TruongInlineModal>
    </>
  );
}

function NctEditIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
    </svg>
  );
}

function NganhEditorialBannerPanel({ onDone }: { onDone?: () => void }) {
  const ctx = useNganhInlineEdit();

  if (!ctx?.isEditing) return null;

  return (
    <div className="nct-editorial-edit-panel">
      <InlineMultiImageGallery
        images={ctx.editorial_images}
        onChange={(next) => ctx.setEditorialImages(normalizeList(next))}
        onNotify={(msg) => ctx.showToast(msg)}
        globalPaste
        dropzoneHint="Kéo thả hoặc chọn file — dán ảnh (Ctrl+V) bất kỳ đâu trong hộp thoại"
      />
      {onDone ? (
        <div className="tdh-inline-modal-actions">
          <button
            type="button"
            className="tdh-mode-btn tdh-mode-btn-viewer"
            onClick={onDone}
          >
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  );
}
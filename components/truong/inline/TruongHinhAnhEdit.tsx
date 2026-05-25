"use client";

import { useState } from "react";

import { TruongHinhAnhUploadPanel } from "@/components/truong/inline/TruongHinhAnhUploadPanel";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";

export function TruongHinhAnhUploadZone() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);

  function closeModal() {
    setOpen(false);
  }

  if (!ctx?.isEditing) return null;

  return (
    <>
      <div className="tdh-inline-upload-zone">
        <button
          type="button"
          className="tdh-inline-btn primary"
          onClick={() => setOpen(true)}
        >
          + Thêm ảnh
        </button>
      </div>

      <TruongInlineModal
        open={open}
        onClose={closeModal}
        className="tdh-inline-modal--wide tdh-hinhanh-upload-modal"
        labelledBy="tdh-hinhanh-upload-title"
      >
        <h3 id="tdh-hinhanh-upload-title" className="tdh-inline-modal-title">
          Thêm ảnh gallery
        </h3>
        <p className="tdh-hinhanh-upload-lead">
          Có thể chọn nhiều ảnh cùng lúc. Ảnh được lưu ngay sau khi tải lên.
        </p>
        <TruongHinhAnhUploadPanel onNotify={(msg) => ctx.showToast(msg)} />
        <div className="tdh-inline-modal-actions">
          <button
            type="button"
            className="tdh-inline-btn primary"
            onClick={closeModal}
          >
            Đóng
          </button>
        </div>
      </TruongInlineModal>
    </>
  );
}

export function TruongHinhAnhDeleteBtn({ photoId }: { photoId: string }) {
  const ctx = useTruongInlineEdit();
  if (!ctx?.isEditing) return null;

  async function remove() {
    if (!ctx || !confirm("Xóa ảnh này?")) return;
    const prev = ctx.hinhanh;
    ctx.setHinhanh((list) => list.filter((p) => p.id !== photoId));
    const res = await truongInlineFetch(
      ctx.orgId,
      `/hinh-anh?photoId=${encodeURIComponent(photoId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      ctx.setHinhanh(prev);
      ctx.showToast("Xóa thất bại");
    }
  }

  return (
    <button
      type="button"
      className="tdh-inline-gallery-del"
      aria-label="Xóa ảnh"
      onClick={() => void remove()}
    >
      ×
    </button>
  );
}

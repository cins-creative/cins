"use client";

import { useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";

type Props = {
  programId: string;
  nganhTitle: string;
  onRemoved: () => void;
};

export function TruongNganhRemoveButton({
  programId,
  nganhTitle,
  onRemoved,
}: Props) {
  const ctx = useTruongInlineEdit();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ctx?.isEditing) return null;

  async function confirmHide() {
    if (!ctx || busy) return;
    setBusy(true);
    try {
      const res = await truongInlineFetch(
        ctx.orgId,
        `/nganh/${encodeURIComponent(programId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        ctx.showToast(await readTruongInlineError(res));
        return;
      }
      setConfirmOpen(false);
      onRemoved();
      ctx.showToast(`Đã ẩn ngành «${nganhTitle}» khỏi trang trường`);
    } catch {
      ctx.showToast("Lỗi kết nối khi ẩn ngành.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="tdh-nganh-remove-btn"
        disabled={busy}
        aria-label={`Gỡ ngành ${nganhTitle}`}
        title="Gỡ ngành khỏi trang trường"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        {busy ? "…" : "Gỡ"}
      </button>

      <TruongInlineModal
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        className="tdh-inline-modal-sm tdh-nganh-remove-modal"
        labelledBy="tdh-nganh-remove-title"
      >
        <h3 id="tdh-nganh-remove-title" className="tdh-inline-modal-title">
          Gỡ ngành khỏi trường?
        </h3>
        <div className="tdh-inline-modal-warning" role="alert">
          <p>
            Bạn sắp gỡ <strong>«{nganhTitle}»</strong> khỏi danh sách hiển thị
            của trường.
          </p>
          <p>
            Toàn bộ dữ liệu liên quan sẽ <strong>không còn hiển thị</strong>{" "}
            trên trang này, gồm điểm chuẩn theo năm, chỉ tiêu tuyển sinh, cấu
            hình môn thi và các mục gắn với ngành đó.
          </p>
          <p>
            Ngành chuyển sang <strong>chế độ ẩn</strong> (dữ liệu vẫn lưu trong
            hệ thống). Bạn có thể thêm lại ngành sau từ danh sách «Thêm ngành».
          </p>
        </div>
        <div className="tdh-inline-modal-actions">
          <button
            type="button"
            className="tdh-inline-btn ghost"
            disabled={busy}
            onClick={() => setConfirmOpen(false)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="tdh-inline-btn danger"
            disabled={busy}
            onClick={() => void confirmHide()}
          >
            {busy ? "Đang xử lý…" : "Gỡ và ẩn"}
          </button>
        </div>
      </TruongInlineModal>
    </>
  );
}

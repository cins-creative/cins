"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  open: boolean;
  orgId: string;
  khoa: KhoaHocCardData | null;
  onClose: () => void;
  onDuplicated: (khoa: KhoaHocCardData) => void;
};

export function KhoaHocDuplicateConfirm({
  open,
  orgId,
  khoa,
  onClose,
  onDuplicated,
}: Props) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDuplicate() {
    if (!khoa) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoa.id)}/nhan-ban`,
        { method: "POST", credentials: "include" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        khoaHoc?: KhoaHocCardData;
        error?: string;
      };
      if (!res.ok || !json.khoaHoc) {
        setError(json.error ?? "Không nhân bản được khóa học.");
        return;
      }
      onDuplicated(json.khoaHoc);
      onClose();
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={() => {
        if (submitting) return;
        setError(null);
        onClose();
      }}
      className="cso-kh-delete-modal"
      labelledBy={titleId}
    >
      <h2 id={titleId} className="tdh-inline-modal-title">
        Nhân bản khóa học?
      </h2>
      <p className="cso-kh-delete-text">
        Tạo bản sao của «{khoa?.tenKhoaHoc}» kèm{" "}
        <strong>tất cả lớp học</strong> (không copy học viên). Bản mới sẽ ở
        chế độ ẩn — bạn sửa thông tin rồi mở công khai khi sẵn sàng.
      </p>
      {error ? <p className="cso-kh-form-err">{error}</p> : null}
      <div className="tdh-inline-modal-actions">
        <button
          type="button"
          className="tdh-inline-btn tdh-inline-btn--ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Huỷ
        </button>
        <button
          type="button"
          className="tdh-inline-btn"
          disabled={submitting || !khoa}
          onClick={() => void handleDuplicate()}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="tdh-spin" aria-hidden />
              Đang nhân bản…
            </>
          ) : (
            "Nhân bản"
          )}
        </button>
      </div>
    </TruongInlineModal>
  );
}

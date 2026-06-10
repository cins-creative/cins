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
  onDeleted: (khoaId: string) => void;
};

export function KhoaHocDeleteConfirm({
  open,
  orgId,
  khoa,
  onClose,
  onDeleted,
}: Props) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!khoa) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoa.id)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Không xóa được khóa học.");
        return;
      }
      onDeleted(khoa.id);
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
        Xóa khóa học?
      </h2>
      <p className="cso-kh-delete-text">
        «{khoa?.tenKhoaHoc}» sẽ bị xóa vĩnh viễn. Không xóa được nếu khóa đã có
        lớp hoặc học viên.
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
          className="tdh-inline-btn tdh-inline-btn--danger"
          disabled={submitting || !khoa}
          onClick={() => void handleDelete()}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="tdh-spin" aria-hidden />
              Đang xóa…
            </>
          ) : (
            "Xóa khóa học"
          )}
        </button>
      </div>
    </TruongInlineModal>
  );
}

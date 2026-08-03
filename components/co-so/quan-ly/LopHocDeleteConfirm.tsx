"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { XoaBlockerList } from "@/components/co-so/quan-ly/XoaBlockerList";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { LopHocQuanLyRow } from "@/lib/to-chuc/lop-hoc-quan-ly-types";
import type {
  XoaBlocker,
  XoaCanhBao,
  XoaPreflight,
} from "@/lib/to-chuc/khoa-lop-xoa-types";

type Props = {
  open: boolean;
  orgId: string;
  lop: LopHocQuanLyRow | null;
  onClose: () => void;
  onDeleted: (lopId: string) => void;
};

function lopLabel(row: LopHocQuanLyRow): string {
  return row.maLop?.trim() || row.lichHoc?.trim() || "lớp này";
}

export function LopHocDeleteConfirm({
  open,
  orgId,
  lop,
  onClose,
  onDeleted,
}: Props) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPre, setLoadingPre] = useState(false);
  const [preflight, setPreflight] = useState<XoaPreflight | null>(null);

  useEffect(() => {
    if (!open || !lop) {
      setPreflight(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingPre(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(lop.khoaId)}/lop/${encodeURIComponent(lop.id)}/xoa-preflight`,
          { credentials: "include" },
        );
        const json = (await res.json()) as XoaPreflight & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Không kiểm tra được điều kiện xóa.");
          setPreflight(null);
          return;
        }
        setPreflight({
          coTheXoa: Boolean(json.coTheXoa),
          blockers: json.blockers ?? [],
          canhBao: json.canhBao ?? [],
        });
      } catch {
        if (!cancelled) {
          setError("Lỗi mạng — thử lại sau.");
          setPreflight(null);
        }
      } finally {
        if (!cancelled) setLoadingPre(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orgId, lop]);

  async function handleDelete() {
    if (!lop || !preflight?.coTheXoa) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(lop.khoaId)}/lop/${encodeURIComponent(lop.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        blockers?: XoaBlocker[];
        canhBao?: XoaCanhBao[];
      };
      if (res.status === 409) {
        setPreflight({
          coTheXoa: false,
          blockers: json.blockers ?? [],
          canhBao: json.canhBao ?? [],
        });
        setError(json.error ?? "Không thể xóa vì còn ràng buộc.");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Không xóa được lớp.");
        return;
      }
      onDeleted(lop.id);
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
        Xóa lớp?
      </h2>
      <p className="cso-kh-delete-text">
        «{lop ? lopLabel(lop) : "lớp này"}» sẽ bị xóa vĩnh viễn. Không hoàn tác được.
      </p>
      {loadingPre ? (
        <p className="cso-kh-delete-text cso-xoa-loading">
          <Loader2 size={16} className="tdh-spin" aria-hidden />
          Đang kiểm tra ràng buộc…
        </p>
      ) : (
        <XoaBlockerList
          blockers={preflight?.blockers}
          canhBao={preflight?.canhBao}
          onBeforeXuLy={onClose}
        />
      )}
      {preflight && !preflight.coTheXoa ? (
        <p className="cso-xoa-blocked-hint">
          Nút xóa bị khóa cho đến khi xử lý hết ràng buộc ở trên.
        </p>
      ) : null}
      {error ? <p className="cso-kh-form-err">{error}</p> : null}
      <div className="tdh-inline-modal-actions">
        <button
          type="button"
          className="tdh-inline-btn tdh-inline-btn--ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Đóng
        </button>
        <button
          type="button"
          className="tdh-inline-btn tdh-inline-btn--danger"
          disabled={submitting || loadingPre || !lop || !preflight?.coTheXoa}
          title={
            preflight && !preflight.coTheXoa
              ? "Còn ràng buộc — bấm Xử lý ở trên trước"
              : undefined
          }
          onClick={() => void handleDelete()}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="tdh-spin" aria-hidden />
              Đang xóa…
            </>
          ) : (
            "Xóa vĩnh viễn"
          )}
        </button>
      </div>
    </TruongInlineModal>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { XoaBlockerList } from "@/components/co-so/quan-ly/XoaBlockerList";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import type {
  XoaBlocker,
  XoaCanhBao,
  XoaPreflight,
} from "@/lib/to-chuc/khoa-lop-xoa-types";

type Props = {
  open: boolean;
  orgId: string;
  khoa: KhoaHocCardData | null;
  onClose: () => void;
  onDeleted: (khoaId: string) => void;
  /**
   * Xử lý blocker ngay trên trang QL khóa/lớp (vd. chuyển tab Lớp).
   * Trả `true` = không điều hướng sang URL khác.
   */
  onXuLyCungTrang?: (blocker: XoaBlocker, khoaId: string) => boolean;
};

export function KhoaHocDeleteConfirm({
  open,
  orgId,
  khoa,
  onClose,
  onDeleted,
  onXuLyCungTrang,
}: Props) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPre, setLoadingPre] = useState(false);
  const [preflight, setPreflight] = useState<XoaPreflight | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (!open || !khoa) {
      setPreflight(null);
      setError(null);
      setNameDraft("");
      return;
    }
    let cancelled = false;
    setLoadingPre(true);
    setError(null);
    setNameDraft("");
    void (async () => {
      try {
        const res = await fetch(
          `/api/academy/${encodeURIComponent(orgId)}/courses/${encodeURIComponent(khoa.id)}/delete-preflight`,
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
  }, [open, orgId, khoa]);

  const nameMatches =
    Boolean(khoa?.tenKhoaHoc) &&
    nameDraft.trim() === (khoa?.tenKhoaHoc ?? "");

  async function handleDelete() {
    if (!khoa || !preflight?.coTheXoa || !nameMatches) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/academy/${encodeURIComponent(orgId)}/courses/${encodeURIComponent(khoa.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        blockers?: XoaBlocker[];
        canhBao?: XoaCanhBao[];
        coTheXoa?: boolean;
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
        «{khoa?.tenKhoaHoc}» sẽ bị xóa vĩnh viễn khỏi cơ sở. Không hoàn tác được.
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
          onXuLyCungTrang={
            khoa && onXuLyCungTrang
              ? (b) => onXuLyCungTrang(b, khoa.id)
              : undefined
          }
        />
      )}
      {preflight && !preflight.coTheXoa ? (
        <p className="cso-xoa-blocked-hint">
          Nút xóa bị khóa cho đến khi xử lý hết ràng buộc ở trên.
        </p>
      ) : null}
      {preflight?.coTheXoa ? (
        <label className="cso-xoa-confirm-label">
          <span>
            Gõ đúng tên khóa <strong>{khoa?.tenKhoaHoc}</strong> để xác nhận
          </span>
          <input
            className="cso-ql-input cso-xoa-confirm-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            disabled={submitting}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
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
          disabled={
            submitting ||
            loadingPre ||
            !khoa ||
            !preflight?.coTheXoa ||
            !nameMatches
          }
          title={
            preflight && !preflight.coTheXoa
              ? "Còn ràng buộc — bấm Xử lý ở trên trước"
              : !nameMatches
                ? "Gõ đúng tên khóa để mở khóa nút"
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

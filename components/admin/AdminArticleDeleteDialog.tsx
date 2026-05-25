"use client";

import { useEffect } from "react";

import {
  buildArticleDeleteWarningRows,
  isArticleDeleteBlocked,
  type ArticleDeleteUsage,
} from "@/lib/admin/article-delete";

type Props = {
  open: boolean;
  articleTitle: string;
  usage: ArticleDeleteUsage | null;
  loading?: boolean;
  loadError?: string | null;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function effectLabel(effect: "unlink" | "block" | "none"): string {
  switch (effect) {
    case "block":
      return "Chặn xóa";
    case "unlink":
      return "Tự gỡ";
    default:
      return "Xóa";
  }
}

export function AdminArticleDeleteDialog({
  open,
  articleTitle,
  usage,
  loading = false,
  loadError = null,
  confirming = false,
  onClose,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onClose]);

  if (!open) return null;

  const blocked = usage ? isArticleDeleteBlocked(usage) : false;
  const rows = usage ? buildArticleDeleteWarningRows(usage) : [];

  return (
    <div
      className="admin-confirm-backdrop open"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirming) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-confirm-dialog--danger"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-delete-article-title"
        aria-describedby="admin-delete-article-desc"
      >
        <div className="admin-confirm-dialog__header">
          <h2 id="admin-delete-article-title" className="admin-confirm-dialog__title">
            Xóa bài viết?
          </h2>
          <button
            type="button"
            className="so-close"
            onClick={onClose}
            disabled={confirming}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="admin-confirm-dialog__body">
          <p id="admin-delete-article-desc" className="admin-confirm-dialog__lead">
            Bạn sắp xóa vĩnh viễn bài{" "}
            <strong>{articleTitle}</strong>. Hành động không hoàn tác.
          </p>

          {loading ? (
            <p className="form-hint">Đang kiểm tra liên kết…</p>
          ) : loadError ? (
            <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
              {loadError}
            </p>
          ) : usage ? (
            <>
              {blocked ? (
                <p className="admin-delete-warn admin-delete-warn--block" role="alert">
                  Không thể xóa: còn liên kết bắt buộc (chương trình trường hoặc thành viên tổ
                  chức). Gỡ các dòng <strong>Chặn xóa</strong> trong bảng trước.
                </p>
              ) : (
                <p className="admin-delete-warn">
                  Các dòng <strong>Tự gỡ</strong> sẽ được gỡ tự động trước khi xóa bài.
                </p>
              )}

              <div className="table-wrap admin-delete-warn-table-wrap">
                <table className="admin-delete-warn-table">
                  <thead>
                    <tr>
                      <th scope="col">Liên kết</th>
                      <th scope="col">Bảng</th>
                      <th scope="col" className="cell-num">
                        Số lượng
                      </th>
                      <th scope="col">Khi xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.effect === "block" && row.count > 0
                            ? "admin-delete-warn-table__row--block"
                            : row.count > 0 && row.effect === "unlink"
                              ? "admin-delete-warn-table__row--unlink"
                              : undefined
                        }
                      >
                        <td>{row.label}</td>
                        <td className="cell-mono">{row.table}</td>
                        <td className="cell-num">{row.count > 0 ? row.count : "—"}</td>
                        <td>
                          <span
                            className={`admin-delete-effect admin-delete-effect--${row.effect}`}
                          >
                            {effectLabel(row.effect)}
                          </span>
                          <span className="admin-delete-effect-note">{row.note}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <div className="admin-confirm-dialog__footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={confirming}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={loading || !!loadError || !usage || blocked || confirming}
            onClick={onConfirm}
          >
            {confirming ? "Đang xóa…" : "Xóa vĩnh viễn"}
          </button>
        </div>
      </div>
    </div>
  );
}

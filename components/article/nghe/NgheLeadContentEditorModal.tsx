"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";

type Props = {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (html: string) => void;
  articleTitle?: string;
};

/** Popup soạn `noi_dung` đầy đủ — portal `body`, giống admin slideover. */
export function NgheLeadContentEditorModal({
  open,
  onClose,
  value,
  onChange,
  articleTitle,
}: Props) {
  const [portalMounted, setPortalMounted] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setEditorReady(false);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        if (!cancelled) setEditorReady(true);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame1);
      if (frame2) window.cancelAnimationFrame(frame2);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!portalMounted || !open) return null;

  const title = articleTitle?.trim() || "Nội dung bài viết";

  return createPortal(
    <div
      className="nghe-content-editor-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nghe-content-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nghe-content-editor-modal__dialog">
        <header className="nghe-content-editor-modal__head">
          <div className="nghe-content-editor-modal__head-copy">
            <h2 id="nghe-content-editor-title" className="nghe-content-editor-modal__title">
              Soạn thảo nội dung
            </h2>
            <p className="nghe-content-editor-modal__subtitle">{title}</p>
          </div>
          <button
            type="button"
            className="nghe-content-editor-modal__close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        <div className="nghe-content-editor-modal__body">
          <div className="admin-edit-form__field">
            {editorReady ? (
              <ArticleDraftContentEditor
                value={value}
                onChange={onChange}
                hideHint
              />
            ) : (
              <p className="nghe-content-editor-modal__loading" role="status">
                Đang mở editor soạn thảo…
              </p>
            )}
          </div>
        </div>

        <footer className="nghe-content-editor-modal__foot">
          <p className="nghe-content-editor-modal__foot-hint">
            Thay đổi được giữ trong bản nháp — bấm <strong>Lưu</strong> trên thanh hero để
            ghi DB.
          </p>
          <button
            type="button"
            className="nghe-hero-draft-btn nghe-hero-draft-btn--primary"
            onClick={onClose}
          >
            Xong
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

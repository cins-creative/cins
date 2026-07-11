"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  saveContributionDraftAction,
  submitContributionDraftAction,
} from "@/components/article/contribution/actions";
import { ContributionEditorMeta } from "@/components/article/contribution/ContributionEditorMeta";
import { ArticleComposeEditor } from "@/components/article/compose/ArticleComposeEditor";
import { ArticleDongGopLeadMirror } from "@/components/article/draft/ArticleDongGopLeadMirror";
import { validateArticleHtml } from "@/lib/article/blocks/validate";
import { stripArticleWrapper } from "@/lib/article/blocks/compile-html";
import {
  packContribNoiDung,
  unpackContribNoiDung,
  type ContribHeroMeta,
} from "@/lib/article/dong-gop/contrib-document";
import {
  TRANG_THAI_DONG_GOP_LABEL,
  type TrangThaiDongGop,
} from "@/lib/article/dong-gop/types";

import "@/styles/nghe-inline-draft.css";

type Props = {
  open: boolean;
  onClose: () => void;
  idBaiViet: string;
  idDongGop: string | null;
  initialNoiDung: string;
  initialHero: ContribHeroMeta;
  articleTitle: string;
  loaiBaiViet: string;
  contributionCount: number;
  trangThai: TrangThaiDongGop | null;
  ghiChuDuyet: string | null;
  canEdit: boolean;
  canSubmit: boolean;
};

export function ContributionEditor({
  open,
  onClose,
  idBaiViet,
  idDongGop,
  initialNoiDung,
  initialHero,
  articleTitle,
  loaiBaiViet,
  contributionCount,
  trangThai,
  ghiChuDuyet,
  canEdit,
  canSubmit,
}: Props) {
  const router = useRouter();
  const [portalMounted, setPortalMounted] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [hero, setHero] = useState<ContribHeroMeta>(initialHero);
  const [bodyHtml, setBodyHtml] = useState(() =>
    unpackContribNoiDung(initialNoiDung, initialHero).bodyHtml,
  );
  const [draftId, setDraftId] = useState<string | null>(idDongGop);
  const [status, setStatus] = useState<TrangThaiDongGop | null>(trangThai);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const packedNoiDung = useMemo(
    () => packContribNoiDung({ hero, bodyHtml }),
    [hero, bodyHtml],
  );

  const patchHero = useCallback((patch: Partial<ContribHeroMeta>) => {
    setHero((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setEditorReady(false);
      return;
    }
    const doc = unpackContribNoiDung(initialNoiDung, initialHero);
    setHero(doc.hero);
    setBodyHtml(doc.bodyHtml);
    setDraftId(idDongGop);
    setStatus(trangThai);
    setMsg(null);

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
  }, [open, initialNoiDung, initialHero, idDongGop, trangThai]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!portalMounted || !open) return null;

  const statusLabel = status ? TRANG_THAI_DONG_GOP_LABEL[status] : null;

  function afterSuccess(nextStatus: TrangThaiDongGop, nextId: string) {
    setDraftId(nextId);
    setStatus(nextStatus);
    router.refresh();
  }

  function handleSaveDraft() {
    if (!canEdit) return;
    setMsg(null);
    startTransition(async () => {
      const result = await saveContributionDraftAction({
        idBaiViet,
        noiDung: packedNoiDung,
      });
      if (!result.ok) {
        setMsg(result.message);
        return;
      }
      afterSuccess("nhap", result.id);
      setMsg("Đã lưu nháp.");
    });
  }

  function handleSubmit() {
    if (!canEdit || !canSubmit) return;
    const check = validateArticleHtml(bodyHtml, loaiBaiViet, { strict: true });
    if (!check.ok) {
      setMsg(
        check.issues.find((i) => i.level === "error")?.message ??
          "Nội dung chưa hợp lệ.",
      );
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const result = await submitContributionDraftAction({
        idDongGop: draftId ?? undefined,
        idBaiViet,
        noiDung: packedNoiDung,
      });
      if (!result.ok) {
        setMsg(result.message);
        return;
      }
      afterSuccess("cho_duyet", result.id);
      setMsg("Đã gửi duyệt — curator sẽ xem bản của bạn.");
    });
  }

  return createPortal(
    <div
      className="nghe-content-editor-modal contrib-editor-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrib-editor-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="nghe-content-editor-modal__dialog contrib-editor-modal__dialog">
        <header className="nghe-content-editor-modal__head contrib-editor-modal__head">
          <div className="nghe-content-editor-modal__head-copy">
            <h2
              id="contrib-editor-title"
              className="nghe-content-editor-modal__title"
            >
              Soạn bản đóng góp
            </h2>
            <p className="nghe-content-editor-modal__subtitle">{articleTitle}</p>
            <p className="contrib-editor-hint contrib-editor-hint--short">
              {contributionCount > 0
                ? `Đã có ${contributionCount} bản — viết góc nhìn của bạn.`
                : "Bạn là người đầu tiên — hãy viết bản mẫu cho cộng đồng."}
              {statusLabel ? (
                <>
                  {" "}
                  · <strong>{statusLabel}</strong>
                </>
              ) : null}
            </p>
            {ghiChuDuyet?.trim() ? (
              <p className="contrib-editor-note" role="status">
                Ghi chú quản trị viên: {ghiChuDuyet.trim()}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="nghe-content-editor-modal__close"
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng"
          >
            ✕
          </button>
        </header>

        <div className="nghe-content-editor-modal__body contrib-editor-layout">
          {editorReady ? (
            <>
              <aside className="contrib-editor-sidebar">
                <p className="contrib-editor-panel-label">Thông tin bìa</p>
                <ContributionEditorMeta
                  hero={hero}
                  canEdit={canEdit}
                  loaiBaiViet={loaiBaiViet}
                  onChange={patchHero}
                />
              </aside>

              <main className="contrib-editor-main">
                <p className="contrib-editor-panel-label">Nội dung chính</p>
                <p className="contrib-editor-main-hint">
                  Bấm <strong>+</strong> để chèn tiêu đề, danh sách, bảng,
                  ảnh… · chọn khối rồi bấm <strong>✕</strong> để xóa (có thể
                  xóa hết rồi viết lại từ đầu).
                </p>

                <div className="admin-edit-form__field contrib-editor-compose">
                  {canEdit ? (
                    <ArticleComposeEditor
                      value={bodyHtml}
                      onChange={setBodyHtml}
                    />
                  ) : (
                    <ArticleDongGopLeadMirror>
                      <div
                        className="nghe-lead-rich article-rich-content article-content-html"
                        dangerouslySetInnerHTML={{
                          __html: stripArticleWrapper(bodyHtml),
                        }}
                      />
                    </ArticleDongGopLeadMirror>
                  )}
                </div>
              </main>
            </>
          ) : (
            <p className="nghe-content-editor-modal__loading" role="status">
              Đang mở editor soạn thảo…
            </p>
          )}
        </div>

        <footer className="nghe-content-editor-modal__foot contrib-editor-foot">
          <div className="contrib-editor-foot-copy">
            {msg ? (
              <p className="contrib-editor-msg" role="status">
                {msg}
              </p>
            ) : (
              <p className="nghe-content-editor-modal__foot-hint">
                Lưu nháp giữ bản trên máy bạn; gửi duyệt khi sẵn sàng.
              </p>
            )}
          </div>
          <div className="contrib-editor-foot-actions">
            <button
              type="button"
              className="nghe-hero-draft-btn"
              onClick={onClose}
              disabled={pending}
            >
              Đóng
            </button>
            {canEdit ? (
              <>
                <button
                  type="button"
                  className="nghe-hero-draft-btn"
                  onClick={handleSaveDraft}
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="contrib-editor-spin" aria-hidden />
                      Đang lưu…
                    </>
                  ) : (
                    "Lưu nháp"
                  )}
                </button>
                {canSubmit ? (
                  <button
                    type="button"
                    className="nghe-hero-draft-btn nghe-hero-draft-btn--primary"
                    onClick={handleSubmit}
                    disabled={pending}
                  >
                    {pending ? "Đang gửi…" : "Gửi duyệt"}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

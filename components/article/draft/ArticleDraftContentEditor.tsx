"use client";

import type { Editor } from "@tiptap/react";
import { clsx } from "clsx";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { KeywordInlineLeadPreview } from "@/components/article/keyword/KeywordInlineLeadPreview";
import { remainderHtmlAfterNgheIntro } from "@/lib/articles/nghe-noi-dung-sections";

import {
  ArticleDraftToolbar,
  TruongTabTable,
  type TruongToolTab,
} from "@/components/article/draft/ArticleDraftToolbar";
import { ArticleBlockPalette } from "@/components/article/draft/ArticleBlockPalette";
import { ArticleDongGopLeadMirror } from "@/components/article/draft/ArticleDongGopLeadMirror";
import type {
  ArticleDraftEditorVariant,
  ArticleImagePasteStatus,
} from "@/components/article/draft/article-draft-editor-types";
import { ArticleDraftVisualPane } from "@/components/article/draft/ArticleDraftVisualPane";
import "@/styles/article-draft-tiptap.css";

export type { ArticleImagePasteStatus } from "@/components/article/draft/article-draft-editor-types";

type Tab = "visual" | "html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  variant?: ArticleDraftEditorVariant;
  /** Loại bài — palette block khi `variant="dong-gop"`. */
  loaiBaiViet?: string;
  hideHint?: boolean;
  htmlOnly?: boolean;
  defaultTab?: Tab;
  deferHeavyContent?: boolean;
  nganhTitleVi?: string;
};

/** Editor HTML thuần — không mount ProseMirror/Tiptap. */
function ArticleDraftHtmlOnly({
  value,
  onChange,
  variant = "default",
  hideHint = false,
}: Pick<Props, "value" | "onChange" | "variant" | "hideHint">) {
  return (
    <div
      className={clsx(
        "article-draft-tiptap",
        variant === "nghe-lead-inline" && "article-draft-tiptap--nghe-lead",
        variant === "truong-inline" && "article-draft-tiptap--truong-inline",
        variant === "nganh-admin" && "article-draft-tiptap--nganh-admin",
      )}
    >
      {!hideHint && variant !== "truong-inline" ? (
        <p className="article-draft-tiptap__hint">
          Chỉnh <code>noi_dung</code> dạng HTML — giữ nguyên class và cấu trúc site (
          <code>article-rich-content</code>, <code>arc-*</code>, …).
        </p>
      ) : null}
      <textarea
        className="article-draft-tiptap__html"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <div className="article-draft-tiptap__html-foot">
        Tab HTML đồng bộ trực tiếp với trường <code>noi_dung</code> lưu DB — giữ nguyên class và cấu trúc
        site dùng (<code>article-rich-content</code>, <code>arc-*</code>, …).
      </div>
    </div>
  );
}

export function ArticleDraftContentEditor(props: Props) {
  if (props.htmlOnly) {
    return <ArticleDraftHtmlOnly {...props} />;
  }
  return <ArticleDraftContentEditorFull {...props} />;
}

function ArticleDraftContentEditorFull({
  value,
  onChange,
  variant = "default",
  loaiBaiViet = "nghe",
  hideHint = false,
  defaultTab = "visual",
  deferHeavyContent = false,
  nganhTitleVi,
}: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [truongToolTab, setTruongToolTab] = useState<TruongToolTab>("block");
  const [, setToolbarRev] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePasteStatus, setImagePasteStatus] =
    useState<ArticleImagePasteStatus>({ phase: "idle" });
  const [editor, setEditor] = useState<Editor | null>(null);
  const [visualMountReady, setVisualMountReady] = useState(
    () => defaultTab === "visual" && !deferHeavyContent,
  );
  const htmlAreaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const showSharedToolbar = variant !== "truong-inline";

  useEffect(() => {
    if (tab !== "visual") {
      setVisualMountReady(false);
      return;
    }
    if (!deferHeavyContent) {
      setVisualMountReady(true);
      return;
    }
    let cancelled = false;
    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        if (!cancelled) setVisualMountReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame1);
      if (frame2) window.cancelAnimationFrame(frame2);
    };
  }, [tab, deferHeavyContent]);

  useEffect(() => {
    if (
      imagePasteStatus.phase === "idle" ||
      imagePasteStatus.phase === "uploading_cf"
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      setImagePasteStatus({ phase: "idle" });
    }, 8000);
    return () => window.clearTimeout(t);
  }, [imagePasteStatus]);

  const reportImagePaste = useCallback((s: ArticleImagePasteStatus) => {
    setImagePasteStatus(s);
  }, []);

  const onEditorReady = useCallback((ed: Editor | null) => {
    editorRef.current = ed;
    setEditor(ed);
  }, []);

  const run = useCallback((fn: (ed: Editor) => boolean) => {
    const ed = editorRef.current;
    if (!ed) return;
    fn(ed);
  }, []);

  useEffect(() => {
    if (!editor || variant !== "truong-inline") return;
    const bump = () => setToolbarRev((n) => n + 1);
    editor.on("selectionUpdate", bump);
    editor.on("update", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("update", bump);
    };
  }, [editor, variant]);

  const disabledVisual = tab !== "visual" || !editor;
  const openHtmlTab = () => {
    setTab("html");
    requestAnimationFrame(() => htmlAreaRef.current?.focus());
  };
  const openVisualTab = () => {
    if (deferHeavyContent) {
      startTransition(() => setTab("visual"));
    } else {
      setTab("visual");
    }
  };

  const ngheRemainderHtml = useMemo(
    () =>
      variant === "nghe-lead-inline"
        ? remainderHtmlAfterNgheIntro(value)
        : null,
    [variant, value],
  );

  const visualPane = (
    <>
      <ArticleDraftVisualPane
        value={value}
        onChange={onChange}
        variant={variant}
        nganhTitleVi={nganhTitleVi}
        deferHeavyContent={deferHeavyContent}
        reportImagePaste={reportImagePaste}
        onEditorReady={onEditorReady}
      />
      {ngheRemainderHtml ? (
        <div className="article-draft-tiptap__nghe-remainder">
          <p className="article-draft-tiptap__nghe-remainder-label">
            Phần còn lại (<code>arc-section</code> 01, 02, …) — chỉ xem tại đây;
            chỉnh sửa ở tab <button type="button" className="article-draft-tiptap__nghe-remainder-link" onClick={openHtmlTab}>HTML</button>.
          </p>
          <div className="article-draft-tiptap__nghe-remainder-body article-content-html">
            <KeywordInlineLeadPreview
              html={ngheRemainderHtml}
              className="nghe-lead-rich article-rich-content article-content-html"
            />
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className={clsx(
        "article-draft-tiptap",
        variant === "dong-gop" && "article-draft-tiptap--dong-gop",
        variant === "nghe-lead-inline" && "article-draft-tiptap--nghe-lead",
        variant === "truong-inline" && "article-draft-tiptap--truong-inline",
        variant === "nganh-admin" && "article-draft-tiptap--nganh-admin",
      )}
    >
      {!hideHint && variant !== "truong-inline" ? (
        <p className="article-draft-tiptap__hint">
          {variant === "dong-gop" ? (
            <>
              <strong>Block Studio</strong> — chèn khối layout chuyên nghiệp (kỹ năng,
              lộ trình, đầu việc…) bằng thanh công cụ phía dưới. Sửa chi tiết ở tab{" "}
              <strong>HTML</strong> khi cần.
            </>
          ) : variant === "nghe-lead-inline" ? (
            <>
              Ô soạn phía trên chỉ chứa <code>arc-intro</code> (đoạn dẫn). Phần{" "}
              <code>arc-section</code> hiển thị read-only bên dưới — sửa các mục 01,
              02, … ở tab <strong>HTML</strong> (tránh đơ trình duyệt).
            </>
          ) : (
            <>
              Tiptap có thể làm sạch / chuẩn hoá HTML soạn trực quan — dùng tab{" "}
              <strong>HTML</strong> để dán nguyên khối từ Claude hoặc CMS khi cần giữ
              class <code>arc-*</code> / layout đặc biệt (ví dụ số mục{" "}
              <code>arc-num</code> trong tiêu đề). Khối{" "}
              <code>arc-image-placeholder</code> hiển thị ở Soạn thảo.
            </>
          )}
        </p>
      ) : null}

      {imagePasteStatus.phase !== "idle" &&
      imagePasteStatus.phase !== "cf_ok" &&
      imagePasteStatus.phase !== "uploading_cf" ? (
        <p
          className={clsx(
            "article-draft-tiptap__image-status",
            imagePasteStatus.phase === "base64_ok" &&
              "article-draft-tiptap__image-status--warn",
            (imagePasteStatus.phase === "cf_fail" ||
              imagePasteStatus.phase === "base64_fail") &&
              "article-draft-tiptap__image-status--err",
          )}
          role="status"
          aria-live="polite"
        >
          {imagePasteStatus.phase === "cf_fail" ? (
            <>
              <strong>Không upload được Cloudflare.</strong> {imagePasteStatus.message}
            </>
          ) : null}
          {imagePasteStatus.phase === "base64_ok" ? (
            <>
              <strong>Ảnh đã chèn dạng base64</strong> (chưa qua Cloudflare). Rê chuột lên
              ảnh để xem gợi ý. Đặt{" "}
              <code className="article-draft-tiptap__image-status-code">
                NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN
              </code>{" "}
              + Cloudflare để upload và tránh lỗi khi Lưu.
            </>
          ) : null}
          {imagePasteStatus.phase === "base64_fail" ? (
            <>
              <strong>Không chèn được ảnh.</strong> {imagePasteStatus.message}
            </>
          ) : null}
        </p>
      ) : null}

      <div className="article-draft-tiptap__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          data-active={tab === "visual" ? "true" : "false"}
          className="article-draft-tiptap__tab"
          onClick={openVisualTab}
        >
          Soạn thảo
        </button>
        <button
          type="button"
          role="tab"
          data-active={tab === "html" ? "true" : "false"}
          className="article-draft-tiptap__tab"
          onClick={() => setTab("html")}
        >
          HTML
        </button>
      </div>

      {variant === "dong-gop" &&
      tab === "visual" &&
      (visualMountReady || !deferHeavyContent) ? (
        <ArticleBlockPalette
          editor={editor}
          loaiBaiViet={loaiBaiViet}
          disabled={disabledVisual}
        />
      ) : null}

      {showSharedToolbar &&
      (tab !== "visual" || visualMountReady || !deferHeavyContent) ? (
        <ArticleDraftToolbar
          editor={editor}
          disabledVisual={disabledVisual}
          run={run}
          layout="default"
          onOpenHtmlTab={openHtmlTab}
          onOpenPreview={() => setPreviewOpen(true)}
        />
      ) : null}

      {tab === "visual" && deferHeavyContent && !visualMountReady ? (
        <p className="article-draft-tiptap__hint" role="status" aria-live="polite">
          Đang mở editor soạn thảo…
        </p>
      ) : null}

      {tab === "visual" && visualMountReady ? (
        variant === "truong-inline" ? (
          <div className="article-draft-tiptap__truong-stack">
            <ArticleDraftToolbar
              editor={editor}
              disabledVisual={disabledVisual}
              run={run}
              layout="truong-inline"
              truongToolTab={truongToolTab}
              onTruongToolTabChange={setTruongToolTab}
              truongTableDock="bottom"
              onOpenHtmlTab={openHtmlTab}
              onOpenPreview={() => setPreviewOpen(true)}
            />
            <ArticleDraftVisualPane
              value={value}
              onChange={onChange}
              variant={variant}
              deferHeavyContent={deferHeavyContent}
              reportImagePaste={reportImagePaste}
              onEditorReady={onEditorReady}
            />
            {truongToolTab === "table" ? (
              <div
                className="article-draft-tiptap__table-dock"
                role="tabpanel"
                aria-label="Bảng"
              >
                <TruongTabTable
                  editor={editor}
                  disabledVisual={disabledVisual}
                  run={run}
                />
              </div>
            ) : null}
          </div>
        ) : variant === "dong-gop" ? (
          <ArticleDongGopLeadMirror>{visualPane}</ArticleDongGopLeadMirror>
        ) : (
          visualPane
        )
      ) : null}

      {tab === "html" ? (
        <>
          <textarea
            ref={htmlAreaRef}
            className="article-draft-tiptap__html"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
          <div className="article-draft-tiptap__html-foot">
            Tab HTML đồng bộ trực tiếp với trường <code>noi_dung</code> lưu DB — giữ nguyên class và cấu trúc
            site dùng (<code>article-rich-content</code>, <code>arc-*</code>, …).
          </div>
        </>
      ) : null}

      {previewOpen ? (
        <div
          className="article-draft-tiptap__preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước HTML"
        >
          <div className="article-draft-tiptap__preview-dialog">
            <div className="article-draft-tiptap__preview-actions">
              <button
                type="button"
                className="article-draft-tiptap__btn"
                onClick={() => setPreviewOpen(false)}
              >
                Đóng
              </button>
            </div>
            {variant === "nganh-admin" ? (
              <div className="article-draft-tiptap__preview-nganh nct-page">
                {nganhTitleVi?.trim() ? (
                  <div className="nct-sec-title">
                    <div className="nct-sec-num">01</div>
                    <div>
                      <h2 className="nct-sec-h">
                        Ngành {nganhTitleVi.trim()} là gì?
                      </h2>
                    </div>
                  </div>
                ) : null}
                <div
                  className="article-draft-tiptap__preview-body nct-prose body article-rich-content article-content-html"
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              </div>
            ) : variant === "dong-gop" ? (
              <ArticleDongGopLeadMirror className="article-draft-tiptap__preview-lead-mirror">
                <div
                  className="nghe-lead-rich article-rich-content article-content-html"
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              </ArticleDongGopLeadMirror>
            ) : (
              <div
                className="article-draft-tiptap__preview-body article-rich-content article-content-html"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

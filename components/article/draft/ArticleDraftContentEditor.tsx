"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  ArticleDraftToolbar,
  TruongTabTable,
  type TruongToolTab,
} from "@/components/article/draft/ArticleDraftToolbar";
import { ArcImagePlaceholder } from "@/components/article/draft/arcImagePlaceholderExtension";
import { ArcSiteHeading } from "@/components/article/draft/arcSiteHeadingExtension";
import "@/styles/article-draft-tiptap.css";

type Tab = "visual" | "html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Gắn trong `.nghe-lead-panel` — class editor bám layout lead site. */
  variant?: "default" | "nghe-lead-inline" | "truong-inline" | "nganh-admin";
  /** Ẩn gợi ý dài phía trên toolbar. */
  hideHint?: boolean;
  /**
   * Chỉ textarea HTML — không khởi tạo Tiptap.
   * Dùng cho bài nghề (HTML lớn) để tránh đơ UI khi mở chế độ sửa.
   */
  htmlOnly?: boolean;
  /** Mock heading "01 — Ngành … là gì?" khi `variant="nganh-admin"`. */
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

function NganhEditorStage({
  titleVi,
  children,
}: {
  titleVi?: string;
  children: ReactNode;
}) {
  const label = titleVi?.trim();
  return (
    <div className="article-draft-tiptap__nganh-stage nct-page">
      {label ? (
        <div className="nct-sec-title">
          <div className="nct-sec-num">01</div>
          <div>
            <h2 className="nct-sec-h">Ngành {label} là gì?</h2>
          </div>
        </div>
      ) : null}
      <div className="nct-inline-editor-wrap">{children}</div>
    </div>
  );
}

function proseMirrorClass(variant: Props["variant"]): string {
  if (variant === "nganh-admin") {
    return "nct-prose body article-rich-content article-content-html";
  }
  return "article-rich-content article-content-html";
}

type VisualPaneProps = {
  value: string;
  onChange: (html: string) => void;
  variant: NonNullable<Props["variant"]>;
  nganhTitleVi?: string;
  reportImagePaste: ImagePasteReport;
  onEditorReady: (editor: Editor | null) => void;
};

/** Mount Tiptap chỉ khi tab Soạn thảo — tránh parse HTML lớn khi mở edit nghề. */
function ArticleDraftVisualPane({
  value,
  onChange,
  variant,
  nganhTitleVi,
  reportImagePaste,
  onEditorReady,
}: VisualPaneProps) {
  const editorRef = useRef<Editor | null>(null);
  const lastEditorHtml = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const hydrateGenRef = useRef(0);
  const deferHeavyHydration = variant === "nghe-lead-inline";
  const [contentParsing, setContentParsing] = useState(false);

  const scheduleHeavySetContent = useCallback((ed: Editor, html: string) => {
    const gen = ++hydrateGenRef.current;
    setContentParsing(true);
    const run = () => {
      if (gen !== hydrateGenRef.current || ed.isDestroyed) {
        setContentParsing(false);
        return;
      }
      try {
        lastEditorHtml.current = html;
        ed.commands.setContent(html, { emitUpdate: false });
      } catch {
        /* HTML lỗi — giữ editor trống, user sửa tab HTML */
      } finally {
        if (gen === hydrateGenRef.current) setContentParsing(false);
      }
    };
    const win = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
    };
    if (win.requestIdleCallback) {
      win.requestIdleCallback(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 16);
    }
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          link: false,
        }),
        ArcSiteHeading,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),
        Placeholder.configure({
          placeholder:
            "Gõ thủ công – hoặc dán HTML ở tab HTML để giữ layout từ Claude / CMS.",
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Table.configure({
          resizable: false,
          HTMLAttributes: { class: "arc-table" },
        }),
        TableRow,
        TableHeader,
        TableCell,
        Youtube.configure({
          controls: true,
          nocookie: true,
          modestBranding: true,
        }),
        ArcImagePlaceholder,
      ],
      content: deferHeavyHydration ? "" : value,
      editorProps: {
        attributes: {
          class: proseMirrorClass(variant),
        },
        handleDrop: (_view, event) => {
          const ed = editorRef.current;
          if (!ed) return false;
          const dt = event.dataTransfer;
          if (!dt?.files?.length) return false;
          const f = Array.from(dt.files).find((x) => x.type.startsWith("image/"));
          if (!f) return false;
          event.preventDefault();
          void insertImageFromFile(ed, f, f.name, reportImagePaste);
          return true;
        },
        handlePaste: (_view, event) => {
          const ed = editorRef.current;
          if (!ed) return false;
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const it of Array.from(items)) {
            if (it.type.startsWith("image/")) {
              const f = it.getAsFile();
              if (!f) continue;
              event.preventDefault();
              void insertImageFromFile(ed, f, "paste", reportImagePaste);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const html = ed.getHTML();
        lastEditorHtml.current = html;
        onChange(html);
      },
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed;
        onEditorReady(ed);
        const html = valueRef.current.trim();
        if (deferHeavyHydration && html) {
          scheduleHeavySetContent(ed, valueRef.current);
        } else {
          lastEditorHtml.current = valueRef.current;
        }
      },
      onDestroy: () => {
        hydrateGenRef.current += 1;
        setContentParsing(false);
        editorRef.current = null;
        onEditorReady(null);
      },
    },
    [variant, reportImagePaste, onEditorReady, scheduleHeavySetContent],
  );

  useEffect(() => {
    if (contentParsing) return;
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    if (value === lastEditorHtml.current) return;
    const cur = ed.getHTML();
    if (value !== cur) {
      if (deferHeavyHydration && value.trim().length > 4000) {
        scheduleHeavySetContent(ed, value);
      } else {
        lastEditorHtml.current = value;
        ed.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor, contentParsing, deferHeavyHydration, scheduleHeavySetContent]);

  const editorShell = (
    <div
      className="article-draft-tiptap__editor-wrap"
      data-parsing={contentParsing ? "true" : undefined}
    >
      {contentParsing ? (
        <div
          className="article-draft-tiptap__editor-wrap--parsing"
          role="status"
          aria-live="polite"
        >
          Đang nạp nội dung…
        </div>
      ) : null}
      {editor ? <EditorContent editor={editor} /> : null}
    </div>
  );

  if (variant === "nganh-admin") {
    return (
      <NganhEditorStage titleVi={nganhTitleVi}>{editorShell}</NganhEditorStage>
    );
  }

  return editorShell;
}

const MAX_ARTICLE_IMAGE_DATA_URL = 1_500_000;
const MAX_ARTICLE_IMAGE_UPLOAD = 8 * 1024 * 1024;

export type ArticleImagePasteStatus =
  | { phase: "idle" }
  | { phase: "uploading_cf" }
  | { phase: "cf_ok"; url: string }
  | { phase: "cf_fail"; message: string }
  | { phase: "base64_ok" }
  | { phase: "base64_fail"; message: string };

type ImagePasteReport = (s: ArticleImagePasteStatus) => void;

function replaceImageSrcIfMatch(
  ed: Editor,
  matchSrc: string,
  next: { src: string; title?: string | null },
): boolean {
  let foundPos: number | null = null;
  ed.state.doc.descendants((node, pos) => {
    if (node.type.name !== "image") return true;
    if (node.attrs.src === matchSrc) {
      foundPos = pos;
      return false;
    }
    return true;
  });
  if (foundPos == null) return false;
  const node = ed.state.doc.nodeAt(foundPos);
  if (!node) return false;
  return ed
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.setNodeMarkup(foundPos!, undefined, {
        ...node.attrs,
        src: next.src,
        title: next.title ?? node.attrs.title,
      });
      return true;
    })
    .run();
}

function deleteImageIfSrc(ed: Editor, matchSrc: string): boolean {
  let foundPos: number | null = null;
  let size = 0;
  ed.state.doc.descendants((node, pos) => {
    if (node.type.name !== "image") return true;
    if (node.attrs.src === matchSrc) {
      foundPos = pos;
      size = node.nodeSize;
      return false;
    }
    return true;
  });
  if (foundPos == null) return false;
  return ed.chain().focus().deleteRange({ from: foundPos, to: foundPos + size }).run();
}

function fileToDataUrl(file: File, maxBytes: number): Promise<string | null> {
  if (file.size > maxBytes) return Promise.resolve(null);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

/**
 * Có `NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN` → POST `/api/article-inline-image` (Cloudflare).
 * `report` cập nhật UI (đang upload / thành công / lỗi / base64).
 */
async function insertImageFromFile(
  ed: Editor,
  file: File,
  alt: string,
  report: ImagePasteReport,
) {
  const token = process.env.NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN;
  if (typeof token === "string" && token.trim()) {
    if (file.size > MAX_ARTICLE_IMAGE_UPLOAD) {
      report({
        phase: "cf_fail",
        message: `Ảnh quá lớn (tối đa ${MAX_ARTICLE_IMAGE_UPLOAD / (1024 * 1024)} MB khi tải lên Cloudflare).`,
      });
      return;
    }
    report({ phase: "uploading_cf" });
    const previewUrl = URL.createObjectURL(file);
    ed.chain()
      .focus()
      .setImage({
        src: previewUrl,
        alt,
        title: "Đang tải lên Cloudflare…",
      })
      .run();
    try {
      const fd = new FormData();
      fd.append("file", file, file.name || alt);
      const res = await fetch("/api/article-inline-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token.trim()}` },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && data.url) {
        const patched = replaceImageSrcIfMatch(ed, previewUrl, {
          src: data.url,
          title: "Đã upload — Cloudflare Images",
        });
        URL.revokeObjectURL(previewUrl);
        if (!patched) {
          report({
            phase: "cf_fail",
            message: "Không cập nhật được ảnh sau upload (thử dán lại).",
          });
          return;
        }
        report({ phase: "cf_ok", url: data.url });
        return;
      }
      deleteImageIfSrc(ed, previewUrl);
      URL.revokeObjectURL(previewUrl);
      report({
        phase: "cf_fail",
        message: data.error ?? `Upload ảnh thất bại (${res.status}).`,
      });
      return;
    } catch {
      deleteImageIfSrc(ed, previewUrl);
      URL.revokeObjectURL(previewUrl);
      report({
        phase: "cf_fail",
        message: "Không kết nối được máy chủ upload ảnh.",
      });
      return;
    }
  }

  const url = await fileToDataUrl(file, MAX_ARTICLE_IMAGE_DATA_URL);
  if (!url) {
    report({
      phase: "base64_fail",
      message:
        "Ảnh quá lớn hoặc không đọc được. Thêm NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN (trùng ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN) + CLOUDFLARE_* để upload Cloudflare thay vì base64.",
    });
    return;
  }
  ed.chain()
    .focus()
    .setImage({
      src: url,
      alt,
      title: "Base64 — chưa upload Cloudflare (dễ lỗi khi Lưu nếu ảnh lớn)",
    })
    .run();
  report({ phase: "base64_ok" });
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
  hideHint = false,
  nganhTitleVi,
}: Props) {
  const [tab, setTab] = useState<Tab>("visual");
  const [truongToolTab, setTruongToolTab] = useState<TruongToolTab>("block");
  const [, setToolbarRev] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePasteStatus, setImagePasteStatus] =
    useState<ArticleImagePasteStatus>({ phase: "idle" });
  const [editor, setEditor] = useState<Editor | null>(null);
  const htmlAreaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const showSharedToolbar = variant !== "truong-inline";

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
  const openVisualTab = () => setTab("visual");

  const visualPane = (
    <ArticleDraftVisualPane
      value={value}
      onChange={onChange}
      variant={variant}
      nganhTitleVi={nganhTitleVi}
      reportImagePaste={reportImagePaste}
      onEditorReady={onEditorReady}
    />
  );

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
          Tiptap có thể làm sạch / chuẩn hoá HTML soạn trực quan — dùng tab{" "}
          <strong>HTML</strong> để dán nguyên khối từ Claude hoặc CMS khi cần giữ
          class <code>arc-*</code> / layout đặc biệt (ví dụ số mục{" "}
          <code>arc-num</code> trong tiêu đề). Khối{" "}
          <code>arc-image-placeholder</code> hiển thị ở Soạn thảo.
        </p>
      ) : null}

      {imagePasteStatus.phase !== "idle" ? (
        <p
          className={clsx(
            "article-draft-tiptap__image-status",
            imagePasteStatus.phase === "uploading_cf" &&
              "article-draft-tiptap__image-status--busy",
            imagePasteStatus.phase === "cf_ok" &&
              "article-draft-tiptap__image-status--ok",
            imagePasteStatus.phase === "base64_ok" &&
              "article-draft-tiptap__image-status--warn",
            (imagePasteStatus.phase === "cf_fail" ||
              imagePasteStatus.phase === "base64_fail") &&
              "article-draft-tiptap__image-status--err",
          )}
          role="status"
          aria-live="polite"
        >
          {imagePasteStatus.phase === "uploading_cf" ? (
            <>
              Đang tải ảnh lên Cloudflare Images… Ảnh xem trước đã chèn; đợi URL
              imagedelivery.net thay thế.
            </>
          ) : null}
          {imagePasteStatus.phase === "cf_ok" ? (
            <>
              <strong>Đã upload Cloudflare Images.</strong>
              <span className="article-draft-tiptap__image-status-url">
                {imagePasteStatus.url}
              </span>
            </>
          ) : null}
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

      {showSharedToolbar ? (
        <ArticleDraftToolbar
          editor={editor}
          disabledVisual={disabledVisual}
          run={run}
          layout="default"
          onOpenHtmlTab={openHtmlTab}
          onOpenPreview={() => setPreviewOpen(true)}
        />
      ) : null}

      {tab === "visual" ? (
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
        ) : (
          visualPane
        )
      ) : (
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
      )}

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

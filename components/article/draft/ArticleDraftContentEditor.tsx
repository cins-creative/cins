"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArcImagePlaceholder } from "@/components/article/draft/arcImagePlaceholderExtension";
import { ArcSiteHeading } from "@/components/article/draft/arcSiteHeadingExtension";
import "@/styles/article-draft-tiptap.css";

type Tab = "visual" | "html";

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Gắn trong `.nghe-lead-panel` — class editor bám layout lead site. */
  variant?: "default" | "nghe-lead-inline";
};

function TbBtn({
  pressed,
  disabled,
  onClick,
  title,
  children,
  small,
}: {
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      data-active={pressed ? "true" : "false"}
      className={clsx(
        "article-draft-tiptap__btn",
        small && "article-draft-tiptap__btn--sm",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
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

export function ArticleDraftContentEditor({
  value,
  onChange,
  variant = "default",
}: Props) {
  const [tab, setTab] = useState<Tab>("visual");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePasteStatus, setImagePasteStatus] =
    useState<ArticleImagePasteStatus>({ phase: "idle" });
  const htmlAreaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const prevTab = useRef<Tab>(tab);

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
      content: value,
      editorProps: {
        attributes: {
          class:
            variant === "nghe-lead-inline"
              ? "nghe-lead-rich article-rich-content article-content-html"
              : "article-rich-content article-content-html",
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
        onChange(ed.getHTML());
      },
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
    },
    [variant, reportImagePaste],
  );

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    if (tab !== "visual") return;
    const cur = ed.getHTML();
    if (value !== cur) {
      ed.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, tab, editor]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    if (prevTab.current === "html" && tab === "visual") {
      ed.commands.setContent(value, { emitUpdate: false });
    }
    prevTab.current = tab;
  }, [tab, value]);

  const run = useCallback(
    (fn: (ed: Editor) => boolean) => {
      const ed = editorRef.current;
      if (!ed) return;
      fn(ed);
    },
    [],
  );

  const disabledVisual = tab !== "visual" || !editor;

  return (
    <div
      className={clsx(
        "article-draft-tiptap",
        variant === "nghe-lead-inline" && "article-draft-tiptap--nghe-lead",
      )}
    >
      <p className="article-draft-tiptap__hint">
        Tiptap có thể làm sạch / chuẩn hoá HTML soạn trực quan — dùng tab{" "}
        <strong>HTML</strong> để dán nguyên khối từ Claude hoặc CMS khi cần giữ
        class <code>arc-*</code> / layout đặc biệt (ví dụ số mục <code>arc-num</code>{" "}
        trong tiêu đề). Khối <code>arc-image-placeholder</code> hiển thị ở Soạn thảo.
      </p>

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
          onClick={() => setTab("visual")}
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

      {tab === "visual" ? (
        <>
          <div className="article-draft-tiptap__toolbar">
            <div className="article-draft-tiptap__toolbar-row">
              <TbBtn
                title="Đậm"
                pressed={editor?.isActive("bold")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleBold().run())}
              >
                <strong>B</strong>
              </TbBtn>
              <TbBtn
                title="Nghiêng"
                pressed={editor?.isActive("italic")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleItalic().run())}
              >
                <em>I</em>
              </TbBtn>
              <TbBtn
                title="Gạch chân"
                pressed={editor?.isActive("underline")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleUnderline().run())}
              >
                <u>U</u>
              </TbBtn>
              <TbBtn
                title="Gạch ngang"
                pressed={editor?.isActive("strike")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleStrike().run())}
              >
                S
              </TbBtn>
              <TbBtn
                title="Code inline"
                pressed={editor?.isActive("code")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleCode().run())}
              >
                &lt;&gt;
              </TbBtn>
              <span className="article-draft-tiptap__sep" aria-hidden />
              {[1, 2, 3].map((lvl) => (
                <TbBtn
                  key={lvl}
                  title={`Tiêu đề H${lvl}`}
                  pressed={editor?.isActive("heading", { level: lvl })}
                  disabled={disabledVisual}
                  onClick={() =>
                    run((ed) =>
                      ed.chain().focus().toggleHeading({ level: lvl as 1 | 2 | 3 }).run(),
                    )
                  }
                >
                  H{lvl}
                </TbBtn>
              ))}
              <TbBtn
                title="Đoạn văn"
                pressed={editor?.isActive("paragraph")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().setParagraph().run())}
              >
                ¶
              </TbBtn>
              <span className="article-draft-tiptap__sep" aria-hidden />
              <TbBtn
                title="Danh sách bullet"
                pressed={editor?.isActive("bulletList")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleBulletList().run())}
              >
                •
              </TbBtn>
              <TbBtn
                title="Danh sách số"
                pressed={editor?.isActive("orderedList")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleOrderedList().run())}
              >
                1.
              </TbBtn>
              <TbBtn
                title="Trích dẫn"
                pressed={editor?.isActive("blockquote")}
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleBlockquote().run())}
              >
                “”
              </TbBtn>
              <TbBtn
                title="Đường kẻ ngang"
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().setHorizontalRule().run())}
              >
                ─
              </TbBtn>
            </div>

            <div className="article-draft-tiptap__toolbar-row">
              <span className="article-draft-tiptap__toolbar-label">BẢNG</span>
              <TbBtn
                title="Chèn bảng 3×3"
                small
                disabled={disabledVisual}
                onClick={() =>
                  run((ed) =>
                    ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                  )
                }
              >
                +Bảng
              </TbBtn>
              <TbBtn
                title="Thêm cột trước"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().addColumnBefore().run())}
              >
                +←Col
              </TbBtn>
              <TbBtn
                title="Thêm cột sau"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().addColumnAfter().run())}
              >
                Col→+
              </TbBtn>
              <TbBtn
                title="Xóa cột"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().deleteColumn().run())}
              >
                −Col
              </TbBtn>
              <TbBtn
                title="Thêm hàng trên"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().addRowBefore().run())}
              >
                +↑Row
              </TbBtn>
              <TbBtn
                title="Thêm hàng dưới"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().addRowAfter().run())}
              >
                Row↓+
              </TbBtn>
              <TbBtn
                title="Xóa hàng"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().deleteRow().run())}
              >
                −Row
              </TbBtn>
              <TbBtn
                title="Gộp ô"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().mergeCells().run())}
              >
                ⧉
              </TbBtn>
              <TbBtn
                title="Tách ô"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().splitCell().run())}
              >
                ⧇
              </TbBtn>
              <TbBtn
                title="Bật/tắt hàng tiêu đề"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().toggleHeaderRow().run())}
              >
                Hàng TH
              </TbBtn>
              <TbBtn
                title="Xóa bảng"
                small
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().deleteTable().run())}
              >
                ×Bảng
              </TbBtn>
            </div>

            <div className="article-draft-tiptap__toolbar-row">
              <span className="article-draft-tiptap__toolbar-label">MEDIA</span>
              <TbBtn
                title="Chèn liên kết"
                disabled={disabledVisual}
                onClick={() => {
                  const prev = editorRef.current?.getAttributes("link").href as string | undefined;
                  const url = window.prompt("URL liên kết", prev ?? "https://");
                  if (url === null) return;
                  const t = url.trim();
                  if (t === "") {
                    run((ed) => ed.chain().focus().extendMarkRange("link").unsetLink().run());
                    return;
                  }
                  run((ed) => ed.chain().focus().extendMarkRange("link").setLink({ href: t }).run());
                }}
              >
                🔗
              </TbBtn>
              <TbBtn
                title="Bỏ liên kết"
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().unsetLink().run())}
              >
                ⊘
              </TbBtn>
              <TbBtn
                title="Chèn ảnh từ URL"
                disabled={disabledVisual}
                onClick={() => {
                  const url = window.prompt("URL ảnh (https://…)", "https://");
                  if (!url?.trim()) return;
                  run((ed) =>
                    ed.chain().focus().setImage({ src: url.trim(), alt: "" }).run(),
                  );
                }}
              >
                Ảnh
              </TbBtn>
              <TbBtn
                title="YouTube"
                disabled={disabledVisual}
                onClick={() => {
                  const url = window.prompt("URL YouTube", "https://www.youtube.com/watch?v=");
                  if (!url?.trim()) return;
                  run((ed) => ed.chain().focus().setYoutubeVideo({ src: url.trim() }).run());
                }}
              >
                YouTube
              </TbBtn>
              <TbBtn
                title="Chuyển sang tab HTML để dán embed / block tùy ý"
                disabled={false}
                onClick={() => {
                  setTab("html");
                  requestAnimationFrame(() => htmlAreaRef.current?.focus());
                }}
              >
                {"{}"} HTML
              </TbBtn>
              <TbBtn
                title="Xem trước HTML trên trang"
                disabled={false}
                onClick={() => setPreviewOpen(true)}
              >
                Review HTML
              </TbBtn>
              <span className="article-draft-tiptap__sep" aria-hidden />
              <TbBtn
                title="Hoàn tác"
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().undo().run())}
              >
                ↶
              </TbBtn>
              <TbBtn
                title="Làm lại"
                disabled={disabledVisual}
                onClick={() => run((ed) => ed.chain().focus().redo().run())}
              >
                ↷
              </TbBtn>
              <span className="article-draft-tiptap__toolbar-label" style={{ marginLeft: "auto" }}>
                Paste / kéo thả ảnh
              </span>
            </div>
          </div>

          <div className="article-draft-tiptap__editor-wrap">
            {editor ? <EditorContent editor={editor} /> : null}
          </div>
        </>
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
            <div
              className="article-draft-tiptap__preview-body article-rich-content article-content-html"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

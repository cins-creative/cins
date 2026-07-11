"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type {
  ArticleDraftEditorVariant,
  ArticleImagePasteStatus,
} from "@/components/article/draft/article-draft-editor-types";
import { ArcImagePlaceholder } from "@/components/article/draft/arcImagePlaceholderExtension";
import { ArcSiteHeading } from "@/components/article/draft/arcSiteHeadingExtension";
import { ARTICLE_ARC_BLOCK_EXTENSIONS } from "@/components/article/draft/articleArcBlockExtensions";
import { BlockPerLine } from "@/lib/tiptap/block-per-line-extension";
import { prepareHtmlForTiptapEditor } from "@/lib/tiptap/split-block-breaks";
import {
  hydrateEditorInChunks,
  yieldToMain,
} from "@/lib/articles/chunked-tiptap-hydrate";
import {
  mergeIntroIntoNgheNoiDung,
  visualHtmlForEditor,
} from "@/lib/articles/nghe-noi-dung-sections";

type ImagePasteReport = (s: ArticleImagePasteStatus) => void;

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

function proseMirrorClass(variant: ArticleDraftEditorVariant): string {
  if (variant === "nganh-admin") {
    return "nct-prose body article-rich-content article-content-html";
  }
  if (variant === "dong-gop") {
    return "nghe-lead-rich article-rich-content article-content-html";
  }
  return "article-rich-content article-content-html";
}

function tiptapContentHtml(
  fullHtml: string,
  variant: ArticleDraftEditorVariant,
): string {
  return prepareHtmlForTiptapEditor(visualHtmlForEditor(fullHtml, variant));
}

const MAX_ARTICLE_IMAGE_DATA_URL = 1_500_000;
const MAX_ARTICLE_IMAGE_UPLOAD = 8 * 1024 * 1024;

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

export type ArticleDraftVisualPaneProps = {
  value: string;
  onChange: (html: string) => void;
  variant: ArticleDraftEditorVariant;
  nganhTitleVi?: string;
  /** Parse HTML sau paint — tránh đơ khi chuyển tab Soạn thảo (inline nghề). */
  deferHeavyContent?: boolean;
  reportImagePaste: ImagePasteReport;
  onEditorReady: (editor: Editor | null) => void;
};

/** ProseMirror/Tiptap — tab Soạn thảo. */
export function ArticleDraftVisualPane({
  value,
  onChange,
  variant,
  nganhTitleVi,
  deferHeavyContent = false,
  reportImagePaste,
  onEditorReady,
}: ArticleDraftVisualPaneProps) {
  const editorRef = useRef<Editor | null>(null);
  const lastEditorHtml = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const hydrateGenRef = useRef(0);
  const suppressOnChangeRef = useRef(false);
  const [hydrating, setHydrating] = useState(
    () => deferHeavyContent && value.trim().length > 0,
  );
  const [hydrateProgress, setHydrateProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          link: false,
          hardBreak: false,
        }),
        BlockPerLine,
        ArcSiteHeading,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),
        Placeholder.configure({
          placeholder:
            variant === "dong-gop"
              ? "Soạn bản đóng góp — dùng khối layout phía trên hoặc tab HTML."
              : "Gõ thủ công – hoặc dán HTML ở tab HTML để giữ layout từ Claude / CMS.",
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
        ...(variant === "dong-gop" ? ARTICLE_ARC_BLOCK_EXTENSIONS : []),
      ],
      content: deferHeavyContent
        ? ""
        : tiptapContentHtml(value, variant),
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
        if (suppressOnChangeRef.current) return;
        const html = ed.getHTML();
        lastEditorHtml.current = html;
        if (variant === "nghe-lead-inline") {
          onChange(mergeIntroIntoNgheNoiDung(html, valueRef.current));
        } else {
          onChange(html);
        }
      },
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed;
        onEditorReady(ed);
        const fullHtml = valueRef.current;
        const visualHtml = tiptapContentHtml(fullHtml, variant);
        if (deferHeavyContent && visualHtml.trim()) {
          const gen = ++hydrateGenRef.current;
          const introOnly = variant === "nghe-lead-inline";
          setHydrating(true);
          setHydrateProgress(null);
          void (async () => {
            await yieldToMain();
            if (gen !== hydrateGenRef.current || ed.isDestroyed) {
              setHydrating(false);
              return;
            }
            try {
              suppressOnChangeRef.current = true;
              if (introOnly) {
                ed.commands.setContent(visualHtml, { emitUpdate: false });
              } else {
                await hydrateEditorInChunks(
                  ed,
                  visualHtml,
                  () => gen !== hydrateGenRef.current,
                  (done, total) => setHydrateProgress({ done, total }),
                );
              }
              if (gen === hydrateGenRef.current && !ed.isDestroyed) {
                lastEditorHtml.current = ed.getHTML();
              }
            } catch {
              /* giữ editor trống — sửa tab HTML */
            } finally {
              suppressOnChangeRef.current = false;
              if (gen === hydrateGenRef.current) {
                setHydrating(false);
                setHydrateProgress(null);
              }
            }
          })();
        } else {
          lastEditorHtml.current = visualHtml;
        }
      },
      onDestroy: () => {
        hydrateGenRef.current += 1;
        setHydrating(false);
        setHydrateProgress(null);
        editorRef.current = null;
        onEditorReady(null);
      },
    },
    [variant, reportImagePaste, onEditorReady, deferHeavyContent],
  );

  useEffect(() => {
    if (hydrating) return;
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    const visualHtml = tiptapContentHtml(value, variant);
    if (visualHtml === lastEditorHtml.current) return;
    const cur = ed.getHTML();
    if (visualHtml !== cur) {
      suppressOnChangeRef.current = true;
      try {
        ed.commands.setContent(visualHtml, { emitUpdate: false });
        lastEditorHtml.current = ed.getHTML();
      } finally {
        suppressOnChangeRef.current = false;
      }
    }
  }, [value, editor, hydrating, variant]);

  const editorShell = (
    <div
      className="article-draft-tiptap__editor-wrap"
      data-hydrating={hydrating ? "true" : undefined}
    >
      {hydrating ? (
        <div
          className="article-draft-tiptap__editor-wrap--parsing"
          role="status"
          aria-live="polite"
        >
          {hydrateProgress && hydrateProgress.total > 1
            ? `Đang tải nội dung… (${hydrateProgress.done}/${hydrateProgress.total})`
            : "Đang tải nội dung…"}
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

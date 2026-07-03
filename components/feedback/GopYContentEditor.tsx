"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const UPLOAD_ENDPOINT = "/api/gop-y/upload";

export type GopYContent = {
  /** Nội dung gộp: đoạn văn giữ nguyên, ảnh thành `![](url)` — khớp parser admin. */
  noiDung: string;
  /** Ảnh đầu tiên (tương thích thumbnail/bản ghi cũ). */
  anhUrl: string;
  hasText: boolean;
  hasImage: boolean;
};

type Props = {
  onContentChange: (content: GopYContent) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string) => void;
  onClearError?: () => void;
};

/** Nối text của 1 khối inline, giữ URL của link dạng `text (url)`. */
function inlineText(node: PMNode): string {
  let out = "";
  node.forEach((child) => {
    if (child.isText) {
      const text = child.text ?? "";
      const link = child.marks.find((m) => m.type.name === "link");
      const href = typeof link?.attrs.href === "string" ? link.attrs.href : "";
      out += href && href !== text ? `${text} (${href})` : text;
    } else if (child.type.name === "hardBreak") {
      out += "\n";
    } else {
      out += child.textContent;
    }
  });
  return out;
}

/**
 * Duyệt doc Tiptap theo thứ tự và serialize sang định dạng an toàn:
 * - đoạn văn / heading → text (link giữ URL),
 * - danh sách → mỗi mục 1 dòng (`- ` hoặc `1. `),
 * - ảnh → `![](src)` (bỏ ảnh preview `blob:` đang upload).
 */
function serialize(editor: Editor): GopYContent {
  const parts: string[] = [];
  let firstImg = "";
  let hasText = false;

  const pushText = (t: string) => {
    const trimmed = t.trim();
    if (trimmed) {
      parts.push(trimmed);
      hasText = true;
    }
  };

  editor.state.doc.forEach((node) => {
    const name = node.type.name;
    if (name === "image") {
      const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
      if (src && !src.startsWith("blob:")) {
        parts.push(`![](${src})`);
        if (!firstImg) firstImg = src;
      }
      return;
    }
    if (name === "bulletList" || name === "orderedList") {
      const lines: string[] = [];
      let idx = 1;
      node.forEach((li) => {
        const t = li.textContent.trim();
        if (t) {
          lines.push(name === "orderedList" ? `${idx}. ${t}` : `- ${t}`);
          idx += 1;
        }
      });
      if (lines.length) {
        parts.push(lines.join("\n"));
        hasText = true;
      }
      return;
    }
    pushText(inlineText(node));
  });

  return {
    noiDung: parts.join("\n\n"),
    anhUrl: firstImg,
    hasText,
    hasImage: Boolean(firstImg),
  };
}

function findImagePos(
  ed: Editor,
  matchSrc: string,
): { pos: number; size: number } | null {
  let found: { pos: number; size: number } | null = null;
  ed.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "image" && node.attrs.src === matchSrc) {
      found = { pos, size: node.nodeSize };
      return false;
    }
    return true;
  });
  return found;
}

function replaceImageSrc(ed: Editor, matchSrc: string, nextSrc: string): boolean {
  const hit = findImagePos(ed, matchSrc);
  if (!hit) return false;
  const node = ed.state.doc.nodeAt(hit.pos);
  if (!node) return false;
  return ed
    .chain()
    .command(({ tr }) => {
      tr.setNodeMarkup(hit.pos, undefined, {
        ...node.attrs,
        src: nextSrc,
        title: null,
      });
      return true;
    })
    .run();
}

function deleteImage(ed: Editor, matchSrc: string): boolean {
  const hit = findImagePos(ed, matchSrc);
  if (!hit) return false;
  return ed
    .chain()
    .deleteRange({ from: hit.pos, to: hit.pos + hit.size })
    .run();
}

/**
 * Ô soạn góp ý bằng Tiptap — giao diện giống editor bài viết (thanh công cụ
 * gọn: đậm / nghiêng / danh sách / link / ảnh). Ảnh upload qua
 * `/api/gop-y/upload`; nội dung serialize sang text + `![](url)` an toàn để
 * admin hiển thị (không lưu HTML thô từ người dùng ẩn danh).
 */
export function GopYContentEditor({
  onContentChange,
  onUploadingChange,
  onError,
  onClearError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const uploadingRef = useRef(0);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [, setToolbarTick] = useState(0);

  // Giữ callback mới nhất trong ref để editor chỉ khởi tạo 1 lần.
  const cbRef = useRef({ onContentChange, onUploadingChange, onError, onClearError });
  cbRef.current = { onContentChange, onUploadingChange, onError, onClearError };

  const bumpUploading = useCallback((delta: number) => {
    uploadingRef.current = Math.max(0, uploadingRef.current + delta);
    setUploadingCount(uploadingRef.current);
    cbRef.current.onUploadingChange(uploadingRef.current > 0);
  }, []);

  const uploadAndInsert = useCallback(
    async (ed: Editor, file: File) => {
      if (!file.type.startsWith("image/")) {
        cbRef.current.onError("File không phải ảnh.");
        return;
      }
      cbRef.current.onClearError?.();
      const previewUrl = URL.createObjectURL(file);
      ed.chain().focus().setImage({ src: previewUrl }).run();
      bumpUploading(1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (res.ok && data.url) {
          replaceImageSrc(ed, previewUrl, data.url);
          cbRef.current.onContentChange(serialize(ed));
        } else {
          deleteImage(ed, previewUrl);
          cbRef.current.onError(data.error ?? "Không tải được ảnh. Thử lại nhé.");
        }
      } catch {
        deleteImage(ed, previewUrl);
        cbRef.current.onError("Lỗi mạng khi tải ảnh. Thử lại nhé.");
      } finally {
        URL.revokeObjectURL(previewUrl);
        bumpUploading(-1);
      }
    },
    [bumpUploading],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: false, link: false }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),
        Placeholder.configure({
          placeholder:
            "Mình nghĩ trang này nên… (có thể dán ảnh Ctrl+V hoặc kéo thả trực tiếp)",
        }),
        Image.configure({ inline: false }),
      ],
      content: "",
      editorProps: {
        attributes: { class: "gopy-prose" },
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
              void uploadAndInsert(ed, f);
              return true;
            }
          }
          return false;
        },
        handleDrop: (_view, event) => {
          const ed = editorRef.current;
          if (!ed) return false;
          const files = event.dataTransfer?.files;
          const f = files
            ? Array.from(files).find((x) => x.type.startsWith("image/"))
            : undefined;
          if (!f) return false;
          event.preventDefault();
          void uploadAndInsert(ed, f);
          return true;
        },
      },
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed;
      },
      onUpdate: ({ editor: ed }) => {
        cbRef.current.onContentChange(serialize(ed));
      },
      onDestroy: () => {
        editorRef.current = null;
      },
    },
    [uploadAndInsert],
  );

  // Cập nhật trạng thái nút (đậm/nghiêng/…) khi con trỏ / nội dung đổi.
  useEffect(() => {
    if (!editor) return;
    const bump = () => setToolbarTick((t) => t + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  useEffect(
    () => () => {
      uploadingRef.current = 0;
    },
    [],
  );

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && editor) void uploadAndInsert(editor, file);
    e.target.value = "";
  }

  function toggleLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập đường dẫn (URL):", prev ?? "https://");
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url.trim() === "") {
      chain.unsetLink().run();
    } else {
      chain.setLink({ href: url.trim() }).run();
    }
  }

  const busy = uploadingCount > 0;
  const disabled = !editor;

  return (
    <div className="gopy-tiptap">
      <div className="gopy-tiptap-toolbar">
        <button
          type="button"
          className="gopy-tb-btn"
          title="In đậm"
          aria-label="In đậm"
          disabled={disabled}
          data-active={editor?.isActive("bold") ? "true" : "false"}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={15} strokeWidth={2.4} aria-hidden />
        </button>
        <button
          type="button"
          className="gopy-tb-btn"
          title="In nghiêng"
          aria-label="In nghiêng"
          disabled={disabled}
          data-active={editor?.isActive("italic") ? "true" : "false"}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} strokeWidth={2.4} aria-hidden />
        </button>

        <span className="gopy-tb-sep" aria-hidden />

        <button
          type="button"
          className="gopy-tb-btn"
          title="Danh sách"
          aria-label="Danh sách"
          disabled={disabled}
          data-active={editor?.isActive("bulletList") ? "true" : "false"}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={15} strokeWidth={2.2} aria-hidden />
        </button>
        <button
          type="button"
          className="gopy-tb-btn"
          title="Danh sách đánh số"
          aria-label="Danh sách đánh số"
          disabled={disabled}
          data-active={editor?.isActive("orderedList") ? "true" : "false"}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} strokeWidth={2.2} aria-hidden />
        </button>

        <span className="gopy-tb-sep" aria-hidden />

        <button
          type="button"
          className="gopy-tb-btn"
          title="Chèn liên kết"
          aria-label="Chèn liên kết"
          disabled={disabled}
          data-active={editor?.isActive("link") ? "true" : "false"}
          onClick={toggleLink}
        >
          <Link2 size={15} strokeWidth={2.2} aria-hidden />
        </button>
        <button
          type="button"
          className="gopy-tb-btn gopy-tb-btn--img"
          title="Chèn ảnh"
          aria-label="Chèn ảnh"
          disabled={disabled || busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? (
            <Loader2 size={15} className="gopy-spin" aria-hidden />
          ) : (
            <ImagePlus size={15} strokeWidth={2.2} aria-hidden />
          )}
          <span className="gopy-tb-btn-label">{busy ? "Đang tải…" : "Ảnh"}</span>
        </button>
      </div>

      <div
        className="gopy-tiptap-editor"
        onClick={() => editor?.chain().focus().run()}
      >
        {editor ? <EditorContent editor={editor} /> : null}
      </div>

      <p className="gopy-tiptap-hint">
        Gõ nội dung, chèn nhiều ảnh xen kẽ — dán (Ctrl+V) hoặc kéo thả ảnh trực tiếp.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="gopy-file-input"
        onChange={handlePickFile}
      />
    </div>
  );
}

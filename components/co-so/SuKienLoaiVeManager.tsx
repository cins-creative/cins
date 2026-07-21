"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ClipboardPaste,
  ImagePlus,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { readImageFileFromClipboard } from "@/lib/files/clipboard-images";
import {
  formatGiaVnd,
  type SuKienLoaiVeInput,
} from "@/lib/to-chuc/su-kien-constants";
import { stripHtmlToPlainText } from "@/lib/truong/bai-dang-content";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";

export type SuKienLoaiVeDraft = SuKienLoaiVeInput & {
  /** Client key — ổn định trong form trước khi lưu. */
  key: string;
  coverPreviewUrl?: string | null;
};

type Props = {
  items: SuKienLoaiVeDraft[];
  onChange: (items: SuKienLoaiVeDraft[]) => void;
  disabled?: boolean;
};

function emptyDraft(thuTu: number): SuKienLoaiVeDraft {
  return {
    key: `new-${Date.now()}-${thuTu}`,
    ten: "",
    moTa: "",
    gia: 0,
    coverId: null,
    coverPreviewUrl: null,
    thuTu,
  };
}

export function SuKienLoaiVeManager({ items, onChange, disabled }: Props) {
  const [editing, setEditing] = useState<SuKienLoaiVeDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setFormError(null);
    setEditing(emptyDraft(items.length));
  }

  function openEdit(item: SuKienLoaiVeDraft) {
    setFormError(null);
    setEditing({ ...item });
  }

  function removeItem(key: string) {
    onChange(items.filter((i) => i.key !== key));
  }

  function saveEditing(next: SuKienLoaiVeDraft) {
    const ten = next.ten.trim();
    if (!ten) {
      setFormError("Cần tên loại vé.");
      return;
    }
    if (!Number.isInteger(next.gia) || next.gia < 0) {
      setFormError("Giá vé không hợp lệ.");
      return;
    }
    const exists = items.some((i) => i.key === next.key);
    if (exists) {
      onChange(items.map((i) => (i.key === next.key ? { ...next, ten } : i)));
    } else {
      onChange([...items, { ...next, ten }]);
    }
    setEditing(null);
    setFormError(null);
  }

  return (
    <div className="cso-sk-ve-mgr">
      <div className="cso-sk-ve-mgr-head">
        <span className="cso-kh-label">
          Quản lý vé <span className="cso-kh-req">*</span>
        </span>
        <button
          type="button"
          className="cso-sk-ve-add"
          onClick={openCreate}
          disabled={disabled || Boolean(editing)}
        >
          <Plus size={15} aria-hidden />
          Thêm loại vé
        </button>
      </div>
      <p className="cso-kh-field-hint">
        Mỗi loại vé có tên, giá, mô tả và ảnh (tuỳ chọn). Card sự kiện hiện «Từ
        … đ» khi có nhiều loại.
      </p>

      {items.length === 0 && !editing ? (
        <p className="cso-sk-ve-empty">Chưa có loại vé — thêm ít nhất một loại.</p>
      ) : (
        <ul className="cso-sk-ve-list">
          {items.map((item) => (
            <li key={item.key} className="cso-sk-ve-item">
              <div className="cso-sk-ve-thumb">
                {item.coverPreviewUrl ? (
                  <Image
                    src={item.coverPreviewUrl}
                    alt=""
                    width={112}
                    height={28}
                    unoptimized
                  />
                ) : (
                  <span aria-hidden>
                    <ImagePlus size={18} />
                  </span>
                )}
              </div>
              <div className="cso-sk-ve-meta">
                <strong>{item.ten}</strong>
                <span>{formatGiaVnd(item.gia)}</span>
                {item.moTa?.trim() ? (
                  <p className="cso-sk-ve-desc">
                    {stripHtmlToPlainText(item.moTa) || item.moTa.trim()}
                  </p>
                ) : null}
              </div>
              <div className="cso-sk-ve-item-acts">
                <button
                  type="button"
                  className="cso-sk-act"
                  aria-label={`Sửa ${item.ten}`}
                  disabled={disabled || Boolean(editing)}
                  onClick={() => openEdit(item)}
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="cso-sk-act cso-sk-act--danger"
                  aria-label={`Xóa ${item.ten}`}
                  disabled={disabled || Boolean(editing)}
                  onClick={() => removeItem(item.key)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <SuKienLoaiVeEditor
          value={editing}
          error={formError}
          disabled={disabled}
          onCancel={() => {
            setEditing(null);
            setFormError(null);
          }}
          onSave={saveEditing}
        />
      ) : null}
    </div>
  );
}

function SuKienLoaiVeEditor({
  value,
  error,
  disabled,
  onCancel,
  onSave,
}: {
  value: SuKienLoaiVeDraft;
  error: string | null;
  disabled?: boolean;
  onCancel: () => void;
  onSave: (v: SuKienLoaiVeDraft) => void;
}) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    const localPreview = URL.createObjectURL(file);
    setUploading(true);
    setUploadErr(null);
    setDraft((d) => ({
      ...d,
      coverId: null,
      coverPreviewUrl: localPreview,
    }));
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/cover/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error ?? "Upload ảnh thất bại.");
      }
      setDraft((d) => ({
        ...d,
        coverId: json.imageId!,
        coverPreviewUrl: json.url ?? localPreview,
      }));
    } catch (e) {
      URL.revokeObjectURL(localPreview);
      setDraft((d) => ({ ...d, coverId: null, coverPreviewUrl: null }));
      setUploadErr(e instanceof Error ? e.message : "Upload ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="cso-sk-ve-editor" aria-labelledby={titleId}>
      <div className="cso-sk-ve-editor-head">
        <h3 id={titleId} className="cso-sk-ve-editor-title">
          {value.ten.trim() ? "Sửa loại vé" : "Thêm loại vé"}
        </h3>
        <button
          type="button"
          className="cso-kh-create-close"
          aria-label="Đóng"
          onClick={onCancel}
          disabled={disabled || uploading}
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <label className="cso-kh-field">
        <span className="cso-kh-label">
          Tên loại vé <span className="cso-kh-req">*</span>
        </span>
        <input
          className="cso-kh-input"
          value={draft.ten}
          maxLength={80}
          disabled={disabled || uploading}
          onChange={(e) => setDraft((d) => ({ ...d, ten: e.target.value }))}
          placeholder="Vd: Early bird, VIP, sinh viên"
        />
      </label>

      <label className="cso-kh-field">
        <span className="cso-kh-label">
          Giá (VND) <span className="cso-kh-req">*</span>
        </span>
        <input
          type="number"
          min={0}
          className="cso-kh-input"
          value={draft.gia}
          disabled={disabled || uploading}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              gia: Number.parseInt(e.target.value || "0", 10) || 0,
            }))
          }
        />
        <span className="cso-kh-hint">0 = hạng miễn phí trong sự kiện tính phí.</span>
      </label>

      <div className="cso-kh-field">
        <span className="cso-kh-label">Mô tả</span>
        <SuKienLoaiVeMoTaEditor
          value={draft.moTa ?? ""}
          disabled={disabled || uploading}
          onChange={(html) => setDraft((d) => ({ ...d, moTa: html }))}
        />
      </div>

      <div className="cso-kh-field">
        <span className="cso-kh-label">Ảnh loại vé</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="cso-sk-ve-cover-row">
          <div className="cso-sk-ve-cover-wrap">
            <button
              type="button"
              className="cso-sk-ve-cover-btn"
              disabled={disabled || uploading}
              title={draft.coverPreviewUrl ? "Đổi ảnh" : "Chọn ảnh"}
              aria-label={
                uploading
                  ? "Đang tải ảnh"
                  : draft.coverPreviewUrl
                    ? "Đổi ảnh loại vé"
                    : "Chọn ảnh loại vé"
              }
              onClick={() => fileRef.current?.click()}
            >
              {draft.coverPreviewUrl ? (
                <Image
                  src={draft.coverPreviewUrl}
                  alt=""
                  width={160}
                  height={40}
                  unoptimized
                />
              ) : uploading ? (
                <Loader2 size={18} className="tdh-spin" aria-hidden />
              ) : (
                <ImagePlus size={18} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="cso-sk-ve-cover-paste"
              disabled={disabled || uploading}
              aria-label="Dán ảnh loại vé từ bộ nhớ tạm"
              title="Dán ảnh"
              onClick={(e) => {
                e.stopPropagation();
                void (async () => {
                  const file = await readImageFileFromClipboard();
                  if (!file) {
                    setUploadErr(
                      "Không đọc được ảnh từ bộ nhớ tạm. Hãy copy ảnh rồi thử lại.",
                    );
                    return;
                  }
                  void handleFile(file);
                })();
              }}
            >
              <ClipboardPaste size={11} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          {draft.coverId || draft.coverPreviewUrl ? (
            <button
              type="button"
              className="cso-kh-foot-btn"
              disabled={disabled || uploading}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  coverId: null,
                  coverPreviewUrl: null,
                }))
              }
            >
              Gỡ ảnh
            </button>
          ) : null}
        </div>
        {uploadErr ? <p className="cso-kh-form-err">{uploadErr}</p> : null}
      </div>

      {error ? <p className="cso-kh-form-err">{error}</p> : null}

      <div className="cso-sk-ve-editor-foot">
        <button
          type="button"
          className="cso-kh-foot-btn"
          onClick={onCancel}
          disabled={disabled || uploading}
        >
          Huỷ
        </button>
        <button
          type="button"
          className="cso-kh-foot-btn cso-kh-foot-btn--primary"
          onClick={() => onSave(draft)}
          disabled={disabled || uploading}
        >
          Lưu loại vé
        </button>
      </div>
    </div>
  );
}

function SuKienLoaiVeMoTaEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      Placeholder.configure({
        placeholder: "Quyền lợi, ghế ngồi, quà tặng… (có thể dùng danh sách)",
      }),
    ],
    content: value?.trim() || "<p></p>",
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const next = value?.trim() || "<p></p>";
    if (editor.getHTML() === next) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="cso-sk-ve-mota">
      <div className="cso-sk-ve-mota-tb" role="toolbar" aria-label="Định dạng mô tả">
        <button
          type="button"
          className="cso-sk-ve-mota-tb-btn"
          title="Danh sách"
          aria-label="Danh sách"
          disabled={disabled || !editor}
          data-active={editor?.isActive("bulletList") ? "true" : "false"}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={15} strokeWidth={2.2} aria-hidden />
        </button>
        <button
          type="button"
          className="cso-sk-ve-mota-tb-btn"
          title="Danh sách đánh số"
          aria-label="Danh sách đánh số"
          disabled={disabled || !editor}
          data-active={editor?.isActive("orderedList") ? "true" : "false"}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      <EditorContent editor={editor} className="cso-sk-ve-mota-editor" />
    </div>
  );
}

export function loaiVeDraftsFromCard(
  loaiVe: {
    id: string;
    ten: string;
    moTa: string | null;
    gia: number;
    coverId: string | null;
    coverSrc: string | null;
    thuTu: number;
  }[],
): SuKienLoaiVeDraft[] {
  return loaiVe.map((v, i) => ({
    key: v.id,
    ten: v.ten,
    moTa: v.moTa ?? "",
    gia: v.gia,
    coverId: v.coverId,
    coverPreviewUrl: v.coverSrc,
    thuTu: v.thuTu ?? i,
  }));
}

export function loaiVeDraftsToPayload(
  items: SuKienLoaiVeDraft[],
): SuKienLoaiVeInput[] {
  return items.map((item, i) => ({
    ten: item.ten.trim(),
    moTa: normalizeTruongGioiThieuHtml(item.moTa),
    gia: item.gia,
    coverId: item.coverId?.trim() || null,
    thuTu: i,
  }));
}

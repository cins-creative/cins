"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { InlineMultiImageGallery } from "@/components/shared/InlineMultiImageGallery";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";
import { getCoverUrl } from "@/lib/articles/cover";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  BAI_DANG_LOAI_LABELS,
  BAI_DANG_LOAI_VALUES,
  normalizeLoaiBaiDang,
  type BaiDangLoai,
} from "@/lib/truong/bai-dang";
import {
  getTruongInlineUploadTokenClient,
  readTruongInlineError,
  truongInlineFetch,
} from "@/lib/truong/inline-api";
import type { TruongBaiDang } from "@/lib/truong/types";

import "@/styles/article-draft-tiptap.css";

const LOAI_OPTIONS = BAI_DANG_LOAI_VALUES.map((value) => ({
  value,
  label: BAI_DANG_LOAI_LABELS[value],
}));

function BaiDangCoverField({
  coverId,
  previewUrl,
  onChange,
  onUploadingChange,
}: {
  coverId: string | null;
  previewUrl: string | null;
  onChange: (next: { coverId: string | null; previewUrl: string | null }) => void;
  onUploadingChange: (v: boolean) => void;
}) {
  const ctx = useTruongInlineEdit();
  const displayUrl = previewUrl ?? getCoverUrl(coverId);
  const images = displayUrl ? [displayUrl] : [];

  const uploadImage = useCallback(
    async (file: File) => {
      if (!ctx) {
        return { ok: false as const, message: "Không có quyền chỉnh sửa" };
      }
      onUploadingChange(true);
      const up = await ctx.uploadImage(file);
      onUploadingChange(false);
      if (!up) {
        return { ok: false as const, message: "Tải ảnh cover thất bại" };
      }
      onChange({ coverId: up.imageId, previewUrl: up.url });
      return { ok: true as const, url: up.url };
    },
    [ctx, onChange, onUploadingChange],
  );

  return (
    <div className="tdh-inline-field tdh-baidang-cover-field">
      <span>Ảnh cover (banner trên thẻ bài đăng)</span>
      <InlineMultiImageGallery
        images={images}
        onChange={(urls) => {
          if (!urls.length) onChange({ coverId: null, previewUrl: null });
        }}
        onNotify={(msg) => ctx?.showToast(msg)}
        uploadImage={uploadImage}
        maxImages={1}
        globalPaste
        dropzoneLabel="+ Thêm ảnh"
        dropzoneHint="Kéo thả hoặc chọn file — dán ảnh (Ctrl+V) bất kỳ đâu trong hộp thoại"
      />
    </div>
  );
}

type BaiDangModalCtx = {
  openCreate: () => void;
  openEdit: (post: TruongBaiDang) => void;
  remove: (id: string) => void;
};

const BaiDangModalContext = createContext<BaiDangModalCtx | null>(null);

export function useBaiDangModal(): BaiDangModalCtx | null {
  return useContext(BaiDangModalContext);
}

export function TruongBaiDangEditProvider({ children }: { children: ReactNode }) {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [tieu_de, setTieuDe] = useState("");
  const [loai_bai_dang, setLoai] = useState<BaiDangLoai>("thong_bao");
  const [tom_tat, setTomTat] = useState("");
  const [noi_dung, setNoiDung] = useState("<p></p>");
  const [cover_id, setCoverId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setTieuDe("");
    setLoai("thong_bao");
    setTomTat("");
    setNoiDung("<p></p>");
    setCoverId(null);
    setCoverPreviewUrl(null);
  }, []);

  const openCreate = useCallback(() => {
    setEditId(null);
    resetForm();
    setOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((post: TruongBaiDang) => {
    setEditId(post.id);
    setTieuDe(post.tieu_de);
    setLoai(normalizeLoaiBaiDang(post.loai_bai_dang));
    setTomTat(post.tom_tat ?? "");
    setNoiDung(post.noi_dung?.trim() || "<p></p>");
    setCoverId(post.cover_id ?? null);
    setCoverPreviewUrl(baiDangCoverDisplayUrl(post));
    setOpen(true);
  }, []);

  const remove = useCallback(
    async (id: string) => {
      if (!ctx || !confirm("Ẩn bài đăng này?")) return;
      const prev = ctx.baidang;
      ctx.setBaidang((list) => list.filter((p) => p.id !== id));
      const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        ctx.setBaidang(prev);
        ctx.showToast("Ẩn bài thất bại");
      } else {
        ctx.showToast("Đã ẩn bài đăng");
      }
    },
    [ctx],
  );

  async function save() {
    if (!ctx || saving) return;

    const body = {
      tieu_de: tieu_de.trim(),
      loai_bai_dang: normalizeLoaiBaiDang(loai_bai_dang),
      tom_tat: tom_tat.trim() || null,
      noi_dung: noi_dung.trim() || null,
      cover_id: cover_id?.trim() || null,
      trang_thai: "da_dang",
    };

    if (!body.tieu_de) {
      ctx.showToast("Vui lòng nhập tiêu đề bài đăng");
      return;
    }

    if (!getTruongInlineUploadTokenClient()) {
      ctx.showToast(
        "Thiếu NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN — không thể lưu bài đăng",
      );
      return;
    }

    setSaving(true);
    const prev = ctx.baidang;
    const cover_src =
      coverPreviewUrl ??
      (body.cover_id ? getCoverUrl(body.cover_id) : null);

    try {
      if (editId) {
        ctx.setBaidang((list) =>
          list.map((p) =>
            p.id === editId
              ? {
                  ...p,
                  ...body,
                  loai_bai_dang: body.loai_bai_dang,
                  cover_id: body.cover_id,
                  cover_src,
                }
              : p,
          ),
        );
        const res = await truongInlineFetch(ctx.orgId, `/bai-dang/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          ctx.setBaidang(prev);
          const msg = await readTruongInlineError(res);
          ctx.showToast(`Lưu thất bại: ${msg} — đã hoàn tác`);
          return;
        }
        const json = (await res.json()) as { post: TruongBaiDang };
        const savedCoverSrc =
          cover_src ?? baiDangCoverDisplayUrl(json.post);
        ctx.setBaidang((list) =>
          list.map((p) =>
            p.id === editId
              ? { ...p, ...json.post, cover_src: savedCoverSrc, tags: p.tags }
              : p,
          ),
        );
      } else {
        const tmpId = `tmp-${Date.now()}`;
        const optimistic: TruongBaiDang = {
          id: tmpId,
          tieu_de: body.tieu_de,
          loai_bai_dang: body.loai_bai_dang,
          tom_tat: body.tom_tat,
          noi_dung: body.noi_dung,
          cover_id: body.cover_id,
          cover_src,
          tao_luc: new Date().toISOString(),
          tags: [],
        };
        ctx.setBaidang((list) => [optimistic, ...list]);
        const res = await truongInlineFetch(ctx.orgId, "/bai-dang", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          ctx.setBaidang(prev);
          const msg = await readTruongInlineError(res);
          ctx.showToast(`Tạo bài thất bại: ${msg} — đã hoàn tác`);
          return;
        }
        const json = (await res.json()) as { post: TruongBaiDang };
        const savedCoverSrc =
          cover_src ?? baiDangCoverDisplayUrl(json.post);
        ctx.setBaidang((list) =>
          list.map((p) =>
            p.id === tmpId
              ? { ...json.post, cover_src: savedCoverSrc, tags: [] }
              : p,
          ),
        );
      }
      ctx.showToast("Đã lưu");
      setOpen(false);
    } catch {
      ctx.setBaidang(prev);
      ctx.showToast("Lưu thất bại — mất kết nối hoặc lỗi máy chủ — đã hoàn tác");
    } finally {
      setSaving(false);
    }
  }

  if (!ctx?.isEditing) {
    return <>{children}</>;
  }

  const fab =
    typeof document !== "undefined"
      ? createPortal(
          <button
            type="button"
            className="tdh-inline-fab"
            onClick={openCreate}
            aria-label="Đăng bài mới"
          >
            +
          </button>,
          document.body,
        )
      : null;

  return (
    <BaiDangModalContext.Provider value={{ openCreate, openEdit, remove }}>
      {children}
      {fab}
      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide"
      >
        <h3 className="tdh-inline-modal-title">
          {editId ? "Sửa bài đăng" : "Bài đăng mới"}
        </h3>
        <label className="tdh-inline-field">
          <span>Tiêu đề</span>
          <input value={tieu_de} onChange={(e) => setTieuDe(e.target.value)} />
        </label>
        <label className="tdh-inline-field">
          <span>Loại</span>
          <select
            value={loai_bai_dang}
            onChange={(e) => setLoai(normalizeLoaiBaiDang(e.target.value))}
          >
            {LOAI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="tdh-inline-field">
          <span>Tóm tắt (hiển thị trên dòng thời gian)</span>
          <textarea
            rows={2}
            value={tom_tat}
            onChange={(e) => setTomTat(e.target.value)}
            placeholder="Mô tả ngắn cho thẻ bài đăng…"
          />
        </label>
        <BaiDangCoverField
          coverId={cover_id}
          previewUrl={coverPreviewUrl}
          onUploadingChange={setCoverUploading}
          onChange={({ coverId: id, previewUrl }) => {
            setCoverId(id);
            setCoverPreviewUrl(previewUrl);
          }}
        />
        <div className="tdh-inline-field tdh-inline-field--richtext">
          <span>Nội dung bài</span>
          <div className="tdh-bai-dang-editor">
            <ArticleDraftContentEditor
              variant="truong-inline"
              hideHint
              value={noi_dung}
              onChange={setNoiDung}
            />
          </div>
        </div>
        <div className="tdh-inline-modal-actions">
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setOpen(false)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="tdh-inline-btn primary"
            disabled={saving || coverUploading}
            onClick={() => void save()}
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </TruongInlineModal>
    </BaiDangModalContext.Provider>
  );
}

export function TruongBaiDangPostActions({ post }: { post: TruongBaiDang }) {
  const modal = useBaiDangModal();
  if (!modal) return null;

  return (
    <div className="tdh-baidang-edit" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="tdh-inline-chip-btn"
        onClick={() => modal.openEdit(post)}
      >
        Sửa
      </button>
      <button
        type="button"
        className="tdh-inline-chip-btn danger"
        onClick={() => void modal.remove(post.id)}
      >
        Ẩn
      </button>
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TruongHinhAnhUploadPanel } from "@/components/truong/inline/TruongHinhAnhUploadPanel";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  HINH_ANH_LOAI_OPTIONS,
  labelHinhAnhLoai,
  normalizeHinhAnhLoai,
  type HinhAnhLoai,
} from "@/lib/truong/hinh-anh";
import { hinhAnhDisplayUrl } from "@/lib/truong/hinh-anh-display";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { TruongHinhAnh } from "@/lib/truong/types";

type DraftRow = {
  caption: string;
  loai: HinhAnhLoai;
};

function sortHinhAnh(images: TruongHinhAnh[]): TruongHinhAnh[] {
  return [...images].sort((a, b) => {
    const ao = a.thu_tu ?? 0;
    const bo = b.thu_tu ?? 0;
    if (ao !== bo) return ao - bo;
    return a.id.localeCompare(b.id);
  });
}

function buildDraftMap(images: TruongHinhAnh[]): Map<string, DraftRow> {
  return new Map(
    images.map((photo) => [
      photo.id,
      {
        caption: photo.caption ?? "",
        loai: normalizeHinhAnhLoai(photo.loai),
      },
    ]),
  );
}

function draftMapsEqual(
  a: Map<string, DraftRow>,
  b: Map<string, DraftRow>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [id, row] of a) {
    const other = b.get(id);
    if (!other) return false;
    if (row.caption !== other.caption || row.loai !== other.loai) return false;
  }
  return true;
}

function TruongHinhAnhManageTable({
  draft,
  onDraftChange,
  onNotify,
}: {
  draft: Map<string, DraftRow>;
  onDraftChange: (photoId: string, patch: Partial<DraftRow>) => void;
  onNotify: (msg: string) => void;
}) {
  const ctx = useTruongInlineEdit();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(
    () => (ctx ? sortHinhAnh(ctx.hinhanh) : []),
    [ctx?.hinhanh],
  );

  if (!ctx) return null;

  async function removePhoto(photoId: string) {
    if (!confirm("Xóa ảnh này khỏi gallery?")) return;
    setDeletingId(photoId);
    const prev = ctx!.hinhanh;
    ctx!.setHinhanh((list) => list.filter((p) => p.id !== photoId));
    const res = await truongInlineFetch(
      ctx!.orgId,
      `/hinh-anh?photoId=${encodeURIComponent(photoId)}`,
      { method: "DELETE" },
    );
    setDeletingId(null);
    if (!res.ok) {
      ctx!.setHinhanh(prev);
      onNotify("Xóa ảnh thất bại");
    }
  }

  if (!rows.length) {
    return (
      <p className="tdh-hinhanh-manage-empty">
        Chưa có ảnh — tải lên ở khối phía trên.
      </p>
    );
  }

  return (
    <div className="tdh-hinhanh-manage-table-wrap">
      <table className="tdh-hinhanh-manage-table">
        <thead>
          <tr>
            <th scope="col">Ảnh</th>
            <th scope="col">Mô tả</th>
            <th scope="col">Loại</th>
            <th scope="col" className="tdh-hinhanh-manage-actions-h">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((photo) => {
            const thumb = hinhAnhDisplayUrl(photo);
            const row = draft.get(photo.id);
            const busy = deletingId === photo.id;
            if (!row) return null;

            return (
              <tr key={photo.id} className={busy ? "is-busy" : undefined}>
                <td className="tdh-hinhanh-manage-thumb-cell">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="tdh-hinhanh-manage-thumb"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="tdh-hinhanh-manage-thumb-ph">—</span>
                  )}
                </td>
                <td className="tdh-hinhanh-manage-caption-cell">
                  <input
                    type="text"
                    className="tdh-hinhanh-manage-caption"
                    value={row.caption}
                    placeholder="Chú thích ngắn (tuỳ chọn)"
                    disabled={busy}
                    onChange={(e) =>
                      onDraftChange(photo.id, { caption: e.target.value })
                    }
                  />
                </td>
                <td className="tdh-hinhanh-manage-loai-cell">
                  <select
                    className="tdh-hinhanh-manage-loai"
                    aria-label={`Loại — ${labelHinhAnhLoai(row.loai)}`}
                    value={row.loai}
                    disabled={busy}
                    onChange={(e) =>
                      onDraftChange(photo.id, {
                        loai: normalizeHinhAnhLoai(e.target.value),
                      })
                    }
                  >
                    {HINH_ANH_LOAI_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="tdh-hinhanh-manage-actions">
                  <button
                    type="button"
                    className="tdh-hinhanh-manage-del"
                    disabled={busy}
                    onClick={() => void removePhoto(photo.id)}
                  >
                    {deletingId === photo.id ? "Đang xóa…" : "Xóa"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TruongHinhAnhManageDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ctx = useTruongInlineEdit();
  const [draft, setDraft] = useState<Map<string, DraftRow>>(new Map());
  const [snapshot, setSnapshot] = useState<Map<string, DraftRow>>(new Map());
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open || !ctx) {
      wasOpen.current = false;
      return;
    }
    if (!wasOpen.current) {
      const initial = buildDraftMap(ctx.hinhanh);
      setSnapshot(initial);
      setDraft(new Map(initial));
      wasOpen.current = true;
      return;
    }
    setDraft((prev) => {
      const next = new Map(prev);
      for (const photo of ctx.hinhanh) {
        if (!next.has(photo.id)) {
          next.set(photo.id, {
            caption: photo.caption ?? "",
            loai: normalizeHinhAnhLoai(photo.loai),
          });
        }
      }
      for (const id of [...next.keys()]) {
        if (!ctx.hinhanh.some((photo) => photo.id === id)) {
          next.delete(id);
        }
      }
      return next;
    });
  }, [open, ctx, ctx?.hinhanh]);

  if (!ctx) return null;

  const editCtx = ctx;
  const count = editCtx.hinhanh.length;
  const dirty = !draftMapsEqual(draft, snapshot);

  function updateDraft(photoId: string, patch: Partial<DraftRow>) {
    setDraft((prev) => {
      const current = prev.get(photoId);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(photoId, { ...current, ...patch });
      return next;
    });
  }

  function applyDraftToList(list: TruongHinhAnh[]): TruongHinhAnh[] {
    return list.map((photo) => {
      const row = draft.get(photo.id);
      if (!row) return photo;
      return {
        ...photo,
        caption: row.caption.trim() || null,
        loai: row.loai,
      };
    });
  }

  function handleCancel() {
    editCtx.setHinhanh((list) =>
      list.map((photo) => {
        const snap = snapshot.get(photo.id);
        if (!snap) return photo;
        return {
          ...photo,
          caption: snap.caption.trim() || null,
          loai: snap.loai,
        };
      }),
    );
    onClose();
  }

  async function handleSave() {
    if (!dirty) {
      onClose();
      return;
    }

    const patches: Array<{
      photoId: string;
      patch: { loai?: HinhAnhLoai; caption?: string | null };
    }> = [];

    for (const photo of editCtx.hinhanh) {
      if (photo.id.startsWith("tmp-")) continue;
      const row = draft.get(photo.id);
      const snap = snapshot.get(photo.id);
      if (!row || !snap) continue;
      const patch: { loai?: HinhAnhLoai; caption?: string | null } = {};
      const caption = row.caption.trim() || null;
      const snapCaption = snap.caption.trim() || null;
      if (caption !== snapCaption) patch.caption = caption;
      if (row.loai !== snap.loai) patch.loai = row.loai;
      if (Object.keys(patch).length > 0) {
        patches.push({ photoId: photo.id, patch });
      }
    }

    if (!patches.length) {
      onClose();
      return;
    }

    setSaving(true);
    const prev = editCtx.hinhanh;
    editCtx.setHinhanh(applyDraftToList(prev));

    for (const { photoId, patch } of patches) {
      const res = await truongInlineFetch(editCtx.orgId, "/hinh-anh", {
        method: "PATCH",
        body: JSON.stringify({ photoId, ...patch }),
      });
      if (!res.ok) {
        editCtx.setHinhanh(prev);
        setSaving(false);
        const msg = await readTruongInlineError(res);
        editCtx.showToast(`Lưu thay đổi gallery thất bại: ${msg}`);
        return;
      }
    }

    setSnapshot(new Map(draft));
    setSaving(false);
    editCtx.showToast("Đã lưu gallery ảnh");
    onClose();
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={handleCancel}
      className="tdh-inline-modal--wide tdh-hinhanh-manage-modal"
      labelledBy="tdh-hinhanh-manage-title"
    >
      <div className="tdh-hinhanh-manage-head">
        <div className="tdh-hinhanh-manage-head-copy">
          <h3 id="tdh-hinhanh-manage-title" className="tdh-inline-modal-title">
            Quản lý gallery ảnh
          </h3>
          <p className="tdh-hinhanh-manage-lead">
            Tải ảnh mới, gán loại và mô tả — bấm <strong>Lưu</strong> để cập nhật
            gallery công khai.
          </p>
        </div>
        <button
          type="button"
          className="tdh-hinhanh-manage-close"
          aria-label="Hủy"
          disabled={saving}
          onClick={handleCancel}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <TruongHinhAnhUploadPanel onNotify={(msg) => editCtx.showToast(msg)} />

      <div className="tdh-hinhanh-manage-section">
        <h4 className="tdh-hinhanh-manage-section-title">
          Danh sách ảnh ({count})
        </h4>
        <TruongHinhAnhManageTable
          draft={draft}
          onDraftChange={updateDraft}
          onNotify={(msg) => editCtx.showToast(msg)}
        />
      </div>

      <div className="tdh-inline-modal-actions">
        <button
          type="button"
          className="tdh-inline-btn ghost"
          disabled={saving}
          onClick={handleCancel}
        >
          Hủy
        </button>
        <button
          type="button"
          className="tdh-inline-btn primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </TruongInlineModal>
  );
}

export function TruongHinhAnhManageZone({ compact = false }: { compact?: boolean }) {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);

  if (!ctx?.isEditing) return null;

  const count = ctx.hinhanh.length;

  return (
    <>
      <div
        className={[
          "tdh-inline-upload-zone",
          "tdh-hinhanh-manage-zone",
          compact ? "tdh-hinhanh-manage-zone--toolbar" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className="tdh-inline-btn primary"
          onClick={() => setOpen(true)}
        >
          Quản lý ảnh
          {count > 0 ? (
            <span className="tdh-hinhanh-manage-zone-count">{count}</span>
          ) : null}
        </button>
      </div>

      <TruongHinhAnhManageDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

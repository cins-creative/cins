"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { adminCreateMonThi, adminSaveMonThi } from "@/app/admin/actions";
import { AdminMonThiThumb } from "@/components/admin/AdminMonThiThumb";
import { labelMonThiLoai, MON_THI_LOAI_LABELS } from "@/lib/truong/mon-thi-catalog";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import { defaultPlaceholderThumbnailId } from "@/lib/truong/mon-thi-thumbnail";

const STATUS_OPTIONS = [
  { value: "active", label: "active" },
  { value: "inactive", label: "inactive" },
  { value: "archived", label: "archived" },
] as const;

const LOAI_OPTIONS = Object.keys(MON_THI_LOAI_LABELS);

type Props = {
  /** Không truyền = tạo mới */
  row?: AdminMonThiRow;
  onCancel: () => void;
  onSaved: () => void;
};

export function AdminMonThiEditPanel({ row, onCancel, onSaved }: Props) {
  const isCreate = row == null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [ten, setTen] = useState(row?.ten ?? "");
  const [ma, setMa] = useState(row?.ma ?? "");
  const [loai, setLoai] = useState(row?.loai ?? "nang_khieu");
  const [trang_thai, setTrangThai] = useState(row?.trang_thai ?? "active");
  const [thumbnail_id, setThumbnailId] = useState(row?.thumbnail_id ?? "");
  const [id_bai_viet, setIdBaiViet] = useState(row?.id_bai_viet ?? "");

  useEffect(() => {
    if (!row) {
      setTen("");
      setMa("");
      setLoai("nang_khieu");
      setTrangThai("active");
      setThumbnailId("");
      setIdBaiViet("");
      setSaveMsg(null);
      return;
    }
    setTen(row.ten);
    setMa(row.ma ?? "");
    setLoai(row.loai ?? "nang_khieu");
    setTrangThai(row.trang_thai ?? "active");
    setThumbnailId(row.thumbnail_id ?? "");
    setIdBaiViet(row.id_bai_viet ?? "");
    setSaveMsg(null);
  }, [row?.id, row?.ten, row?.ma, row?.loai, row?.trang_thai, row?.thumbnail_id, row?.id_bai_viet]);

  const previewRow = useMemo((): AdminMonThiRow => {
    const loaiVal = loai.trim() || null;
    const thumb =
      thumbnail_id.trim() ||
      (isCreate ? defaultPlaceholderThumbnailId(loaiVal) : row?.thumbnail_id ?? null);
    return {
      id: row?.id ?? "__new__",
      ten: ten.trim() || "Môn mới",
      ma: ma.trim() || null,
      loai: loaiVal,
      trang_thai: trang_thai.trim() || null,
      thumbnail_id: thumb,
      id_bai_viet: id_bai_viet.trim() || null,
      thumbnail_src: row?.thumbnail_src ?? null,
      thumbnail_from_cover: row?.thumbnail_from_cover ?? false,
    };
  }, [row, isCreate, ten, ma, loai, trang_thai, thumbnail_id, id_bai_viet]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("ten", ten);
    fd.set("ma", ma);
    fd.set("loai", loai);
    fd.set("trang_thai", trang_thai);
    fd.set("thumbnail_id", thumbnail_id);
    fd.set("id_bai_viet", id_bai_viet);

    const r = isCreate
      ? await adminCreateMonThi(fd)
      : (() => {
          fd.set("id", row!.id);
          return adminSaveMonThi(fd);
        })();

    setSaving(false);
    if (r.ok) {
      setSaveMsg({ type: "ok", text: isCreate ? "Đã thêm môn thi." : "Đã lưu." });
      onSaved();
    } else {
      const msg = r.message ?? "Lưu thất bại.";
      setSaveMsg({ type: "err", text: msg });
    }
  }

  return (
    <form className="admin-edit-form" onSubmit={(e) => void onSave(e)}>
      {saveMsg ? (
        <p
          className={`admin-edit-form__msg admin-edit-form__msg--${saveMsg.type}`}
          role={saveMsg.type === "err" ? "alert" : "status"}
        >
          {saveMsg.text}
        </p>
      ) : null}

      <div className="admin-edit-form__fields">
        <div className="admin-mon-thi-edit-preview">
          <AdminMonThiThumb
            row={previewRow}
            uploadEnabled={!isCreate}
            onThumbnailChange={(id) => setThumbnailId(id)}
          />
          <div>
            {row ? (
              <p className="admin-mon-thi-edit-preview__id">
                <code>{row.id}</code>
              </p>
            ) : (
              <p className="form-hint">Lưu để tạo bản ghi — sau đó có thể tải ảnh thumbnail.</p>
            )}
            {previewRow.loai ? (
              <p className="form-hint">{labelMonThiLoai(previewRow.loai)}</p>
            ) : null}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tên môn thi *</label>
          <input
            className="form-input"
            type="text"
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mã (ma)</label>
          <input
            className="form-input"
            type="text"
            value={ma}
            onChange={(e) => setMa(e.target.value)}
            placeholder="hinh_hoa_chan_dung"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Loại *</label>
            <select
              className="form-select"
              value={loai}
              onChange={(e) => setLoai(e.target.value)}
              required
            >
              {LOAI_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {MON_THI_LOAI_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Trạng thái</label>
            <select
              className="form-select"
              value={trang_thai}
              onChange={(e) => setTrangThai(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {trang_thai &&
              !STATUS_OPTIONS.some((o) => o.value === trang_thai) ? (
                <option value={trang_thai}>{trang_thai}</option>
              ) : null}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Thumbnail ID</label>
          <input
            className="form-input"
            type="text"
            value={thumbnail_id}
            onChange={(e) => setThumbnailId(e.target.value)}
            placeholder="Để trống = plh_* theo loại"
          />
        </div>

        <div className="form-group">
          <label className="form-label">ID bài viết (hub)</label>
          <input
            className="form-input"
            type="text"
            value={id_bai_viet}
            onChange={(e) => setIdBaiViet(e.target.value)}
            placeholder="UUID article_bai_viet — để trống nếu chưa có"
            spellCheck={false}
          />
          <p className="form-hint">
            Phải là UUID hợp lệ và tồn tại trong article_bai_viet. Để trống nếu chưa liên kết bài.
          </p>
        </div>
      </div>

      <div className="admin-edit-form__footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? "Đang lưu…"
            : isCreate
              ? "Thêm môn thi"
              : "Lưu môn thi"}
        </button>
      </div>
    </form>
  );
}

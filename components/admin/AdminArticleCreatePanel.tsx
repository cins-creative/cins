"use client";

import { useState, type FormEvent } from "react";

import { adminCreateArticle } from "@/app/admin/actions";
import type { AdminArticleFilterOptions } from "@/lib/admin/articles-server";
import { ADMIN_ARTICLE_LOAI_OPTIONS } from "@/lib/admin/articles-server";

const STATUS_OPTIONS = [
  { value: "dang_viet", label: "dang_viet" },
  { value: "cho_review", label: "cho_review" },
  { value: "published", label: "published" },
  { value: "archived", label: "archived" },
  { value: "merged", label: "merged" },
] as const;

type Props = {
  filterOptions: AdminArticleFilterOptions;
  onCancel: () => void;
  onCreated: (id: string) => void;
};

export function AdminArticleCreatePanel({
  filterOptions,
  onCancel,
  onCreated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const [tieu_de, setTieuDe] = useState("");
  const [tieu_de_viet, setTieuDeViet] = useState("");
  const [tieu_de_eng, setTieuDeEng] = useState("");
  const [slug, setSlug] = useState("");
  const [loai_bai_viet, setLoaiBaiViet] = useState<string>("nghe");
  const [trang_thai, setTrangThai] = useState("dang_viet");
  const [tom_tat, setTomTat] = useState("");
  const [id_linh_vuc, setIdLinhVuc] = useState("");

  const needsLinhVuc = loai_bai_viet === "nghe";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaving(true);

    const fd = new FormData();
    fd.set("tieu_de", tieu_de);
    fd.set("tieu_de_viet", tieu_de_viet);
    fd.set("tieu_de_eng", tieu_de_eng);
    fd.set("slug", slug);
    fd.set("loai_bai_viet", loai_bai_viet);
    fd.set("trang_thai_noi_dung", trang_thai);
    fd.set("tom_tat", tom_tat);
    fd.set("id_linh_vuc", id_linh_vuc);

    const res = await adminCreateArticle(fd);
    setSaving(false);

    if (!res.ok) {
      setSaveMsg({ type: "err", text: res.message ?? "Tạo bài thất bại." });
      return;
    }

    setSaveMsg({ type: "ok", text: "Đã tạo bài viết." });
    onCreated(res.id);
  }

  return (
    <form className="admin-edit-form" onSubmit={(e) => void onSubmit(e)}>
      {saveMsg ? (
        <p
          className={`admin-edit-form__msg admin-edit-form__msg--${saveMsg.type}`}
          role={saveMsg.type === "err" ? "alert" : "status"}
        >
          {saveMsg.text}
        </p>
      ) : null}

      <p className="form-hint">
        Tạo bản ghi cơ bản trước. Sau khi lưu, mở panel chỉnh sửa để nhập nội dung, ảnh và
        meta đầy đủ.
      </p>

      <div className="admin-edit-form__fields">
        <div className="form-section">Thông tin bài mới</div>

        <div className="form-group">
          <label className="form-label">Tiêu đề chính *</label>
          <input
            className="form-input"
            type="text"
            value={tieu_de}
            onChange={(e) => setTieuDe(e.target.value)}
            required
            autoFocus
            placeholder="VD: Biên tập viên"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Loại bài viết *</label>
            <select
              className="form-select"
              value={loai_bai_viet}
              onChange={(e) => setLoaiBaiViet(e.target.value)}
              required
            >
              {ADMIN_ARTICLE_LOAI_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
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
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Slug (tùy chọn)</label>
          <input
            className="form-input"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Để trống → tự sinh từ tiêu đề"
            spellCheck={false}
          />
        </div>

        {needsLinhVuc ? (
          <div className="form-group">
            <label className="form-label">Lĩnh vực * (bài nghe)</label>
            <select
              className="form-select"
              value={id_linh_vuc}
              onChange={(e) => setIdLinhVuc(e.target.value)}
              required
            >
              <option value="">— Chọn lĩnh vực —</option>
              {filterOptions.linhVuc.map((lv) => (
                <option key={lv.id} value={lv.id}>
                  {lv.ten}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tiêu đề tiếng Việt</label>
            <input
              className="form-input"
              type="text"
              value={tieu_de_viet}
              onChange={(e) => setTieuDeViet(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tiêu đề tiếng Anh</label>
            <input
              className="form-input"
              type="text"
              value={tieu_de_eng}
              onChange={(e) => setTieuDeEng(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tóm tắt</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={tom_tat}
            onChange={(e) => setTomTat(e.target.value)}
          />
        </div>

        <p className="form-hint">
          Loại đã chọn: <strong>{loai_bai_viet}</strong>. Meta, thumbnail và nội dung HTML chỉnh
          sau khi tạo.
        </p>
      </div>

      <div className="admin-edit-form__footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Đang tạo…" : "Tạo bài viết"}
        </button>
      </div>
    </form>
  );
}

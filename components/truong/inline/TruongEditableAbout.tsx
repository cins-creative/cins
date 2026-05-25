"use client";

import { useCallback, useEffect, useState } from "react";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  normalizeTinhThanhForDb,
  TINH_THANH_OPTIONS,
} from "@/lib/truong/contact";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";

import "@/styles/article-draft-tiptap.css";

export function TruongEditableAbout() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [gioiThieu, setGioiThieu] = useState("<p></p>");
  const [website, setWebsite] = useState("");
  const [tenEn, setTenEn] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [tinhThanh, setTinhThanh] = useState("");
  const [dienThoai, setDienThoai] = useState("");
  const [email, setEmail] = useState("");

  const startEdit = useCallback(() => {
    if (!ctx) return;
    if (!ctx.editMode) ctx.setEditMode(true);
    setGioiThieu(ctx.school.gioi_thieu_truong?.trim() || "<p></p>");
    setWebsite(ctx.school.website ?? "");
    setTenEn(ctx.school.ten_tieng_anh ?? "");
    setDiaChi(ctx.school.dia_chi ?? "");
    setTinhThanh(normalizeTinhThanhForDb(ctx.school.tinh_thanh) ?? "");
    setDienThoai(ctx.school.dien_thoai ?? "");
    setEmail(ctx.school.email_lien_he ?? "");
    setOpen(true);
  }, [ctx]);

  useEffect(() => {
    if (!ctx?.canEdit) return;
    ctx.registerOpenSchoolAboutEditor(startEdit);
    return () => ctx.registerOpenSchoolAboutEditor(null);
  }, [ctx, startEdit]);

  if (!ctx?.canEdit) return null;

  async function save() {
    if (!ctx) return;
    const ok = await ctx.patchSchool({
      gioi_thieu_truong: normalizeTruongGioiThieuHtml(gioiThieu),
      website: website.trim() || null,
      ten_tieng_anh: tenEn.trim() || null,
      dia_chi: diaChi.trim() || null,
      tinh_thanh: normalizeTinhThanhForDb(tinhThanh),
      dien_thoai: dienThoai.trim() || null,
      email_lien_he: email.trim() || null,
    });
    if (ok) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="tdh-inline-text-btn"
        onClick={startEdit}
      >
        Sửa giới thiệu
      </button>
      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide"
        labelledBy="tdh-about-title"
      >
        <h3 id="tdh-about-title" className="tdh-inline-modal-title">
          Giới thiệu & liên hệ
        </h3>
        <label className="tdh-inline-field">
          <span>Tên tiếng Anh</span>
          <input value={tenEn} onChange={(e) => setTenEn(e.target.value)} />
        </label>
        <label className="tdh-inline-field">
          <span>Website</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
          />
        </label>
        <label className="tdh-inline-field">
          <span>Địa chỉ</span>
          <input
            value={diaChi}
            onChange={(e) => setDiaChi(e.target.value)}
            placeholder="Số nhà, đường, quận…"
          />
        </label>
        <label className="tdh-inline-field">
          <span>Tỉnh / thành phố</span>
          <select
            value={tinhThanh}
            onChange={(e) => setTinhThanh(e.target.value)}
          >
            {TINH_THANH_OPTIONS.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="tdh-inline-field">
          <span>Điện thoại</span>
          <input
            value={dienThoai}
            onChange={(e) => setDienThoai(e.target.value)}
            placeholder="028…"
            inputMode="tel"
          />
        </label>
        <label className="tdh-inline-field">
          <span>Email liên hệ</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuyensinh@…"
          />
        </label>
        <div className="tdh-inline-field tdh-inline-field--richtext">
          <span>Giới thiệu trường (hiển thị trong popup)</span>
          <div className="tdh-bai-dang-editor">
            <ArticleDraftContentEditor
              variant="truong-inline"
              hideHint
              value={gioiThieu}
              onChange={setGioiThieu}
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
            onClick={() => void save()}
          >
            Lưu
          </button>
        </div>
      </TruongInlineModal>
    </>
  );
}

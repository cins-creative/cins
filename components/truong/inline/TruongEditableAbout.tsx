"use client";

import { useCallback, useEffect, useState } from "react";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { TruongChiNhanhEditor } from "@/components/truong/tuyensinh/TruongChiNhanhEditor";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  emptyChiNhanh,
  normalizeChiNhanhList,
  normalizeFacebookUrl,
  primaryContactFromChiNhanh,
  resolveTruongChiNhanh,
} from "@/lib/truong/chi-nhanh";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";
import type { TruongChiNhanh } from "@/lib/truong/types";

import "@/styles/article-draft-tiptap.css";

type Props = {
  /** Ẩn nút mặc định — dùng `openSchoolAboutEditor` hoặc nút tùy chỉnh. */
  hideTrigger?: boolean;
};

export function TruongEditableAbout({ hideTrigger = false }: Props) {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [gioiThieu, setGioiThieu] = useState("<p></p>");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tenEn, setTenEn] = useState("");
  const [chiNhanh, setChiNhanh] = useState<TruongChiNhanh[]>([]);
  const [dienThoai, setDienThoai] = useState("");
  const [email, setEmail] = useState("");

  const startEdit = useCallback(() => {
    if (!ctx) return;
    if (!ctx.editMode) ctx.setEditMode(true);
    setGioiThieu(ctx.school.gioi_thieu_truong?.trim() || "<p></p>");
    setWebsite(ctx.school.website ?? "");
    setFacebook(ctx.school.facebook ?? "");
    setTenEn(ctx.school.ten_tieng_anh ?? "");
    const branches = resolveTruongChiNhanh(ctx.school);
    setChiNhanh(branches.length ? branches : [emptyChiNhanh()]);
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
    const normalizedBranches = normalizeChiNhanhList(chiNhanh);
    if (!normalizedBranches.length) {
      ctx.showToast("Cần ít nhất một chi nhánh có tên và địa chỉ.");
      return;
    }
    const primary = primaryContactFromChiNhanh(normalizedBranches);
    const ok = await ctx.patchSchool({
      gioi_thieu_truong: normalizeTruongGioiThieuHtml(gioiThieu),
      website: website.trim() || null,
      facebook: normalizeFacebookUrl(facebook),
      ten_tieng_anh: tenEn.trim() || null,
      chi_nhanh: normalizedBranches,
      dia_chi: primary.dia_chi,
      tinh_thanh: primary.tinh_thanh,
      dien_thoai: dienThoai.trim() || null,
      email_lien_he: email.trim() || null,
    });
    if (ok) setOpen(false);
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          className="tdh-inline-text-btn"
          onClick={startEdit}
        >
          Sửa giới thiệu
        </button>
      )}
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
          <span>Facebook</span>
          <input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="facebook.com/truong hoặc URL fanpage"
          />
        </label>
        <div className="tdh-inline-field">
          <span>Chi nhánh / cơ sở</span>
          <TruongChiNhanhEditor branches={chiNhanh} onChange={setChiNhanh} />
        </div>
        <label className="tdh-inline-field">
          <span>Điện thoại tổng đài</span>
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

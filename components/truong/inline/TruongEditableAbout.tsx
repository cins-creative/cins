"use client";

import { useCallback, useEffect, useState } from "react";

import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import { TruongChiNhanhEditor } from "@/components/truong/tuyensinh/TruongChiNhanhEditor";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  hydrateChiNhanhFromSchool,
  normalizeChiNhanhList,
  orgContactFromPrimaryChiNhanh,
} from "@/lib/truong/chi-nhanh";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";
import type { TruongChiNhanh } from "@/lib/truong/types";

type Props = {
  /** Ẩn nút mặc định — dùng `openSchoolAboutEditor` hoặc nút tùy chỉnh. */
  hideTrigger?: boolean;
};

export function TruongEditableAbout({ hideTrigger = false }: Props) {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [gioiThieu, setGioiThieu] = useState("<p></p>");
  const [tenEn, setTenEn] = useState("");
  const [chiNhanh, setChiNhanh] = useState<TruongChiNhanh[]>([]);

  const startEdit = useCallback(() => {
    if (!ctx) return;
    if (!ctx.editMode) ctx.setEditMode(true);
    setGioiThieu(ctx.school.gioi_thieu_truong?.trim() || "<p></p>");
    setTenEn(ctx.school.ten_tieng_anh ?? "");
    setChiNhanh(hydrateChiNhanhFromSchool(ctx.school));
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
    const orgContact = orgContactFromPrimaryChiNhanh(normalizedBranches);
    const ok = await ctx.patchSchool({
      gioi_thieu_truong: normalizeTruongGioiThieuHtml(gioiThieu),
      ten_tieng_anh: tenEn.trim() || null,
      chi_nhanh: normalizedBranches,
      dia_chi: orgContact.dia_chi,
      tinh_thanh: orgContact.tinh_thanh,
      dien_thoai: orgContact.dien_thoai,
      email_lien_he: orgContact.email_lien_he,
      website: orgContact.website,
      facebook: orgContact.facebook,
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
        <div className="tdh-inline-field">
          <span>Chi nhánh / cơ sở</span>
          <TruongChiNhanhEditor branches={chiNhanh} onChange={setChiNhanh} />
        </div>
        <div className="tdh-inline-field tdh-inline-field--richtext">
          <span>Giới thiệu trường (hiển thị trong popup)</span>
          <GioiThieuContentEditor value={gioiThieu} onChange={setGioiThieu} />
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

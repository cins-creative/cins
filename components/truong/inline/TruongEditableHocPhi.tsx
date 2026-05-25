"use client";

import { useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { formatHocPhiLabel } from "@/lib/truong/display";

export function TruongEditableHocPhi() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [tu, setTu] = useState("");
  const [den, setDen] = useState("");
  const [coKtx, setCoKtx] = useState(false);
  const [ktxGia, setKtxGia] = useState("");

  if (!ctx?.isEditing) return null;

  const label =
    ctx.stats.hocPhiLabel ??
    formatHocPhiLabel(ctx.school.hoc_phi_nam_tu, ctx.school.hoc_phi_nam_den);

  function start() {
    if (!ctx) return;
    setTu(ctx.school.hoc_phi_nam_tu?.toString() ?? "");
    setDen(ctx.school.hoc_phi_nam_den?.toString() ?? "");
    setCoKtx(!!ctx.school.co_ktx);
    setKtxGia(ctx.school.ktx_gia_thang?.toString() ?? "");
    setOpen(true);
  }

  async function save() {
    if (!ctx) return;
    const hoc_phi_nam_tu = tu ? Number(tu) : null;
    const hoc_phi_nam_den = den ? Number(den) : null;
    const ktx_gia_thang = ktxGia ? Number(ktxGia) : null;
    const ok = await ctx.patchSchool({
      hoc_phi_nam_tu,
      hoc_phi_nam_den,
      co_ktx: coKtx,
      ktx_gia_thang,
    });
    if (ok) {
      ctx.setStats((s) => ({
        ...s,
        hocPhiLabel: formatHocPhiLabel(hoc_phi_nam_tu, hoc_phi_nam_den),
      }));
      setOpen(false);
    }
  }

  return (
    <>
      <div className="tdh-list-stat tdh-list-stat-editable">
        <div className="tdh-list-stat-label">
          Học phí
          <button
            type="button"
            className="tdh-inline-chip-btn"
            onClick={start}
            aria-label="Sửa học phí"
          >
            Sửa
          </button>
        </div>
        <div
          className={`tdh-list-stat-value is-text${(label?.length ?? 0) > 18 ? " is-text-long" : ""}`}
        >
          {label ?? "—"}
        </div>
      </div>
      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal-sm"
      >
        <h3 className="tdh-inline-modal-title">Học phí & KTX</h3>
        <label className="tdh-inline-field">
          <span>Học phí từ (triệu/năm)</span>
          <input value={tu} onChange={(e) => setTu(e.target.value)} />
        </label>
        <label className="tdh-inline-field">
          <span>Học phí đến</span>
          <input value={den} onChange={(e) => setDen(e.target.value)} />
        </label>
        <label className="tdh-inline-check">
          <input
            type="checkbox"
            checked={coKtx}
            onChange={(e) => setCoKtx(e.target.checked)}
          />
          Có KTX
        </label>
        {coKtx ? (
          <label className="tdh-inline-field">
            <span>Giá KTX (triệu/tháng)</span>
            <input value={ktxGia} onChange={(e) => setKtxGia(e.target.value)} />
          </label>
        ) : null}
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

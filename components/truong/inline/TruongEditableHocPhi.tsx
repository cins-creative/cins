"use client";

import { useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { formatHocPhiLabel } from "@/lib/truong/display";

type Props = {
  variant?: "default" | "sidebar";
};

export function TruongEditableHocPhi({ variant = "default" }: Props) {
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

  const ktxLabel = ctx.school.co_ktx
    ? ctx.school.ktx_gia_thang
      ? `Có · ~${ctx.school.ktx_gia_thang.toLocaleString("vi-VN")} đ/tháng`
      : "Có"
    : "Không";

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
    const ktx_gia_thang = ktxGia ? Number(ktxGia) : null;
    const patch =
      variant === "sidebar"
        ? { co_ktx: coKtx, ktx_gia_thang }
        : {
            hoc_phi_nam_tu: tu ? Number(tu) : null,
            hoc_phi_nam_den: den ? Number(den) : null,
            co_ktx: coKtx,
            ktx_gia_thang,
          };
    const ok = await ctx.patchSchool(patch);
    if (ok) {
      if (variant !== "sidebar") {
        ctx.setStats((s) => ({
          ...s,
          hocPhiLabel: formatHocPhiLabel(
            patch.hoc_phi_nam_tu ?? null,
            patch.hoc_phi_nam_den ?? null,
          ),
        }));
      }
      setOpen(false);
    }
  }

  const editBtnLabel =
    variant === "sidebar" ? "Sửa KTX" : "Sửa";
  const editBtnAria =
    variant === "sidebar" ? "Sửa ký túc xá" : "Sửa học phí và KTX";

  const editBtn = (
    <button
      type="button"
      className="tdh-inline-chip-btn"
      onClick={start}
      aria-label={editBtnAria}
    >
      {editBtnLabel}
    </button>
  );

  return (
    <>
      {variant === "sidebar" ? (
        <div className="ss-stat-editable-row">
          <div className="lbl">
            Ký túc xá
            {editBtn}
          </div>
          <div className="val text">{ktxLabel}</div>
        </div>
      ) : (
        <div className="tdh-list-stat tdh-list-stat-editable">
          <div className="tdh-list-stat-label">
            Học phí
            {editBtn}
          </div>
          <div
            className={`tdh-list-stat-value is-text${(label?.length ?? 0) > 18 ? " is-text-long" : ""}`}
          >
            {label ?? "—"}
          </div>
        </div>
      )}
      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal-sm"
      >
        <h3 className="tdh-inline-modal-title">
          {variant === "sidebar" ? "Ký túc xá" : "Học phí & KTX"}
        </h3>
        {variant !== "sidebar" ? (
          <>
            <label className="tdh-inline-field">
              <span>Học phí từ (triệu/năm)</span>
              <input value={tu} onChange={(e) => setTu(e.target.value)} />
            </label>
            <label className="tdh-inline-field">
              <span>Học phí đến</span>
              <input value={den} onChange={(e) => setDen(e.target.value)} />
            </label>
          </>
        ) : null}
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

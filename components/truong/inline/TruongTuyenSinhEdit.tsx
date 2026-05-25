"use client";

import { useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { truongInlineFetch } from "@/lib/truong/inline-api";
import { formatDiemChuan } from "@/lib/truong/diem-chuan";
import { mergeTuyenSinhIntoPrograms } from "@/lib/truong/merge-programs-tuyen-sinh";
import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

export function TruongTuyenSinhRowEdit({ row }: { row: TruongTuyenSinhNamRow }) {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [chi_tieu, setChiTieu] = useState("");
  const [diem_chuan, setDiemChuan] = useState("");
  const [tinh_trang, setTinhTrang] = useState("");

  if (!ctx?.isEditing) return null;

  function start() {
    setChiTieu(row.chi_tieu?.toString() ?? "");
    setDiemChuan(row.diem_chuan?.toString() ?? "");
    setTinhTrang(row.tinh_trang ?? "");
    setOpen(true);
  }

  async function save() {
    if (!ctx) return;
    const body = {
      chi_tieu: chi_tieu ? Number(chi_tieu) : null,
      diem_chuan: diem_chuan ? Number(diem_chuan) : null,
      tinh_trang: tinh_trang.trim() || null,
    };
    const prev = ctx.tuyenSinh;
    const prevPrograms = ctx.programs;
    ctx.setTuyenSinh((list) =>
      list.map((r) => (r.id === row.id ? { ...r, ...body } : r)),
    );
    ctx.setPrograms((list) =>
      mergeTuyenSinhIntoPrograms(list, [{ ...row, ...body }]),
    );
    const res = await truongInlineFetch(ctx.orgId, `/tuyen-sinh/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      ctx.setTuyenSinh(prev);
      ctx.setPrograms(prevPrograms);
      ctx.showToast("Lưu thất bại");
      return;
    }
    ctx.showToast("Đã lưu tuyển sinh");
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="tdh-inline-chip-btn" onClick={start}>
        Sửa
      </button>
      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal-sm"
      >
        <h3 className="tdh-inline-modal-title">
          {row.nganhTitle ?? "Chỉ tiêu"} — {row.nam}
        </h3>
        <label className="tdh-inline-field">
          <span>Chỉ tiêu</span>
          <input value={chi_tieu} onChange={(e) => setChiTieu(e.target.value)} />
        </label>
        <label className="tdh-inline-field">
          <span>Điểm chuẩn</span>
          <input
            value={diem_chuan}
            onChange={(e) => setDiemChuan(e.target.value)}
            placeholder={formatDiemChuan(row.diem_chuan) ?? ""}
          />
        </label>
        <label className="tdh-inline-field">
          <span>Tình trạng</span>
          <input
            value={tinh_trang}
            onChange={(e) => setTinhTrang(e.target.value)}
          />
        </label>
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

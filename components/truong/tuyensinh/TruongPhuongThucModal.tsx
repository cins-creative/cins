"use client";

import { useEffect, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  readTruongInlineError,
  truongInlineFetch,
} from "@/lib/truong/inline-api";
import { labelPhuongThuc } from "@/lib/truong/phuong-thuc";
import { PhuongThucEnumSelect } from "@/components/truong/PhuongThucEnumSelect";
import { parseTieuChiRows } from "@/lib/truong/tieu-chi";
import type { TruongNganhProgram, TruongPhuongThuc } from "@/lib/truong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  editing: TruongPhuongThuc | null;
  tuyenSinhNamId: string | null;
  programs: TruongNganhProgram[];
};

function tieuChiToText(tieu_chi: unknown): string {
  const rows = parseTieuChiRows(tieu_chi);
  if (!rows.length) return "";
  return rows.map((r) => (r.score ? `${r.name}: ${r.score}` : r.name)).join("\n");
}

export function TruongPhuongThucModal({
  open,
  onClose,
  editing,
  tuyenSinhNamId,
  programs,
}: Props) {
  const ctx = useTruongInlineEdit();
  const [ten, setTen] = useState("nang_khieu");
  const [nganhScope, setNganhScope] = useState("all");
  const [chiTieu, setChiTieu] = useState("");
  const [dieuKien, setDieuKien] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTen(editing.ten_phuong_thuc ?? "nang_khieu");
      const ids = editing.id_nganh_ap_dung ?? [];
      setNganhScope(
        editing.ap_dung_tat_ca_nganh
          ? "all"
          : ids[0]
            ? ids[0]
            : "all",
      );
      setChiTieu(editing.chi_tieu_phuong_thuc?.toString() ?? "");
      setDieuKien(tieuChiToText(editing.tieu_chi));
    } else {
      setTen("nang_khieu");
      setNganhScope("all");
      setChiTieu("");
      setDieuKien("");
    }
  }, [open, editing]);

  async function save() {
    if (!ctx || !tuyenSinhNamId) return;
    setSaving(true);
    const ap_dung_tat_ca_nganh = nganhScope === "all";
    const body = {
      ten_phuong_thuc: ten,
      ap_dung_tat_ca_nganh,
      id_nganh_ap_dung: ap_dung_tat_ca_nganh ? null : [nganhScope],
      chi_tieu_phuong_thuc: chiTieu.trim() ? Number(chiTieu) : null,
      dieu_kien: dieuKien.trim() || null,
    };

    const res = editing
      ? await truongInlineFetch(ctx.orgId, `/phuong-thuc/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await truongInlineFetch(ctx.orgId, "/phuong-thuc", {
          method: "POST",
          body: JSON.stringify({
            ...body,
            id_tuyen_sinh_nam: tuyenSinhNamId,
          }),
        });

    setSaving(false);
    if (!res.ok) {
      ctx.showToast(await readTruongInlineError(res));
      return;
    }

    const json = (await res.json()) as { row?: Record<string, unknown> };
    const row = json.row;
    if (row?.id) {
      const next: TruongPhuongThuc = {
        id: String(row.id),
        ten_phuong_thuc: (row.ten_phuong_thuc as string) ?? ten,
        chi_tieu_phuong_thuc:
          typeof row.chi_tieu_phuong_thuc === "number"
            ? row.chi_tieu_phuong_thuc
            : null,
        ap_dung_tat_ca_nganh: Boolean(row.ap_dung_tat_ca_nganh),
        id_nganh_ap_dung: Array.isArray(row.id_nganh_ap_dung)
          ? (row.id_nganh_ap_dung as string[])
          : null,
        id_cau_hinh_khoi: (row.id_cau_hinh_khoi as string) ?? null,
        tieu_chi: row.tieu_chi,
      };
      ctx.setTuyenSinh((list) =>
        list.map((r) => {
          const pts = r.phuongThuc;
          if (editing) {
            if (!pts.some((p) => p.id === editing.id)) return r;
            return {
              ...r,
              phuongThuc: pts.map((p) => (p.id === editing.id ? next : p)),
            };
          }
          if (r.id !== tuyenSinhNamId) return r;
          return { ...r, phuongThuc: [...pts, next] };
        }),
      );
    }
    ctx.showToast(editing ? "Đã cập nhật phương thức" : "Đã thêm phương thức");
    onClose();
  }

  const titleId = "tdh-phuong-thuc-modal-title";

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-calc-config-modal"
      labelledBy={titleId}
    >
      <h3 id={titleId} className="tdh-inline-modal-title">
        {editing ? "Sửa phương thức xét tuyển" : "Thêm phương thức xét tuyển"}
      </h3>

      <section className="tdh-calc-config-section">
        <PhuongThucEnumSelect
          id={`${titleId}-pt`}
          value={ten}
          onChange={setTen}
        />
        <p className="tdh-inline-field-hint" style={{ marginTop: 8 }}>
          Danh mục chuẩn CINs — mở rộng enum trên DB khi có phương thức mới toàn
          hệ thống.
        </p>
      </section>

      <label className="tdh-inline-field">
        <span>Áp dụng cho ngành</span>
        <select value={nganhScope} onChange={(e) => setNganhScope(e.target.value)}>
          <option value="all">Tất cả ngành</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nganhTitle}
            </option>
          ))}
        </select>
      </label>

      <label className="tdh-inline-field">
        <span>Chỉ tiêu (SV)</span>
        <input
          type="number"
          value={chiTieu}
          onChange={(e) => setChiTieu(e.target.value)}
          placeholder="Để trống nếu chưa xác định"
        />
      </label>

      <label className="tdh-inline-field">
        <span>Điều kiện xét tuyển</span>
        <textarea
          rows={4}
          value={dieuKien}
          onChange={(e) => setDieuKien(e.target.value)}
          placeholder={
            editing
              ? labelPhuongThuc(editing.ten_phuong_thuc)
              : "VD: GPA THPT ≥ 6.5, Bài thi năng khiếu ≥ 12.0..."
          }
        />
        <span className="tdh-inline-field-hint">
          Mỗi dòng một điều kiện; có thể dùng dạng Tên: Giá trị
        </span>
      </label>

      <div className="tdh-inline-modal-actions">
        <button type="button" className="tdh-inline-btn ghost" onClick={onClose}>
          Hủy
        </button>
        <button
          type="button"
          className="tdh-inline-btn primary"
          disabled={saving || !tuyenSinhNamId}
          onClick={() => void save()}
        >
          {saving ? "Đang lưu…" : "Lưu phương thức"}
        </button>
      </div>
    </TruongInlineModal>
  );
}

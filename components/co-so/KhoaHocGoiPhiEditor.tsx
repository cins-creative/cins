"use client";

import { Plus, Trash2 } from "lucide-react";

import type { LoaiMoHinhKhoa } from "@/lib/to-chuc/khoa-hoc-types";
import type { GoiHocPhiDraft } from "@/lib/to-chuc/khoa-hoc-goi-phi";
import { emptyGoiHocPhiDraft, newGoiHocPhiId } from "@/lib/to-chuc/khoa-hoc-goi-phi";

type Props = {
  packages: GoiHocPhiDraft[];
  loaiMoHinh: LoaiMoHinhKhoa;
  disabled?: boolean;
  onChange: (next: GoiHocPhiDraft[]) => void;
};

export function KhoaHocGoiPhiEditor({
  packages,
  loaiMoHinh,
  disabled = false,
  onChange,
}: Props) {
  const feeHint =
    loaiMoHinh === "lien_tuc_theo_thang" ? "VNĐ (gói)" : "VNĐ/khóa";

  function updatePackage(id: string, patch: Partial<GoiHocPhiDraft>) {
    onChange(
      packages.map((pkg) => (pkg.id === id ? { ...pkg, ...patch } : pkg)),
    );
  }

  function addPackage() {
    onChange([...packages, emptyGoiHocPhiDraft()]);
  }

  function removePackage(id: string) {
    if (packages.length <= 1) {
      onChange([{ ...emptyGoiHocPhiDraft(), id: newGoiHocPhiId() }]);
      return;
    }
    onChange(packages.filter((pkg) => pkg.id !== id));
  }

  return (
    <fieldset className="cso-kh-field cso-kh-goi-phi">
      <legend className="cso-kh-label">Gói học phí</legend>
      <p className="cso-kh-field-hint cso-kh-goi-phi-hint">
        Thêm nhiều gói cho cùng khóa — VD: 1 tháng 900K, 2 tháng 1.8 tr, 3
        tháng 2.5 tr (số buổi &amp; phút/buổi riêng từng gói).
      </p>
      <div className="cso-kh-goi-phi-list">
        {packages.map((pkg, index) => (
          <div key={pkg.id} className="cso-kh-goi-phi-item">
            <div className="cso-kh-goi-phi-item-head">
              <span className="cso-kh-goi-phi-item-idx">Gói {index + 1}</span>
              <button
                type="button"
                className="cso-kh-goi-phi-remove"
                aria-label={`Xóa gói ${index + 1}`}
                disabled={disabled}
                onClick={() => removePackage(pkg.id)}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            <label className="cso-kh-goi-phi-field">
              <span className="cso-kh-goi-phi-k">Tên gói</span>
              <input
                type="text"
                className="cso-kh-input"
                value={pkg.tenGoi}
                disabled={disabled}
                placeholder={
                  loaiMoHinh === "lien_tuc_theo_thang"
                    ? "VD: 1 tháng"
                    : "VD: Khóa cơ bản"
                }
                onChange={(e) =>
                  updatePackage(pkg.id, { tenGoi: e.target.value })
                }
              />
            </label>
            <div className="cso-kh-field-row cso-kh-goi-phi-metrics">
              <label className="cso-kh-goi-phi-field">
                <span className="cso-kh-goi-phi-k">Học phí ({feeHint})</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="cso-kh-input"
                  value={pkg.hocPhi}
                  disabled={disabled}
                  placeholder="900000"
                  onChange={(e) =>
                    updatePackage(pkg.id, { hocPhi: e.target.value })
                  }
                />
              </label>
              <label className="cso-kh-goi-phi-field">
                <span className="cso-kh-goi-phi-k">Số buổi</span>
                <input
                  type="number"
                  min={0}
                  className="cso-kh-input"
                  value={pkg.soBuoi}
                  disabled={disabled}
                  placeholder="24"
                  onChange={(e) =>
                    updatePackage(pkg.id, { soBuoi: e.target.value })
                  }
                />
              </label>
              <label className="cso-kh-goi-phi-field">
                <span className="cso-kh-goi-phi-k">Phút / buổi</span>
                <input
                  type="number"
                  min={0}
                  className="cso-kh-input"
                  value={pkg.phutMoiBuoi}
                  disabled={disabled}
                  placeholder="180"
                  onChange={(e) =>
                    updatePackage(pkg.id, { phutMoiBuoi: e.target.value })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="cso-kh-goi-phi-add"
        disabled={disabled}
        onClick={addPackage}
      >
        <Plus size={14} aria-hidden />
        Thêm gói học phí
      </button>
    </fieldset>
  );
}

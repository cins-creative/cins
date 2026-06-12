"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  HINH_THUC_LOP_OPTIONS,
  TRANG_THAI_LOP_OPTIONS,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  HinhThucLop,
  LopHocDetailData,
  LopHocFormInput,
  LoaiMoHinhKhoa,
  TrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  khoaId: string;
  loaiMoHinh: LoaiMoHinhKhoa;
  tenKhoaHoc: string;
  editing?: LopHocDetailData | null;
  isMockup?: boolean;
  onSaved: (payload: LopHocFormInput) => void;
};

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function LopHocEditModal({
  open,
  onClose,
  orgId,
  khoaId,
  loaiMoHinh,
  tenKhoaHoc,
  editing = null,
  isMockup = false,
  onSaved,
}: Props) {
  const isEdit = Boolean(editing);
  const titleId = useId();
  const [maLop, setMaLop] = useState("");
  const [lichHoc, setLichHoc] = useState("");
  const [ngayKhaiGiang, setNgayKhaiGiang] = useState("");
  const [hinhThuc, setHinhThuc] = useState<HinhThucLop>("truc_tiep");
  const [giaoVienText, setGiaoVienText] = useState("");
  const [slotToiDa, setSlotToiDa] = useState("");
  const [trangThaiLop, setTrangThaiLop] =
    useState<TrangThaiLop>("sap_khai_giang");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setMaLop("");
    setLichHoc("");
    setNgayKhaiGiang("");
    setHinhThuc("truc_tiep");
    setGiaoVienText("");
    setSlotToiDa("");
    setTrangThaiLop("sap_khai_giang");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset();
      return;
    }
    setMaLop(editing.maLop ?? "");
    setLichHoc(editing.lichHoc ?? editing.tenLop ?? "");
    setNgayKhaiGiang(editing.ngayKhaiGiang ?? "");
    setHinhThuc(editing.hinhThuc);
    setGiaoVienText(
      editing.giaoVienText ??
        (editing.giaoVien.pendingProfile && !editing.giaoVien.verified
          ? editing.giaoVien.ten
          : ""),
    );
    setSlotToiDa(
      editing.slotToiDa != null ? String(editing.slotToiDa) : "",
    );
    setTrangThaiLop(editing.trangThaiLop);
    setError(null);
  }, [open, editing, reset]);

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function buildPayload(): LopHocFormInput {
    return {
      maLop: maLop.trim() || null,
      hinhThuc,
      lichHoc: lichHoc.trim() || null,
      ngayKhaiGiang:
        loaiMoHinh === "cohort_co_dinh"
          ? ngayKhaiGiang.trim() || null
          : ngayKhaiGiang.trim() || null,
      giaoVienText: giaoVienText.trim() || null,
      slotToiDa: parseOptionalInt(slotToiDa),
      trangThaiLop,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (loaiMoHinh === "cohort_co_dinh" && !ngayKhaiGiang.trim()) {
      setError("Vui lòng chọn ngày khai giảng.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = buildPayload();

    if (isMockup) {
      onSaved(payload);
      setSubmitting(false);
      handleClose();
      return;
    }
    const url = isEdit
      ? `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoaId)}/lop/${encodeURIComponent(editing!.id)}`
      : `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoaId)}/lop`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Không lưu được lớp học.");
      }
      onSaved(payload);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không lưu được lớp học.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={handleClose}
      className="tdh-inline-modal--wide cso-kh-create-modal"
      labelledBy={titleId}
    >
      <div className="cso-kh-create-head">
        <h2 id={titleId} className="tdh-inline-modal-title">
          {isEdit ? "Sửa lớp học" : "Thêm lớp học"}
        </h2>
        <button
          type="button"
          className="cso-kh-create-close"
          aria-label="Đóng"
          onClick={handleClose}
          disabled={submitting}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <form className="cso-kh-create-form" onSubmit={handleSubmit}>
        <p className="cso-kh-field-hint" style={{ marginTop: 0 }}>
          Khóa: <b>{tenKhoaHoc}</b>
        </p>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Mã lớp</span>
          <input
            type="text"
            className="cso-kh-input"
            value={maLop}
            onChange={(e) => setMaLop(e.target.value)}
            placeholder="VD: HHK30"
            maxLength={48}
          />
          <p className="cso-kh-field-hint">
            Tuỳ chọn. Để trống sẽ tự sinh mã nội bộ.
          </p>
        </label>

        {loaiMoHinh === "cohort_co_dinh" ? (
          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Ngày khai giảng <span className="cso-kh-req">*</span>
            </span>
            <input
              type="date"
              className="cso-kh-input"
              value={ngayKhaiGiang}
              onChange={(e) => setNgayKhaiGiang(e.target.value)}
              required
            />
          </label>
        ) : (
          <label className="cso-kh-field">
            <span className="cso-kh-label">Lịch / ca học</span>
            <input
              type="text"
              className="cso-kh-input"
              value={lichHoc}
              onChange={(e) => setLichHoc(e.target.value)}
              placeholder="VD: Ca tối · T2-4-6 — 18:00–21:00"
            />
            <p className="cso-kh-field-hint">
              Hiển thị dưới mã lớp và trong dòng lịch học.
            </p>
          </label>
        )}

        <fieldset className="cso-kh-field">
          <legend className="cso-kh-label">Hình thức</legend>
          <div className="cso-kh-model-grid">
            {HINH_THUC_LOP_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cso-kh-model-opt${hinhThuc === opt.value ? " on" : ""}`}
              >
                <input
                  type="radio"
                  name="hinhThucLop"
                  value={opt.value}
                  checked={hinhThuc === opt.value}
                  onChange={() => setHinhThuc(opt.value)}
                />
                <span className="cso-kh-model-title">{opt.label}</span>
                <span className="cso-kh-model-hint">{opt.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Giảng viên</span>
          <input
            type="text"
            className="cso-kh-input"
            value={giaoVienText}
            onChange={(e) => setGiaoVienText(e.target.value)}
            placeholder="Tên giảng viên phụ trách lớp"
          />
        </label>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Sĩ số tối đa</span>
          <input
            type="number"
            className="cso-kh-input"
            value={slotToiDa}
            onChange={(e) => setSlotToiDa(e.target.value)}
            min={1}
            placeholder="VD: 12"
          />
        </label>

        <label className="cso-kh-field">
          <span className="cso-kh-label">Trạng thái lớp</span>
          <select
            className="cso-kh-input"
            value={trangThaiLop}
            onChange={(e) =>
              setTrangThaiLop(e.target.value as TrangThaiLop)
            }
          >
            {TRANG_THAI_LOP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="cso-kh-err">{error}</p> : null}

        <div className="cso-kh-create-actions">
          <button
            type="button"
            className="cso-kh-btn cso-kh-btn--ghost"
            onClick={handleClose}
            disabled={submitting}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="cso-kh-btn cso-kh-btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="tdh-spin" aria-hidden />
                Đang lưu…
              </>
            ) : isEdit ? (
              "Lưu lớp"
            ) : (
              "Thêm lớp"
            )}
          </button>
        </div>
      </form>
    </TruongInlineModal>
  );
}

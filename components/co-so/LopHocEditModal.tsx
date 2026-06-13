"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  CoSoGiaoVienPicker,
  type CoSoGiaoVienPick,
} from "@/components/co-so/CoSoGiaoVienPicker";
import { LichCaHocFields } from "@/components/co-so/LichCaHocFields";
import {
  HINH_THUC_LOP_OPTIONS,
  TRANG_THAI_LOP_OPTIONS,
} from "@/lib/to-chuc/khoa-hoc-labels";
import { isDefaultLichHoc, composeLichCaHocFromParts } from "@/lib/to-chuc/lich-ca-hoc-form";
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
  const [giaoVienUser, setGiaoVienUser] = useState<CoSoGiaoVienPick | null>(null);
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
    setGiaoVienUser(null);
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
    const rawLich = composeLichCaHocFromParts(editing.tenLop, editing.lichHoc);
    setLichHoc(isDefaultLichHoc(rawLich) ? "" : rawLich);
    setNgayKhaiGiang(editing.ngayKhaiGiang ?? "");
    setHinhThuc(editing.hinhThuc);
    const gvKey = editing.giaoVien.key;
    const isUserKey =
      gvKey &&
      !gvKey.startsWith("text:") &&
      !gvKey.startsWith("lop:");
    if (isUserKey) {
      setGiaoVienUser({
        userId: gvKey,
        tenHienThi: editing.giaoVien.ten,
        slug: editing.giaoVien.slug ?? gvKey,
        avatarId: editing.giaoVien.avatarId,
      });
      setGiaoVienText("");
    } else {
      setGiaoVienUser(null);
      setGiaoVienText(
        editing.giaoVienText ??
          (editing.giaoVien.pendingProfile && !editing.giaoVien.verified
            ? editing.giaoVien.ten
            : ""),
      );
    }
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
      ngayKhaiGiang: ngayKhaiGiang.trim() || null,
      giaoVienPhuTrach: giaoVienUser?.userId ?? null,
      giaoVienText: giaoVienUser ? null : giaoVienText.trim() || null,
      slotToiDa: parseOptionalInt(slotToiDa),
      trangThaiLop,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!ngayKhaiGiang.trim()) {
      setError("Vui lòng chọn ngày khai giảng — mốc sẽ hiện trên timeline thông báo.");
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
        <div className="cso-kh-create-body">
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
          <p className="cso-kh-field-hint">
            Mỗi lớp có ngày riêng — tự động hiện trên mốc thông báo bên phải.
          </p>
        </label>

        <div className="cso-kh-field">
          <span className="cso-kh-label">Lịch / ca học</span>
          <LichCaHocFields value={lichHoc} onChange={setLichHoc} />
          {loaiMoHinh === "cohort_co_dinh" ? (
            <p className="cso-kh-field-hint">
              Tuỳ chọn — bổ sung ca và khung giờ cố định của lớp cohort.
            </p>
          ) : (
            <p className="cso-kh-field-hint">
              Khóa liên tục: mô tả ca cụ thể (VD ca tối T2-4-6). Để trống sẽ
              hiển thị «Khai giảng hàng tuần».
            </p>
          )}
        </div>

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

        <div className="cso-kh-field">
          <span className="cso-kh-label">Giảng viên</span>
          <CoSoGiaoVienPicker
            orgId={orgId}
            value={giaoVienUser}
            onChange={setGiaoVienUser}
            manualText={giaoVienText}
            onManualTextChange={setGiaoVienText}
            disabled={submitting}
          />
        </div>

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
        </div>

        <div className="cso-kh-create-foot">
          <button
            type="button"
            className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
            onClick={handleClose}
            disabled={submitting}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="cso-kh-foot-btn cso-kh-foot-btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="tdh-spin" aria-hidden />
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

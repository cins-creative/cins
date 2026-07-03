"use client";

import { EyeOff, Globe, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  HINH_THUC_LOP_OPTIONS,
  LOAI_MO_HINH_OPTIONS,
  TRINH_DO_OPTIONS,
  TRANG_THAI_KHOA_OPTIONS,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  CapNhatKhoaHocInput,
  HinhThucLop,
  KhoaHocCardData,
  KhoaHocCheDoHienThi,
  LoaiMoHinhKhoa,
  TaoKhoaHocInput,
  TrinhDoDauVao,
  TrangThaiKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  open: boolean;
  orgId: string;
  orgDiaChi?: string | null;
  editing?: KhoaHocCardData | null;
  onClose: () => void;
  onCreated?: (khoa: KhoaHocCardData) => void;
  onUpdated?: (khoa: KhoaHocCardData) => void;
};

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalMoney(raw: string): number | null {
  const t = raw.trim().replace(/\./g, "").replace(/,/g, "");
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function needsDiaChi(hinhThuc: HinhThucLop): boolean {
  return hinhThuc === "truc_tiep" || hinhThuc === "ket_hop";
}

type CoverDraft = {
  imageId: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

export function KhoaHocCreateModal({
  open,
  orgId,
  orgDiaChi = null,
  editing = null,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const isEdit = Boolean(editing);
  const titleId = useId();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [tenKhoaHoc, setTenKhoaHoc] = useState("");
  const [loaiMoHinh, setLoaiMoHinh] =
    useState<LoaiMoHinhKhoa>("lien_tuc_theo_thang");
  const [moTa, setMoTa] = useState("");
  const [ngayKhaiGiang, setNgayKhaiGiang] = useState("");
  const [hinhThuc, setHinhThuc] = useState<HinhThucLop>("truc_tiep");
  const [diaChiHoc, setDiaChiHoc] = useState("");
  const [yeuCauChuanBi, setYeuCauChuanBi] = useState("");
  const [thoiLuongBuoi, setThoiLuongBuoi] = useState("");
  const [thoiLuongPhut, setThoiLuongPhut] = useState("");
  const [hocPhi, setHocPhi] = useState("");
  const [trinhDoDauVao, setTrinhDoDauVao] =
    useState<TrinhDoDauVao>("khong_yeu_cau");
  const [trangThaiKhoaHoc, setTrangThaiKhoaHoc] =
    useState<TrangThaiKhoaHoc>("sap_khai_giang");
  const [cheDoHienThi, setCheDoHienThi] =
    useState<KhoaHocCheDoHienThi>("cong_khai");
  const [thumbnail, setThumbnail] = useState<CoverDraft>({
    imageId: null,
    previewUrl: null,
    uploading: false,
  });
  const [bannerCover, setBannerCover] = useState<CoverDraft>({
    imageId: null,
    previewUrl: null,
    uploading: false,
  });
  const [coverVariant, setCoverVariant] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setTenKhoaHoc("");
    setLoaiMoHinh("lien_tuc_theo_thang");
    setMoTa("");
    setNgayKhaiGiang("");
    setHinhThuc("truc_tiep");
    setDiaChiHoc("");
    setYeuCauChuanBi("");
    setThoiLuongBuoi("");
    setThoiLuongPhut("");
    setHocPhi("");
    setTrinhDoDauVao("khong_yeu_cau");
    setTrangThaiKhoaHoc("sap_khai_giang");
    setCheDoHienThi("cong_khai");
    setThumbnail({ imageId: null, previewUrl: null, uploading: false });
    setBannerCover({ imageId: null, previewUrl: null, uploading: false });
    setCoverVariant(Math.floor(Math.random() * 3));
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset();
      if (orgDiaChi?.trim()) {
        setDiaChiHoc(orgDiaChi.trim());
      }
      return;
    }
    setTenKhoaHoc(editing.tenKhoaHoc);
    setLoaiMoHinh(editing.loaiMoHinh);
    setMoTa(editing.moTa ?? "");
    setNgayKhaiGiang(editing.ngayKhaiGiangGanNhat ?? "");
    setHinhThuc(editing.hinhThuc ?? "truc_tiep");
    setDiaChiHoc(editing.diaChiHoc ?? orgDiaChi?.trim() ?? "");
    setYeuCauChuanBi(editing.yeuCauChuanBi ?? "");
    setThoiLuongBuoi(
      editing.thoiLuongBuoi != null ? String(editing.thoiLuongBuoi) : "",
    );
    setThoiLuongPhut(
      editing.thoiLuongPhutMoiBuoi != null
        ? String(editing.thoiLuongPhutMoiBuoi)
        : "",
    );
    setHocPhi(editing.hocPhi != null ? String(editing.hocPhi) : "");
    setTrinhDoDauVao(editing.trinhDoDauVao);
    setTrangThaiKhoaHoc(editing.trangThaiKhoaHoc);
    setCheDoHienThi(editing.cheDoHienThi);
    setCoverVariant(editing.coverVariant);
    setThumbnail({
      imageId: editing.thumbnailId,
      previewUrl: editing.thumbnailUrl,
      uploading: false,
    });
    setBannerCover({
      imageId: editing.coverId,
      previewUrl: editing.coverUrl,
      uploading: false,
    });
    setError(null);
  }, [open, editing, reset, orgDiaChi]);

  async function handleImagePick(
    file: File,
    setDraft: (value: CoverDraft) => void,
    errorLabel: string,
  ) {
    const localPreview = URL.createObjectURL(file);
    setDraft({ imageId: null, previewUrl: localPreview, uploading: true });
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/cover/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error ?? errorLabel);
      }
      setDraft({
        imageId: json.imageId,
        previewUrl: json.url ?? localPreview,
        uploading: false,
      });
    } catch (uploadErr) {
      URL.revokeObjectURL(localPreview);
      setDraft({ imageId: null, previewUrl: null, uploading: false });
      setError(uploadErr instanceof Error ? uploadErr.message : errorLabel);
    }
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function buildPayload(): CapNhatKhoaHocInput {
    return {
      tenKhoaHoc,
      loaiMoHinh,
      moTa: moTa.trim() || null,
      thoiLuongBuoi: parseOptionalInt(thoiLuongBuoi),
      thoiLuongPhutMoiBuoi: parseOptionalInt(thoiLuongPhut),
      hocPhi: parseOptionalMoney(hocPhi),
      trinhDoDauVao,
      thumbnailId: thumbnail.imageId,
      coverId: bannerCover.imageId,
      trangThaiKhoaHoc,
      cheDoHienThi,
      ngayKhaiGiang:
        loaiMoHinh === "cohort_co_dinh" ? ngayKhaiGiang.trim() || null : null,
      hinhThuc,
      diaChiHoc: needsDiaChi(hinhThuc) ? diaChiHoc.trim() || null : null,
      yeuCauChuanBi: yeuCauChuanBi.trim() || null,
    };
  }

  function validateClient(): string | null {
    if (loaiMoHinh === "cohort_co_dinh" && !ngayKhaiGiang.trim()) {
      return "Theo khóa cần chọn ngày khai giảng.";
    }
    if (needsDiaChi(hinhThuc) && !diaChiHoc.trim()) {
      return "Học offline / kết hợp cần địa chỉ phòng học.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setSubmitting(true);
    try {
      const body = buildPayload();

      if (isEdit && editing) {
        const res = await fetch(
          `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(editing.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...body,
              coverVariant: editing.coverVariant,
            }),
          },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          khoaHoc?: KhoaHocCardData;
          error?: string;
        };
        if (!res.ok || !json.khoaHoc) {
          setError(json.error ?? "Không cập nhật được khóa học.");
          return;
        }
        onUpdated?.(json.khoaHoc);
        reset();
        onClose();
        return;
      }

      const createBody: TaoKhoaHocInput = body;
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        khoaHoc?: KhoaHocCardData;
        error?: string;
      };
      if (!res.ok || !json.khoaHoc) {
        setError(json.error ?? "Không tạo được khóa học.");
        return;
      }
      onCreated?.(json.khoaHoc);
      reset();
      onClose();
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  const showDiaChi = needsDiaChi(hinhThuc);

  return (
    <TruongInlineModal
      open={open}
      onClose={handleClose}
      className="tdh-inline-modal--wide cso-kh-create-modal"
      labelledBy={titleId}
      showClose={false}
    >
      <div className="cso-kh-create-head">
        <h2 id={titleId} className="tdh-inline-modal-title">
          {isEdit ? "Sửa khóa học" : "Thêm khóa học"}
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
        <label className="cso-kh-field">
          <span className="cso-kh-label">
            Tên khóa học <span className="cso-kh-req">*</span>
          </span>
          <input
            type="text"
            className="cso-kh-input"
            value={tenKhoaHoc}
            onChange={(e) => setTenKhoaHoc(e.target.value)}
            placeholder="VD: Hình họa cơ bản"
            required
            autoFocus
          />
        </label>

        <fieldset className="cso-kh-field">
          <legend className="cso-kh-label">Hiển thị</legend>
          <div className="cso-kh-hien-thi-grid">
            <label
              className={`cso-kh-hien-thi-opt${cheDoHienThi === "cong_khai" ? " on" : ""}`}
            >
              <input
                type="radio"
                name="cheDoHienThi"
                value="cong_khai"
                checked={cheDoHienThi === "cong_khai"}
                onChange={() => setCheDoHienThi("cong_khai")}
              />
              <Globe size={18} strokeWidth={1.6} aria-hidden />
              <span className="cso-kh-hien-thi-copy">
                <span className="cso-kh-hien-thi-title">Công khai</span>
                <span className="cso-kh-hien-thi-hint">
                  Hiện trên trang cơ sở và có thể tìm thấy
                </span>
              </span>
            </label>
            <label
              className={`cso-kh-hien-thi-opt${cheDoHienThi === "an" ? " on" : ""}`}
            >
              <input
                type="radio"
                name="cheDoHienThi"
                value="an"
                checked={cheDoHienThi === "an"}
                onChange={() => setCheDoHienThi("an")}
              />
              <EyeOff size={18} strokeWidth={1.6} aria-hidden />
              <span className="cso-kh-hien-thi-copy">
                <span className="cso-kh-hien-thi-title">Ẩn</span>
                <span className="cso-kh-hien-thi-hint">
                  Chỉ quản lý thấy — khách không xem được
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className="cso-kh-field">
          <span className="cso-kh-label">Thumbnail khóa học</span>
          <div className="cso-kh-cover-pick">
            <div
              className={`cso-kh-cover-preview c${(coverVariant % 3) + 1}`}
            >
              {thumbnail.previewUrl ? (
                <Image
                  src={thumbnail.previewUrl}
                  alt=""
                  fill
                  className="cso-kh-cover-preview-img"
                  sizes="320px"
                  unoptimized={thumbnail.previewUrl.startsWith("blob:")}
                />
              ) : (
                <span className="cso-kh-cover-preview-ph" aria-hidden>
                  <ImagePlus size={24} strokeWidth={1.5} />
                </span>
              )}
            </div>
            <div className="cso-kh-cover-actions">
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cso-kh-cover-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleImagePick(
                      file,
                      setThumbnail,
                      "Upload thumbnail thất bại.",
                    );
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="cso-kh-cover-btn"
                disabled={thumbnail.uploading || submitting}
                onClick={() => thumbnailInputRef.current?.click()}
              >
                {thumbnail.uploading ? (
                  <>
                    <Loader2 size={14} className="tdh-spin" aria-hidden />
                    Đang tải…
                  </>
                ) : (
                  <>
                    <ImagePlus size={14} aria-hidden />
                    {thumbnail.previewUrl ? "Đổi thumbnail" : "Chọn thumbnail"}
                  </>
                )}
              </button>
              <p className="cso-kh-cover-hint">
                Hiển thị trên card trong danh sách khóa học.
              </p>
            </div>
          </div>
        </div>

        <div className="cso-kh-field">
          <span className="cso-kh-label">Banner trang khóa</span>
          <div className="cso-kh-cover-pick">
            <div
              className={`cso-kh-cover-preview cso-kh-cover-preview--banner c${((coverVariant + 1) % 3) + 1}`}
            >
              {bannerCover.previewUrl ? (
                <Image
                  src={bannerCover.previewUrl}
                  alt=""
                  fill
                  className="cso-kh-cover-preview-img"
                  sizes="360px"
                  unoptimized={bannerCover.previewUrl.startsWith("blob:")}
                />
              ) : (
                <span className="cso-kh-cover-preview-ph" aria-hidden>
                  <ImagePlus size={24} strokeWidth={1.5} />
                </span>
              )}
            </div>
            <div className="cso-kh-cover-actions">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cso-kh-cover-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleImagePick(
                      file,
                      setBannerCover,
                      "Upload banner thất bại.",
                    );
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="cso-kh-cover-btn"
                disabled={bannerCover.uploading || submitting}
                onClick={() => bannerInputRef.current?.click()}
              >
                {bannerCover.uploading ? (
                  <>
                    <Loader2 size={14} className="tdh-spin" aria-hidden />
                    Đang tải…
                  </>
                ) : (
                  <>
                    <ImagePlus size={14} aria-hidden />
                    {bannerCover.previewUrl ? "Đổi banner" : "Chọn banner"}
                  </>
                )}
              </button>
              <p className="cso-kh-cover-hint">
                Banner quảng cáo đầu trang chi tiết khóa — tỷ lệ ngang, khác
                thumbnail.
              </p>
            </div>
          </div>
        </div>

        <fieldset className="cso-kh-field">
          <legend className="cso-kh-label">
            Mô hình <span className="cso-kh-req">*</span>
          </legend>
          <div className="cso-kh-model-grid">
            {LOAI_MO_HINH_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cso-kh-model-opt${loaiMoHinh === opt.value ? " on" : ""}`}
              >
                <input
                  type="radio"
                  name="loaiMoHinh"
                  value={opt.value}
                  checked={loaiMoHinh === opt.value}
                  onChange={() => setLoaiMoHinh(opt.value)}
                />
                <span className="cso-kh-model-title">{opt.label}</span>
                <span className="cso-kh-model-hint">{opt.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
            <p className="cso-kh-field-hint">
              Lớp cohort sẽ mở đúng ngày này — hiển thị trên card khóa học.
            </p>
          </label>
        ) : null}

        <fieldset className="cso-kh-field">
          <legend className="cso-kh-label">
            Hình thức học <span className="cso-kh-req">*</span>
          </legend>
          <div className="cso-kh-hinh-thuc-grid">
            {HINH_THUC_LOP_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cso-kh-hinh-thuc-opt${hinhThuc === opt.value ? " on" : ""}`}
              >
                <input
                  type="radio"
                  name="hinhThuc"
                  value={opt.value}
                  checked={hinhThuc === opt.value}
                  onChange={() => {
                    setHinhThuc(opt.value);
                    if (
                      needsDiaChi(opt.value) &&
                      !diaChiHoc.trim() &&
                      orgDiaChi?.trim()
                    ) {
                      setDiaChiHoc(orgDiaChi.trim());
                    }
                  }}
                />
                <span className="cso-kh-model-title">{opt.label}</span>
                <span className="cso-kh-model-hint">{opt.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {showDiaChi ? (
          <label className="cso-kh-field cso-kh-field--panel">
            <span className="cso-kh-label">
              Địa chỉ học <span className="cso-kh-req">*</span>
            </span>
            <textarea
              className="cso-kh-textarea"
              value={diaChiHoc}
              onChange={(e) => setDiaChiHoc(e.target.value)}
              placeholder={
                orgDiaChi?.trim()
                  ? `VD: ${orgDiaChi.trim()}`
                  : "Số nhà, đường, quận, thành phố — phòng học cụ thể nếu có"
              }
              rows={3}
              required
            />
            <p className="cso-kh-field-hint">
              Học viên sẽ thấy địa chỉ này trên trang khóa (offline / buổi
              trực tiếp).
            </p>
          </label>
        ) : null}

        <label className="cso-kh-field">
          <span className="cso-kh-label">Mô tả ngắn</span>
          <textarea
            className="cso-kh-textarea"
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder="Một dòng giới thiệu hiển thị trên card (tuỳ chọn)"
            rows={2}
          />
        </label>

        <label className="cso-kh-field cso-kh-field--panel">
          <span className="cso-kh-label">Yêu cầu chuẩn bị</span>
          <textarea
            className="cso-kh-textarea"
            value={yeuCauChuanBi}
            onChange={(e) => setYeuCauChuanBi(e.target.value)}
            placeholder="VD: Laptop cá nhân · Bảng vẽ Wacom · Phần mềm Photoshop (bản dùng thử) · Giấy A4 & bút chì 2B"
            rows={4}
          />
          <p className="cso-kh-field-hint">
            Liệt kê dụng cụ / phần mềm học viên cần tự chuẩn bị trước khi vào
            lớp.
          </p>
        </label>

        <div className="cso-kh-field-row">
          <label className="cso-kh-field">
            <span className="cso-kh-label">Số buổi</span>
            <input
              type="number"
              min={0}
              className="cso-kh-input"
              value={thoiLuongBuoi}
              onChange={(e) => setThoiLuongBuoi(e.target.value)}
              placeholder="24"
            />
          </label>
          <label className="cso-kh-field">
            <span className="cso-kh-label">Phút / buổi</span>
            <input
              type="number"
              min={0}
              className="cso-kh-input"
              value={thoiLuongPhut}
              onChange={(e) => setThoiLuongPhut(e.target.value)}
              placeholder="180"
            />
          </label>
        </div>

        <div className="cso-kh-field-row">
          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Học phí
              {loaiMoHinh === "lien_tuc_theo_thang" ? " (VNĐ/tháng)" : " (VNĐ/khóa)"}
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="cso-kh-input"
              value={hocPhi}
              onChange={(e) => setHocPhi(e.target.value)}
              placeholder="6500000"
            />
          </label>
          <label className="cso-kh-field">
            <span className="cso-kh-label">Trình độ đầu vào</span>
            <select
              className="cso-kh-input"
              value={trinhDoDauVao}
              onChange={(e) =>
                setTrinhDoDauVao(e.target.value as TrinhDoDauVao)
              }
            >
              {TRINH_DO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isEdit ? (
          <label className="cso-kh-field">
            <span className="cso-kh-label">Trạng thái khóa học</span>
            <select
              className="cso-kh-input"
              value={trangThaiKhoaHoc}
              onChange={(e) =>
                setTrangThaiKhoaHoc(e.target.value as TrangThaiKhoaHoc)
              }
            >
              {TRANG_THAI_KHOA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <p className="cso-kh-form-err">{error}</p> : null}
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
            disabled={
              submitting ||
              !tenKhoaHoc.trim() ||
              thumbnail.uploading ||
              bannerCover.uploading
            }
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="tdh-spin" aria-hidden />
                {isEdit ? "Đang lưu…" : "Đang tạo…"}
              </>
            ) : isEdit ? (
              "Lưu thay đổi"
            ) : (
              "Tạo khóa học"
            )}
          </button>
        </div>
      </form>
    </TruongInlineModal>
  );
}

"use client";

import {
  EyeOff,
  Globe,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  goiDraftsFromOrgSelection,
  KhoaHocGoiPhiEditor,
  syncOrgComboLinksForKhoa,
  syncOrgGoiLinksForKhoa,
  type OrgComboPickerItem,
  type OrgGoiPickerItem,
} from "@/components/co-so/KhoaHocGoiPhiEditor";
import {
  LOAI_MO_HINH_OPTIONS,
  TRINH_DO_OPTIONS,
  TRANG_THAI_KHOA_OPTIONS,
} from "@/lib/to-chuc/khoa-hoc-labels";
import { normalizeGoiHocPhiDrafts } from "@/lib/to-chuc/khoa-hoc-goi-phi";
import type {
  CapNhatKhoaHocInput,
  KhoaHocCardData,
  KhoaHocCheDoHienThi,
  LoaiMoHinhKhoa,
  TaoKhoaHocInput,
  TrinhDoDauVao,
  TrangThaiKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc-types";
import { orgQuanLyPath } from "@/lib/to-chuc/org-quan-ly-routes";

type Props = {
  open: boolean;
  orgId: string;
  /** Để link «Quản lý gói» → `/quan-ly/hoc-phi`. */
  orgSlug?: string | null;
  orgDiaChi?: string | null;
  editing?: KhoaHocCardData | null;
  onClose: () => void;
  onCreated?: (khoa: KhoaHocCardData) => void;
  onUpdated?: (khoa: KhoaHocCardData) => void;
  /** Sau tạo khóa — mở tab lớp với khóa vừa tạo. */
  onCreatedNeedLop?: (khoaId: string) => void;
};

/** Client-safe slugify (mirror `slugifyOrgName`, không import server-only). */
function slugifyKhoaTen(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || ""
  );
}

type CoverDraft = {
  imageId: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

export function KhoaHocCreateModal({
  open,
  orgId,
  orgSlug = null,
  orgDiaChi: _orgDiaChi = null,
  editing = null,
  onClose,
  onCreated,
  onUpdated,
  onCreatedNeedLop,
}: Props) {
  const isEdit = Boolean(editing);
  const titleId = useId();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const createBodyRef = useRef<HTMLDivElement>(null);
  const [tenKhoaHoc, setTenKhoaHoc] = useState("");
  const [maKhoaHoc, setMaKhoaHoc] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [loaiMoHinh, setLoaiMoHinh] =
    useState<LoaiMoHinhKhoa>("lien_tuc_theo_thang");
  const [moTa, setMoTa] = useState("");
  const [yeuCauChuanBi, setYeuCauChuanBi] = useState("");
  const [selectedGoiIds, setSelectedGoiIds] = useState<string[]>([]);
  const [selectedComboIds, setSelectedComboIds] = useState<string[]>([]);
  const [goiCatalog, setGoiCatalog] = useState<OrgGoiPickerItem[]>([]);
  const [comboCatalog, setComboCatalog] = useState<OrgComboPickerItem[]>([]);
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
  const [createdKhoaId, setCreatedKhoaId] = useState<string | null>(null);

  const manageGoiHref = orgSlug?.trim()
    ? orgQuanLyPath("co_so_dao_tao", orgSlug.trim(), "hoc-phi")
    : null;

  const onGoiCatalogLoad = useCallback(
    (payload: { goi: OrgGoiPickerItem[]; combo: OrgComboPickerItem[] }) => {
      setGoiCatalog(payload.goi);
      setComboCatalog(payload.combo);
    },
    [],
  );

  const reset = useCallback(() => {
    setTenKhoaHoc("");
    setMaKhoaHoc("");
    setSlug("");
    setSlugManual(false);
    setLoaiMoHinh("lien_tuc_theo_thang");
    setMoTa("");
    setYeuCauChuanBi("");
    setSelectedGoiIds([]);
    setSelectedComboIds([]);
    setTrinhDoDauVao("khong_yeu_cau");
    setTrangThaiKhoaHoc("sap_khai_giang");
    setCheDoHienThi("cong_khai");
    setThumbnail({ imageId: null, previewUrl: null, uploading: false });
    setBannerCover({ imageId: null, previewUrl: null, uploading: false });
    setCoverVariant(Math.floor(Math.random() * 3));
    setError(null);
    setCreatedKhoaId(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset();
      return;
    }
    setTenKhoaHoc(editing.tenKhoaHoc);
    setMaKhoaHoc(editing.maKhoaHoc ?? "");
    setSlug(editing.slug);
    setSlugManual(true);
    setLoaiMoHinh(editing.loaiMoHinh);
    setMoTa(editing.moTa ?? "");
    setYeuCauChuanBi(editing.yeuCauChuanBi ?? "");
    /* Để trống — editor preselect theo link N–N khi catalog load. */
    setSelectedGoiIds([]);
    setSelectedComboIds([]);
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
    setCreatedKhoaId(null);
  }, [open, editing, reset]);

  /* Click radio mô hình có thể scrollIntoView → đẩy backdrop/modal.
   * Reset scroll + không gọi scrollIntoView. */
  useEffect(() => {
    if (!open) return;
    const body = createBodyRef.current;
    const modal = body?.closest(".cso-kh-create-modal");
    const backdrop = modal?.parentElement;
    if (modal instanceof HTMLElement) modal.scrollTop = 0;
    if (backdrop instanceof HTMLElement) backdrop.scrollTop = 0;
  }, [open, loaiMoHinh]);

  function buildPayload(): CapNhatKhoaHocInput {
    const goiHocPhi = normalizeGoiHocPhiDrafts(
      goiDraftsFromOrgSelection(goiCatalog, selectedGoiIds),
    );
    return {
      tenKhoaHoc,
      maKhoaHoc: maKhoaHoc.trim() || null,
      slug: slug.trim() || null,
      loaiMoHinh,
      moTa: moTa.trim() || null,
      goiHocPhi: goiHocPhi.length > 0 ? goiHocPhi : undefined,
      trinhDoDauVao,
      thumbnailId: thumbnail.imageId,
      coverId: bannerCover.imageId,
      trangThaiKhoaHoc,
      cheDoHienThi,
      yeuCauChuanBi: yeuCauChuanBi.trim() || null,
    };
  }

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

  function handleAddLopCta() {
    if (!createdKhoaId) return;
    const id = createdKhoaId;
    onCreatedNeedLop?.(id);
    reset();
    onClose();
  }

  function validateClient(): string | null {
    if (!slugifyKhoaTen(slug.trim() || tenKhoaHoc)) {
      return "Slug không hợp lệ — dùng chữ thường, số và gạch ngang.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (createdKhoaId) return;
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
        const linkRes = await syncOrgGoiLinksForKhoa({
          orgId,
          khoaId: json.khoaHoc.id,
          selectedIds: selectedGoiIds,
          catalog: goiCatalog,
        });
        if (!linkRes.ok) {
          setError(linkRes.error);
          return;
        }
        const comboRes = await syncOrgComboLinksForKhoa({
          orgId,
          khoaId: json.khoaHoc.id,
          selectedIds: selectedComboIds,
          catalog: comboCatalog,
          preferredGoiId: selectedGoiIds[0] ?? null,
        });
        if (!comboRes.ok) {
          setError(comboRes.error);
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
      const linkRes = await syncOrgGoiLinksForKhoa({
        orgId,
        khoaId: json.khoaHoc.id,
        selectedIds: selectedGoiIds,
        catalog: goiCatalog,
      });
      if (!linkRes.ok) {
        setError(linkRes.error);
        return;
      }
      const comboRes = await syncOrgComboLinksForKhoa({
        orgId,
        khoaId: json.khoaHoc.id,
        selectedIds: selectedComboIds,
        catalog: comboCatalog,
        preferredGoiId: selectedGoiIds[0] ?? null,
      });
      if (!comboRes.ok) {
        setError(comboRes.error);
        return;
      }
      onCreated?.(json.khoaHoc);
      setCreatedKhoaId(json.khoaHoc.id);
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={handleClose}
      className="cso-kh-create-modal"
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
        <div className="cso-kh-create-body" ref={createBodyRef}>
        {createdKhoaId ? (
          <section className="cso-kh-section" aria-label="Khóa đã tạo">
            <h2 className="cso-kh-section-title">Khóa đã tạo</h2>
            <p className="cso-kh-field-hint">
              Khóa đã tạo — thêm lớp đầu tiên? Khóa chưa mở lớp sẽ chưa hiện
              công khai.
            </p>
          </section>
        ) : null}

        <section className="cso-kh-section" aria-label="Thông tin cơ bản">
          <h2 className="cso-kh-section-title">Hồ sơ khóa</h2>

          <div className="cso-kh-field-row">
            <label className="cso-kh-field">
              <span className="cso-kh-label">
                Tên khóa học <span className="cso-kh-req">*</span>
              </span>
              <input
                type="text"
                className="cso-kh-input"
                value={tenKhoaHoc}
                onChange={(e) => {
                  const next = e.target.value;
                  setTenKhoaHoc(next);
                  if (!slugManual) setSlug(slugifyKhoaTen(next));
                }}
                placeholder="VD: Hình họa cơ bản"
                required
                autoFocus
                disabled={Boolean(createdKhoaId)}
              />
            </label>
            <label className="cso-kh-field">
              <span className="cso-kh-label">Mã khóa học</span>
              <input
                type="text"
                className="cso-kh-input"
                value={maKhoaHoc}
                onChange={(e) => setMaKhoaHoc(e.target.value)}
                placeholder="VD: HH-ONLINE"
                maxLength={64}
                autoCapitalize="characters"
                disabled={Boolean(createdKhoaId)}
              />
            </label>
          </div>

          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Đường dẫn (url) <span className="cso-kh-req">*</span>
            </span>
            <div className="cso-kh-slug-input">
              <span className="cso-kh-slug-prefix" aria-hidden>
                /
              </span>
              <input
                type="text"
                className="cso-kh-input"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(slugifyKhoaTen(e.target.value));
                }}
                placeholder="bo-cuc-mau-online"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={Boolean(createdKhoaId)}
              />
            </div>
          </label>

          <fieldset className="cso-kh-field">
            <legend className="cso-kh-label">Hiển thị</legend>
            <div className="cso-kh-hien-thi-grid">
              <label
                className={`cso-kh-hien-thi-opt${cheDoHienThi === "cong_khai" ? " on" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
              >
                <input
                  type="radio"
                  name="cheDoHienThi"
                  value="cong_khai"
                  checked={cheDoHienThi === "cong_khai"}
                  onChange={() => setCheDoHienThi("cong_khai")}
                  disabled={Boolean(createdKhoaId)}
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
                onMouseDown={(e) => e.preventDefault()}
              >
                <input
                  type="radio"
                  name="cheDoHienThi"
                  value="an"
                  checked={cheDoHienThi === "an"}
                  onChange={() => setCheDoHienThi("an")}
                  disabled={Boolean(createdKhoaId)}
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

          <div
            className={`cso-kh-field-row${isEdit ? "" : " cso-kh-field-row--single"}`}
          >
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
            <label className="cso-kh-field">
              <span className="cso-kh-label">Trình độ đầu vào</span>
              <select
                className="cso-kh-input"
                value={trinhDoDauVao}
                onChange={(e) =>
                  setTrinhDoDauVao(e.target.value as TrinhDoDauVao)
                }
                disabled={Boolean(createdKhoaId)}
              >
                {TRINH_DO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="cso-kh-section" aria-label="Hình ảnh">
          <h2 className="cso-kh-section-title">Hình ảnh</h2>

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
                  disabled={
                    thumbnail.uploading || submitting || Boolean(createdKhoaId)
                  }
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
                  disabled={
                    bannerCover.uploading ||
                    submitting ||
                    Boolean(createdKhoaId)
                  }
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
        </section>

        <section className="cso-kh-section" aria-label="Nội dung">
          <h2 className="cso-kh-section-title">Nội dung</h2>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Mô tả ngắn</span>
            <textarea
              className="cso-kh-textarea"
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="Một dòng giới thiệu hiển thị trên card (tuỳ chọn)"
              rows={2}
              disabled={Boolean(createdKhoaId)}
            />
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Yêu cầu chuẩn bị</span>
            <textarea
              className="cso-kh-textarea"
              value={yeuCauChuanBi}
              onChange={(e) => setYeuCauChuanBi(e.target.value)}
              placeholder="VD: Laptop cá nhân · Bảng vẽ Wacom · Phần mềm Photoshop (bản dùng thử) · Giấy A4 & bút chì 2B"
              rows={4}
              disabled={Boolean(createdKhoaId)}
            />
            <p className="cso-kh-field-hint">
              Liệt kê dụng cụ / phần mềm học viên cần tự chuẩn bị trước khi vào
              lớp.
            </p>
          </label>
        </section>

        <section className="cso-kh-section" aria-label="Mô hình khóa">
          <h2 className="cso-kh-section-title">Mô hình</h2>

          <fieldset className="cso-kh-field">
            <legend className="cso-kh-label">
              Mô hình <span className="cso-kh-req">*</span>
            </legend>
            <div className="cso-kh-model-grid">
              {LOAI_MO_HINH_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cso-kh-model-opt${loaiMoHinh === opt.value ? " on" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <input
                    type="radio"
                    name="loaiMoHinh"
                    value={opt.value}
                    checked={loaiMoHinh === opt.value}
                    onChange={() => setLoaiMoHinh(opt.value)}
                    disabled={Boolean(createdKhoaId)}
                  />
                  <span className="cso-kh-model-title">{opt.label}</span>
                  <span className="cso-kh-model-hint">{opt.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="cso-kh-section" aria-label="Học phí">
          <h2 className="cso-kh-section-title">Học phí</h2>
          <KhoaHocGoiPhiEditor
            orgId={orgId}
            khoaId={editing?.id ?? null}
            selectedGoiIds={selectedGoiIds}
            selectedComboIds={selectedComboIds}
            disabled={submitting || Boolean(createdKhoaId)}
            manageHref={manageGoiHref}
            onChangeGoi={setSelectedGoiIds}
            onChangeCombo={setSelectedComboIds}
            onCatalogLoad={onGoiCatalogLoad}
          />
        </section>

        {error ? <p className="cso-kh-form-err">{error}</p> : null}
        </div>

        <div className="cso-kh-create-foot">
          {createdKhoaId ? (
            <>
              <button
                type="button"
                className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
                onClick={handleClose}
              >
                Để sau
              </button>
              <button
                type="button"
                className="cso-kh-foot-btn cso-kh-foot-btn--primary"
                onClick={handleAddLopCta}
              >
                Thêm lớp đầu tiên
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </form>
    </TruongInlineModal>
  );
}

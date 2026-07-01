"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import {
  LOAI_SU_KIEN_VALUES,
  LOAI_SU_KIEN_LABELS,
  type LoaiSuKien,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";
import {
  TINH_THANH_SELECT_OPTIONS,
  normalizeTinhThanhForDb,
} from "@/lib/truong/contact";

import "@/styles/article-draft-tiptap.css";

type Props = {
  open: boolean;
  orgId: string;
  orgDiaChi?: string | null;
  orgTinhThanh?: string | null;
  editing?: SuKienCardData | null;
  onClose: () => void;
  onCreated?: (suKien: SuKienCardData) => void;
  onUpdated?: (suKien: SuKienCardData) => void;
};

/** ISO (UTC) → giá trị `datetime-local` theo giờ trình duyệt. */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** `datetime-local` (giờ trình duyệt) → ISO UTC để gửi server. */
function localInputToIso(local: string): string | null {
  const raw = local.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type CoverDraft = {
  imageId: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

export function SuKienCreateModal({
  open,
  orgId,
  orgDiaChi = null,
  orgTinhThanh = null,
  editing = null,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const isEdit = Boolean(editing);
  const titleId = useId();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const defaultTinhThanh =
    normalizeTinhThanhForDb(orgTinhThanh) ??
    TINH_THANH_SELECT_OPTIONS[0]?.value ??
    "hcm";
  const [ten, setTen] = useState("");
  const [loaiSuKien, setLoaiSuKien] = useState<LoaiSuKien>("workshop");
  const [batDau, setBatDau] = useState("");
  const [ketThuc, setKetThuc] = useState("");
  const [tinhThanh, setTinhThanh] = useState(defaultTinhThanh);
  const [diaDiem, setDiaDiem] = useState("");
  const [mienPhi, setMienPhi] = useState(true);
  const [giaVe, setGiaVe] = useState("");
  const [moTa, setMoTa] = useState("");
  const [noiDung, setNoiDung] = useState("<p></p>");
  const [slotToiDa, setSlotToiDa] = useState("");
  const [cover, setCover] = useState<CoverDraft>({
    imageId: null,
    previewUrl: null,
    uploading: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setTen("");
    setLoaiSuKien("workshop");
    setBatDau("");
    setKetThuc("");
    setTinhThanh(defaultTinhThanh);
    setDiaDiem("");
    setMienPhi(true);
    setGiaVe("");
    setMoTa("");
    setNoiDung("<p></p>");
    setSlotToiDa("");
    setCover({ imageId: null, previewUrl: null, uploading: false });
    setError(null);
  }, [defaultTinhThanh]);

  async function handleCoverPick(file: File) {
    const localPreview = URL.createObjectURL(file);
    setCover({ imageId: null, previewUrl: localPreview, uploading: true });
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
        throw new Error(json?.error ?? "Upload ảnh bìa thất bại.");
      }
      setCover({
        imageId: json.imageId,
        previewUrl: json.url ?? localPreview,
        uploading: false,
      });
    } catch (uploadErr) {
      URL.revokeObjectURL(localPreview);
      setCover({ imageId: null, previewUrl: null, uploading: false });
      setError(
        uploadErr instanceof Error
          ? uploadErr.message
          : "Upload ảnh bìa thất bại.",
      );
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset();
      if (orgDiaChi?.trim()) setDiaDiem(orgDiaChi.trim());
      return;
    }
    setTen(editing.ten);
    setLoaiSuKien(editing.loaiSuKien);
    setBatDau(isoToLocalInput(editing.batDau));
    setKetThuc(isoToLocalInput(editing.ketThuc));
    setTinhThanh(
      normalizeTinhThanhForDb(editing.tinhThanh) ?? defaultTinhThanh,
    );
    setDiaDiem(editing.diaDiem ?? "");
    setMienPhi(editing.mienPhi);
    setGiaVe(editing.giaVe != null ? String(editing.giaVe) : "");
    setMoTa(editing.moTa ?? "");
    setNoiDung(editing.noiDung?.trim() || "<p></p>");
    setSlotToiDa(editing.slotToiDa != null ? String(editing.slotToiDa) : "");
    setCover({
      imageId: editing.coverId,
      previewUrl: editing.coverSrc,
      uploading: false,
    });
    setError(null);
  }, [open, editing, reset, orgDiaChi, defaultTinhThanh]);

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function validateClient(): string | null {
    if (!ten.trim()) return "Cần tên sự kiện.";
    if (!batDau.trim()) return "Cần thời gian bắt đầu.";
    const start = localInputToIso(batDau);
    const end = localInputToIso(ketThuc);
    if (!start) return "Thời gian bắt đầu không hợp lệ.";
    if (end && new Date(end) < new Date(start)) {
      return "Thời gian kết thúc phải sau thời gian bắt đầu.";
    }
    if (!normalizeTinhThanhForDb(tinhThanh)) {
      return "Cần chọn khu vực tổ chức sự kiện.";
    }
    if (!mienPhi && giaVe.trim()) {
      const n = Number.parseInt(giaVe.trim(), 10);
      if (!Number.isInteger(n) || n < 0) return "Giá vé không hợp lệ.";
    }
    if (!cover.imageId) return "Cần ảnh bìa sự kiện.";
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

    const slotNum = slotToiDa.trim()
      ? Number.parseInt(slotToiDa.trim(), 10)
      : null;
    const giaVeNum =
      !mienPhi && giaVe.trim() ? Number.parseInt(giaVe.trim(), 10) : null;

    const payload = {
      ten: ten.trim(),
      loaiSuKien,
      batDau: localInputToIso(batDau),
      ketThuc: localInputToIso(ketThuc),
      tinhThanh: normalizeTinhThanhForDb(tinhThanh),
      diaDiem: diaDiem.trim() || null,
      mienPhi,
      giaVe: giaVeNum,
      moTa: moTa.trim() || null,
      noiDung,
      slotToiDa: slotNum,
      coverId: cover.imageId,
    };

    setSubmitting(true);
    try {
      const base = `/api/org/${encodeURIComponent(orgId)}/su-kien`;
      const url =
        isEdit && editing
          ? `${base}/${encodeURIComponent(editing.id)}`
          : base;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        suKien?: SuKienCardData;
        error?: string;
      };
      if (!res.ok || !json.suKien) {
        setError(json.error ?? "Không lưu được sự kiện.");
        return;
      }
      if (isEdit) onUpdated?.(json.suKien);
      else onCreated?.(json.suKien);
      reset();
      onClose();
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
      className="tdh-inline-modal--wide cso-kh-create-modal"
      labelledBy={titleId}
    >
      <div className="cso-kh-create-head">
        <h2 id={titleId} className="tdh-inline-modal-title">
          {isEdit ? "Sửa sự kiện" : "Thêm sự kiện"}
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
              Tên sự kiện <span className="cso-kh-req">*</span>
            </span>
            <input
              type="text"
              className="cso-kh-input"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="VD: Workshop vẽ minh hoạ số"
              maxLength={120}
              required
              autoFocus
            />
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Loại sự kiện <span className="cso-kh-req">*</span>
            </span>
            <select
              className="cso-kh-input"
              value={loaiSuKien}
              onChange={(e) => setLoaiSuKien(e.target.value as LoaiSuKien)}
            >
              {LOAI_SU_KIEN_VALUES.map((v) => (
                <option key={v} value={v}>
                  {LOAI_SU_KIEN_LABELS[v]}
                </option>
              ))}
            </select>
          </label>

          <div className="cso-kh-field">
            <span className="cso-kh-label">
              Ảnh bìa <span className="cso-kh-req">*</span>
            </span>
            <div className="cso-kh-cover-pick cso-kh-cover-pick--full">
              <div className="cso-kh-cover-preview cso-kh-cover-preview--banner c1">
                {cover.previewUrl ? (
                  <Image
                    src={cover.previewUrl}
                    alt=""
                    fill
                    className="cso-kh-cover-preview-img"
                    sizes="(max-width: 640px) 100vw, 520px"
                    unoptimized={cover.previewUrl.startsWith("blob:")}
                  />
                ) : (
                  <span className="cso-kh-cover-preview-ph" aria-hidden>
                    <ImagePlus size={24} strokeWidth={1.5} />
                  </span>
                )}
              </div>
              <div className="cso-kh-cover-actions">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cso-kh-cover-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverPick(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="cso-kh-cover-btn"
                  disabled={cover.uploading || submitting}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {cover.uploading ? (
                    <>
                      <Loader2 size={14} className="tdh-spin" aria-hidden />
                      Đang tải…
                    </>
                  ) : (
                    <>
                      <ImagePlus size={14} aria-hidden />
                      {cover.previewUrl ? "Đổi ảnh bìa" : "Chọn ảnh bìa"}
                    </>
                  )}
                </button>
                <p className="cso-kh-cover-hint">
                  Hiển thị trên card sự kiện và banner gợi ý.
                </p>
              </div>
            </div>
          </div>

          <div className="cso-kh-field-row">
            <label className="cso-kh-field">
              <span className="cso-kh-label">
                Bắt đầu <span className="cso-kh-req">*</span>
              </span>
              <input
                type="datetime-local"
                className="cso-kh-input"
                value={batDau}
                onChange={(e) => setBatDau(e.target.value)}
                required
              />
            </label>
            <label className="cso-kh-field">
              <span className="cso-kh-label">Kết thúc</span>
              <input
                type="datetime-local"
                className="cso-kh-input"
                value={ketThuc}
                onChange={(e) => setKetThuc(e.target.value)}
                min={batDau || undefined}
              />
            </label>
          </div>

          <div className="cso-kh-field-row">
            <label className="cso-kh-field">
              <span className="cso-kh-label">
                Hình thức vé <span className="cso-kh-req">*</span>
              </span>
              <select
                className="cso-kh-input"
                value={mienPhi ? "mien_phi" : "tinh_phi"}
                onChange={(e) => setMienPhi(e.target.value === "mien_phi")}
              >
                <option value="mien_phi">Miễn phí</option>
                <option value="tinh_phi">Tính phí</option>
              </select>
            </label>
            {!mienPhi ? (
              <label className="cso-kh-field">
                <span className="cso-kh-label">Giá vé (VND)</span>
                <input
                  type="number"
                  min={0}
                  className="cso-kh-input"
                  value={giaVe}
                  onChange={(e) => setGiaVe(e.target.value)}
                  placeholder="Tuỳ chọn — để trống nếu chưa công bố"
                />
              </label>
            ) : null}
          </div>

          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Khu vực <span className="cso-kh-req">*</span>
            </span>
            <select
              className="cso-kh-input"
              value={tinhThanh}
              onChange={(e) => setTinhThanh(e.target.value)}
              required
            >
              {TINH_THANH_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="cso-kh-hint">
              Dùng để gợi ý sự kiện tới người học gần khu vực này.
            </span>
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Địa chỉ chi tiết</span>
            <input
              type="text"
              className="cso-kh-input"
              value={diaDiem}
              onChange={(e) => setDiaDiem(e.target.value)}
              placeholder="Số nhà, quận, link online… (tuỳ chọn)"
            />
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Mô tả ngắn</span>
            <textarea
              className="cso-kh-textarea cso-kh-textarea--short"
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="1–2 câu tóm tắt hiển thị trên card sự kiện (tuỳ chọn)"
              rows={2}
              maxLength={280}
            />
          </label>

          <div className="cso-kh-field cso-kh-field--richtext">
            <span className="cso-kh-label">Nội dung chi tiết</span>
            <p className="cso-kh-field-hint">
              Chương trình, lịch trình, đối tượng tham dự… — hiển thị khi xem
              chi tiết sự kiện.
            </p>
            <GioiThieuContentEditor
              value={noiDung?.trim() || "<p></p>"}
              onChange={setNoiDung}
            />
          </div>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Số lượng tối đa</span>
            <input
              type="number"
              min={0}
              className="cso-kh-input"
              value={slotToiDa}
              onChange={(e) => setSlotToiDa(e.target.value)}
              placeholder="Bỏ trống nếu không giới hạn"
            />
          </label>

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
              cover.uploading ||
              !ten.trim() ||
              !batDau.trim() ||
              !tinhThanh ||
              !cover.imageId
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
              "Tạo sự kiện"
            )}
          </button>
        </div>
      </form>
    </TruongInlineModal>
  );
}

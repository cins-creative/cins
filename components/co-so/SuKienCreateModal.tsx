"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  LOAI_SU_KIEN_VALUES,
  LOAI_SU_KIEN_LABELS,
  type LoaiSuKien,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";

type Props = {
  open: boolean;
  orgId: string;
  orgDiaChi?: string | null;
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

export function SuKienCreateModal({
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
  const [ten, setTen] = useState("");
  const [loaiSuKien, setLoaiSuKien] = useState<LoaiSuKien>("workshop");
  const [batDau, setBatDau] = useState("");
  const [ketThuc, setKetThuc] = useState("");
  const [diaDiem, setDiaDiem] = useState("");
  const [moTa, setMoTa] = useState("");
  const [slotToiDa, setSlotToiDa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setTen("");
    setLoaiSuKien("workshop");
    setBatDau("");
    setKetThuc("");
    setDiaDiem("");
    setMoTa("");
    setSlotToiDa("");
    setError(null);
  }, []);

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
    setDiaDiem(editing.diaDiem ?? "");
    setMoTa(editing.moTa ?? "");
    setSlotToiDa(editing.slotToiDa != null ? String(editing.slotToiDa) : "");
    setError(null);
  }, [open, editing, reset, orgDiaChi]);

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

    const payload = {
      ten: ten.trim(),
      loaiSuKien,
      batDau: localInputToIso(batDau),
      ketThuc: localInputToIso(ketThuc),
      diaDiem: diaDiem.trim() || null,
      moTa: moTa.trim() || null,
      slotToiDa: slotNum,
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

          <label className="cso-kh-field">
            <span className="cso-kh-label">Địa điểm</span>
            <input
              type="text"
              className="cso-kh-input"
              value={diaDiem}
              onChange={(e) => setDiaDiem(e.target.value)}
              placeholder={
                orgDiaChi?.trim()
                  ? `VD: ${orgDiaChi.trim()}`
                  : "Địa chỉ tổ chức, hoặc link online"
              }
            />
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Mô tả</span>
            <textarea
              className="cso-kh-textarea"
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="Thông tin chi tiết về sự kiện (tuỳ chọn)"
              rows={3}
            />
          </label>

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
            disabled={submitting || !ten.trim() || !batDau.trim()}
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

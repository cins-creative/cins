"use client";

import { useId, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
  type StudioJobLoaiHinh,
  type StudioJobStatus,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

type Props = {
  orgId: string;
  job: StudioJob | null;
  onClose: () => void;
  onSaved: (job: StudioJob) => void;
};

const LOAI_HINH_OPTIONS = Object.entries(STUDIO_JOB_LOAI_HINH_LABEL) as Array<
  [StudioJobLoaiHinh, string]
>;
const STATUS_OPTIONS = Object.entries(STUDIO_JOB_STATUS_LABEL) as Array<
  [StudioJobStatus, string]
>;

function parseMoney(raw: string): number | null {
  const t = raw.trim().replace(/[.,\s]/g, "");
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function StudioJobEditModal({ orgId, job, onClose, onSaved }: Props) {
  const baseId = useId();
  const isEdit = Boolean(job);
  const [tieuDe, setTieuDe] = useState(job?.tieuDe ?? "");
  const [moTa, setMoTa] = useState(job?.moTa ?? "");
  const [loaiHinh, setLoaiHinh] = useState<StudioJobLoaiHinh>(
    job?.loaiHinh ?? "toan_thoi_gian",
  );
  const [capDo, setCapDo] = useState(job?.capDo ?? "");
  const [tinhThanh, setTinhThanh] = useState(job?.tinhThanh ?? "");
  const [lamTuXa, setLamTuXa] = useState(job?.lamTuXa ?? false);
  const [hienThiLuong, setHienThiLuong] = useState(job?.hienThiLuong ?? false);
  const [mucLuongTu, setMucLuongTu] = useState(
    job?.mucLuongTu != null ? String(job.mucLuongTu) : "",
  );
  const [mucLuongDen, setMucLuongDen] = useState(
    job?.mucLuongDen != null ? String(job.mucLuongDen) : "",
  );
  const [hanNop, setHanNop] = useState(job?.hanNop ?? "");
  const [trangThai, setTrangThai] = useState<StudioJobStatus>(
    job?.trangThai ?? "dang_mo",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!tieuDe.trim()) {
      setError("Cần nhập tiêu đề vị trí.");
      return;
    }
    setError(null);
    setPending(true);

    const payload = {
      orgId,
      tieuDe: tieuDe.trim(),
      moTa: moTa.trim() || null,
      loaiHinh,
      capDo: capDo.trim() || null,
      tinhThanh: tinhThanh.trim() || null,
      lamTuXa,
      hienThiLuong,
      mucLuongTu: parseMoney(mucLuongTu),
      mucLuongDen: parseMoney(mucLuongDen),
      hanNop: hanNop.trim() || null,
      trangThai,
    };

    try {
      const res = await fetch(
        isEdit
          ? `/api/studio/tuyen-dung/${encodeURIComponent(job!.id)}`
          : "/api/studio/tuyen-dung",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        job?: StudioJob;
        error?: string;
      } | null;
      if (!res.ok || !json?.job) {
        setError(json?.error ?? "Không lưu được tin tuyển dụng.");
        return;
      }
      onSaved(json.job);
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setPending(false);
    }
  }

  return (
    <TruongInlineModal
      open
      onClose={onClose}
      className="tdh-inline-modal--wide studio-job-modal"
      labelledBy={`${baseId}-title`}
    >
      <h3 id={`${baseId}-title`} className="tdh-inline-modal-title">
        {isEdit ? "Sửa tin tuyển dụng" : "Đăng tin tuyển dụng"}
      </h3>

      <div className="studio-job-form">
        <label className="studio-job-field">
          <span className="studio-job-field-label">Tiêu đề vị trí *</span>
          <input
            className="studio-job-input"
            value={tieuDe}
            maxLength={200}
            placeholder="VD: 2D Animator (Junior)"
            onChange={(e) => setTieuDe(e.target.value)}
          />
        </label>

        <label className="studio-job-field">
          <span className="studio-job-field-label">Mô tả công việc</span>
          <textarea
            className="studio-job-textarea"
            rows={4}
            value={moTa}
            maxLength={4000}
            placeholder="Mô tả vai trò, yêu cầu, quyền lợi…"
            onChange={(e) => setMoTa(e.target.value)}
          />
        </label>

        <div className="studio-job-grid">
          <label className="studio-job-field">
            <span className="studio-job-field-label">Loại hình</span>
            <select
              className="studio-job-input"
              value={loaiHinh}
              onChange={(e) => setLoaiHinh(e.target.value as StudioJobLoaiHinh)}
            >
              {LOAI_HINH_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="studio-job-field">
            <span className="studio-job-field-label">Cấp độ</span>
            <input
              className="studio-job-input"
              value={capDo}
              maxLength={80}
              placeholder="Junior / Middle / Senior"
              onChange={(e) => setCapDo(e.target.value)}
            />
          </label>

          <label className="studio-job-field">
            <span className="studio-job-field-label">Tỉnh / thành</span>
            <input
              className="studio-job-input"
              value={tinhThanh}
              maxLength={80}
              placeholder="hcm / ha_noi…"
              onChange={(e) => setTinhThanh(e.target.value)}
              disabled={lamTuXa}
            />
          </label>

          <label className="studio-job-field">
            <span className="studio-job-field-label">Hạn nộp</span>
            <input
              type="date"
              className="studio-job-input"
              value={hanNop}
              onChange={(e) => setHanNop(e.target.value)}
            />
          </label>
        </div>

        <label className="studio-job-check">
          <input
            type="checkbox"
            checked={lamTuXa}
            onChange={(e) => setLamTuXa(e.target.checked)}
          />
          Làm việc từ xa (Remote)
        </label>

        <label className="studio-job-check">
          <input
            type="checkbox"
            checked={hienThiLuong}
            onChange={(e) => setHienThiLuong(e.target.checked)}
          />
          Hiển thị mức lương
        </label>

        {hienThiLuong ? (
          <div className="studio-job-grid">
            <label className="studio-job-field">
              <span className="studio-job-field-label">Lương từ (đ)</span>
              <input
                className="studio-job-input"
                inputMode="numeric"
                value={mucLuongTu}
                onChange={(e) => setMucLuongTu(e.target.value)}
              />
            </label>
            <label className="studio-job-field">
              <span className="studio-job-field-label">Lương đến (đ)</span>
              <input
                className="studio-job-input"
                inputMode="numeric"
                value={mucLuongDen}
                onChange={(e) => setMucLuongDen(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        <label className="studio-job-field">
          <span className="studio-job-field-label">Trạng thái</span>
          <select
            className="studio-job-input"
            value={trangThai}
            onChange={(e) => setTrangThai(e.target.value as StudioJobStatus)}
          >
            {STATUS_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="studio-job-form-error">{error}</p> : null}

        <div className="studio-job-form-actions">
          <button
            type="button"
            className="studio-apply-cancel"
            onClick={onClose}
            disabled={pending}
          >
            Hủy
          </button>
          <button
            type="button"
            className="studio-apply-submit"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Đăng tin"}
          </button>
        </div>
      </div>
    </TruongInlineModal>
  );
}

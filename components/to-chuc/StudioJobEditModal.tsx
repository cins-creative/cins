"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { StudioJobTitlePicker } from "@/components/to-chuc/StudioJobTitlePicker";
import { STUDIO_PERK_ICONS } from "@/components/to-chuc/StudioPerkList";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { formatNgheRoleLabel } from "@/lib/articles/nghe-role-label";
import { TINH_THANH_OPTIONS } from "@/lib/truong/contact";
import {
  STUDIO_PHUC_LOI_CATALOG,
  type StudioJobPhucLoiItem,
  type StudioPhucLoiKey,
} from "@/lib/to-chuc/studio-phuc-loi";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import {
  STUDIO_JOB_CAP_DO_OPTIONS,
  TUYEN_DUNG_GIAI_DOAN_DEFAULT,
  TUYEN_DUNG_GIAI_DOAN_OPTIONS,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  STUDIO_JOB_STATUS_LABEL,
  type StudioJob,
  type StudioJobLoaiHinh,
  type StudioJobStatus,
  type StudioNgheOption,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

type Props = {
  orgId: string;
  job: StudioJob | null;
  onClose: () => void;
  onSaved: (job: StudioJob) => void;
};

type LinhVucOption = { id: string; ten: string };

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

function toggleGiaiDoan(current: GiaiDoan[], value: GiaiDoan): GiaiDoan[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export function StudioJobEditModal({ orgId, job, onClose, onSaved }: Props) {
  const baseId = useId();
  const isEdit = Boolean(job);
  const [tieuDe, setTieuDe] = useState(job?.tieuDe ?? "");
  const [idNghe, setIdNghe] = useState<string | null>(job?.idNghe ?? null);
  const [moTaNgan, setMoTaNgan] = useState(job?.moTaNgan ?? "");
  const [moTa, setMoTa] = useState(job?.moTa ?? "");
  const [yeuCau, setYeuCau] = useState(job?.yeuCau ?? "");
  const [phucLoi, setPhucLoi] = useState<StudioJobPhucLoiItem[]>(
    job?.phucLoi ?? [],
  );
  const [loaiHinh, setLoaiHinh] = useState<StudioJobLoaiHinh>(
    job?.loaiHinh ?? "toan_thoi_gian",
  );
  const [capDo, setCapDo] = useState(job?.capDo ?? "");
  const [tinhThanh, setTinhThanh] = useState(job?.tinhThanh ?? "");
  const [lamTuXa, setLamTuXa] = useState(job?.lamTuXa ?? false);
  const [idLinhVuc, setIdLinhVuc] = useState(job?.idLinhVuc ?? "");
  const [hienThiLuong, setHienThiLuong] = useState(job?.hienThiLuong ?? false);
  const [mucLuongTu, setMucLuongTu] = useState(
    job?.mucLuongTu != null ? String(job.mucLuongTu) : "",
  );
  const [mucLuongDen, setMucLuongDen] = useState(
    job?.mucLuongDen != null ? String(job.mucLuongDen) : "",
  );
  const [soLuong, setSoLuong] = useState(
    job?.soLuong != null ? String(job.soLuong) : "",
  );
  const [hanNop, setHanNop] = useState(job?.hanNop ?? "");
  const [trangThai, setTrangThai] = useState<StudioJobStatus>(
    job?.trangThai ?? "dang_mo",
  );
  const [hienThiCoHoi, setHienThiCoHoi] = useState(job?.hienThiCoHoi ?? true);
  const [giaiDoanMucTieu, setGiaiDoanMucTieu] = useState<GiaiDoan[]>(
    job?.giaiDoanMucTieu?.length
      ? job.giaiDoanMucTieu
      : [...TUYEN_DUNG_GIAI_DOAN_DEFAULT],
  );
  const [linhVucs, setLinhVucs] = useState<LinhVucOption[]>([]);
  const [ngheOptions, setNgheOptions] = useState<StudioNgheOption[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/meta/linh-vuc", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((json: { items?: LinhVucOption[] }) => {
        if (!cancelled && json.items) setLinhVucs(json.items);
      })
      .catch(() => {});
    void fetch("/api/meta/nghe-vi-tri", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((json: { items?: StudioNgheOption[] }) => {
        if (!cancelled && json.items) setNgheOptions(json.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedLabel = useMemo(() => {
    if (!idNghe) return null;
    const opt = ngheOptions.find((o) => o.id === idNghe);
    if (opt) return formatNgheRoleLabel(opt.linhVucTen, opt.roleShort);
    return job?.ngheTieuDe ?? "Vị trí trong hệ thống";
  }, [idNghe, ngheOptions, job?.ngheTieuDe]);

  const phucLoiNoteByKey = useMemo(
    () => new Map(phucLoi.map((p) => [p.key, p.note] as const)),
    [phucLoi],
  );

  function togglePhucLoi(key: StudioPhucLoiKey) {
    setPhucLoi((prev) =>
      prev.some((p) => p.key === key)
        ? prev.filter((p) => p.key !== key)
        : [...prev, { key, note: null }],
    );
  }

  function setPhucLoiNote(key: StudioPhucLoiKey, note: string) {
    setPhucLoi((prev) =>
      prev.map((p) => (p.key === key ? { ...p, note: note || null } : p)),
    );
  }

  async function submit() {
    if (!tieuDe.trim()) {
      setError("Cần nhập tiêu đề vị trí.");
      return;
    }
    if (giaiDoanMucTieu.length === 0) {
      setError("Chọn ít nhất một nhóm đối tượng nhận tin.");
      return;
    }
    setError(null);
    setPending(true);

    const payload = {
      orgId,
      tieuDe: tieuDe.trim(),
      moTa: moTa.trim() || null,
      yeuCau: yeuCau.trim() || null,
      phucLoi,
      moTaNgan: moTaNgan.trim() || null,
      loaiHinh,
      capDo: capDo.trim() || null,
      tinhThanh: tinhThanh.trim() || null,
      lamTuXa,
      idLinhVuc: idLinhVuc.trim() || null,
      idNghe,
      hienThiLuong,
      mucLuongTu: parseMoney(mucLuongTu),
      mucLuongDen: parseMoney(mucLuongDen),
      soLuong: parseMoney(soLuong),
      hanNop: hanNop.trim() || null,
      trangThai,
      hienThiCoHoi,
      giaiDoanMucTieu,
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
        <div className="studio-job-field">
          <span className="studio-job-field-label" id={`${baseId}-tieude`}>
            Tiêu đề vị trí *
          </span>
          <StudioJobTitlePicker
            value={tieuDe}
            options={ngheOptions}
            inputId={`${baseId}-tieude-input`}
            onChangeText={(next) => {
              setTieuDe(next);
              if (!next.trim()) setIdNghe(null);
            }}
            onSelectNghe={(opt) => {
              setTieuDe(opt.roleShort);
              setIdNghe(opt.id);
            }}
          />
          {linkedLabel ? (
            <span className="studio-job-nghe-linked">
              <span className="studio-job-nghe-linked-ic" aria-hidden>
                🔗
              </span>
              Gắn với nghề: <strong>{linkedLabel}</strong>
              <button
                type="button"
                className="studio-job-nghe-linked-x"
                onClick={() => setIdNghe(null)}
                aria-label="Bỏ liên kết nghề"
              >
                <X size={12} strokeWidth={2.5} aria-hidden />
              </button>
            </span>
          ) : (
            <span className="studio-job-field-hint">
              Chọn vị trí có sẵn trong hệ thống để gắn với trang nghề, hoặc gõ để
              tạo vị trí mới.
            </span>
          )}
        </div>

        <label className="studio-job-field">
          <span className="studio-job-field-label">Tóm tắt ngắn</span>
          <input
            className="studio-job-input"
            value={moTaNgan}
            maxLength={240}
            placeholder="1–2 dòng hiện trên card Cơ hội"
            onChange={(e) => setMoTaNgan(e.target.value)}
          />
        </label>

        <label className="studio-job-field">
          <span className="studio-job-field-label">Mô tả công việc</span>
          <textarea
            className="studio-job-textarea"
            rows={4}
            value={moTa}
            maxLength={6000}
            placeholder="Vai trò, deliverable, team, quy trình làm việc…"
            onChange={(e) => setMoTa(e.target.value)}
          />
        </label>

        <label className="studio-job-field">
          <span className="studio-job-field-label">Yêu cầu ứng viên</span>
          <textarea
            className="studio-job-textarea"
            rows={3}
            value={yeuCau}
            maxLength={4000}
            placeholder="Kỹ năng, tool, portfolio, kinh nghiệm…"
            onChange={(e) => setYeuCau(e.target.value)}
          />
        </label>

        <div className="studio-job-field">
          <span className="studio-job-field-label">Quyền lợi & phúc lợi</span>
          <span className="studio-job-field-hint">
            Tick các phúc lợi áp dụng. Bấm vào ô ghi chú của mục đã chọn để mô tả
            chi tiết (VD: BHXH full lương, thưởng dự án…).
          </span>
          <div className="studio-perk-grid">
            {STUDIO_PHUC_LOI_CATALOG.map((item) => {
              const active = phucLoiNoteByKey.has(item.key);
              const Icon = STUDIO_PERK_ICONS[item.icon] ?? Sparkles;
              return (
                <div
                  key={item.key}
                  className={`studio-perk${active ? " is-active" : ""}`}
                >
                  <button
                    type="button"
                    className="studio-perk-toggle"
                    aria-pressed={active}
                    onClick={() => togglePhucLoi(item.key)}
                  >
                    <span className="studio-perk-ic" aria-hidden>
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="studio-perk-label">{item.label}</span>
                    <span className="studio-perk-check" aria-hidden>
                      {active ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                  </button>
                  {active ? (
                    <input
                      className="studio-perk-note"
                      value={phucLoiNoteByKey.get(item.key) ?? ""}
                      placeholder={item.hint}
                      maxLength={160}
                      onChange={(e) => setPhucLoiNote(item.key, e.target.value)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="studio-job-grid">
          <label className="studio-job-field">
            <span className="studio-job-field-label">Lĩnh vực</span>
            <select
              className="studio-job-input"
              value={idLinhVuc}
              onChange={(e) => setIdLinhVuc(e.target.value)}
            >
              <option value="">— Chưa chọn —</option>
              {linhVucs.map((lv) => (
                <option key={lv.id} value={lv.id}>
                  {lv.ten}
                </option>
              ))}
            </select>
          </label>

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
            <select
              className="studio-job-input"
              value={capDo}
              onChange={(e) => setCapDo(e.target.value)}
            >
              {STUDIO_JOB_CAP_DO_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="studio-job-field">
            <span className="studio-job-field-label">Tỉnh / thành</span>
            <select
              className="studio-job-input"
              value={tinhThanh}
              onChange={(e) => setTinhThanh(e.target.value)}
              disabled={lamTuXa}
            >
              {TINH_THANH_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="studio-job-field">
            <span className="studio-job-field-label">Số lượng tuyển</span>
            <input
              className="studio-job-input"
              inputMode="numeric"
              value={soLuong}
              placeholder="VD: 2"
              onChange={(e) => setSoLuong(e.target.value)}
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

        <fieldset className="studio-job-fieldset">
          <legend className="studio-job-field-label">Phân phối nội dung</legend>
          <p className="studio-job-field-hint">
            Chọn nhóm <strong>giai đoạn</strong> của user sẽ thấy tin trên module
            Cơ hội (trang chủ, cụm LÀM).
          </p>
          <label className="studio-job-check">
            <input
              type="checkbox"
              checked={hienThiCoHoi}
              onChange={(e) => setHienThiCoHoi(e.target.checked)}
            />
            Hiển thị trên module Cơ hội
          </label>
          <div className="studio-job-audience-grid">
            {TUYEN_DUNG_GIAI_DOAN_OPTIONS.map((opt) => (
              <label key={opt.value} className="studio-job-audience-item">
                <input
                  type="checkbox"
                  checked={giaiDoanMucTieu.includes(opt.value)}
                  onChange={() =>
                    setGiaiDoanMucTieu((prev) => toggleGiaiDoan(prev, opt.value))
                  }
                />
                <span>
                  <strong>{opt.label}</strong>
                  <small>{opt.hint}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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

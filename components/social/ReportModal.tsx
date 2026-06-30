"use client";

import { AlertTriangle, Check, Loader2, Paperclip, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  LOAI_BAO_CAO_OPTIONS,
  type LoaiBaoCao,
} from "@/lib/social/bao-cao-constants";

import "./report.css";

type EvidenceItem = { loai: "url" | "anh"; value: string };

type Props = {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetTitle?: string | null;
  loaiDoiTuong?: string;
  viewerLoggedIn: boolean;
};

const MAX_NOI_DUNG = 1000;

export function ReportModal({
  open,
  onClose,
  targetId,
  targetTitle,
  loaiDoiTuong = "cot_moc",
  viewerLoggedIn,
}: Props) {
  const [loai, setLoai] = useState<LoaiBaoCao | "">("");
  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setLoai("");
    setTieuDe("");
    setNoiDung("");
    setEvidence([]);
    setUrlDraft("");
    setError(null);
    setDone(false);
    setSubmitting(false);
    setUploading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  if (!open) return null;

  function addUrl() {
    const v = urlDraft.trim();
    if (!v) return;
    setEvidence((prev) =>
      [...prev, { loai: "url" as const, value: v }].slice(0, 8),
    );
    setUrlDraft("");
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Tải ảnh thất bại.");
        return;
      }
      setEvidence((prev) =>
        [...prev, { loai: "anh" as const, value: json.url! }].slice(0, 8),
      );
    } catch {
      setError("Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  function removeEvidence(idx: number) {
    setEvidence((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!viewerLoggedIn) {
      const next =
        typeof window !== "undefined" ? window.location.pathname : "/";
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
      return;
    }
    if (!loai) {
      setError("Hãy chọn loại báo cáo.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bao-cao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loai_doi_tuong: loaiDoiTuong,
          id_doi_tuong: targetId,
          loai_bao_cao: loai,
          tieu_de: tieuDe.trim() || null,
          noi_dung: noiDung.trim() || null,
          bang_chung: evidence,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Gửi báo cáo thất bại.");
        return;
      }
      setDone(true);
    } catch {
      setError("Gửi báo cáo thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rpt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Báo cáo nội dung"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rpt-modal">
        <div className="rpt-head">
          <span className="rpt-head-ico" aria-hidden>
            <AlertTriangle size={18} strokeWidth={2} />
          </span>
          <h2 className="rpt-title">Báo cáo nội dung</h2>
          <button
            type="button"
            className="rpt-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {done ? (
          <div className="rpt-done">
            <span className="rpt-done-ico" aria-hidden>
              <Check size={28} strokeWidth={2.4} />
            </span>
            <h3>Đã nhận báo cáo của bạn</h3>
            <p>
              CINs sẽ xem xét nội dung này và xử lý theo tiêu chuẩn cộng đồng.
              Bạn sẽ nhận được thông báo khi báo cáo được xử lý.
            </p>
            <button type="button" className="rpt-btn rpt-btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        ) : (
          <div className="rpt-body">
            {targetTitle ? (
              <p className="rpt-target">
                Nội dung: <strong>{targetTitle}</strong>
              </p>
            ) : null}

            <fieldset className="rpt-field">
              <legend>Loại báo cáo</legend>
              <div className="rpt-loai-grid">
                {LOAI_BAO_CAO_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`rpt-loai${loai === opt.value ? " is-active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="loai_bao_cao"
                      value={opt.value}
                      checked={loai === opt.value}
                      onChange={() => {
                        setLoai(opt.value);
                        if (!tieuDe.trim()) setTieuDe(opt.label);
                      }}
                    />
                    <span className="rpt-loai-lbl">{opt.label}</span>
                    <span className="rpt-loai-desc">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="rpt-field">
              <span className="rpt-label">Tiêu đề</span>
              <input
                type="text"
                className="rpt-input"
                value={tieuDe}
                maxLength={120}
                placeholder="Tóm tắt ngắn gọn vấn đề"
                onChange={(e) => setTieuDe(e.target.value)}
              />
            </label>

            <label className="rpt-field">
              <span className="rpt-label">Mô tả chi tiết</span>
              <textarea
                className="rpt-textarea"
                value={noiDung}
                maxLength={MAX_NOI_DUNG}
                rows={4}
                placeholder="Mô tả vì sao nội dung này vi phạm…"
                onChange={(e) => setNoiDung(e.target.value)}
              />
              <span className="rpt-counter">
                {noiDung.length}/{MAX_NOI_DUNG}
              </span>
            </label>

            <div className="rpt-field">
              <span className="rpt-label">Bằng chứng (tuỳ chọn)</span>
              <div className="rpt-evidence-add">
                <input
                  type="url"
                  className="rpt-input"
                  value={urlDraft}
                  placeholder="Dán link bằng chứng…"
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  className="rpt-btn rpt-btn-ghost"
                  onClick={addUrl}
                  disabled={!urlDraft.trim()}
                >
                  Thêm link
                </button>
                <button
                  type="button"
                  className="rpt-btn rpt-btn-ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={14} className="rpt-spin" aria-hidden />
                  ) : (
                    <Paperclip size={14} aria-hidden />
                  )}
                  Ảnh
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPickFile}
                />
              </div>
              {evidence.length > 0 ? (
                <ul className="rpt-evidence-list">
                  {evidence.map((ev, i) => (
                    <li key={`${ev.value}-${i}`} className="rpt-evidence-item">
                      {ev.loai === "anh" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={ev.value} alt="" className="rpt-evidence-thumb" />
                      ) : (
                        <span className="rpt-evidence-url">{ev.value}</span>
                      )}
                      <button
                        type="button"
                        className="rpt-evidence-rm"
                        aria-label="Xoá"
                        onClick={() => removeEvidence(i)}
                      >
                        <X size={13} strokeWidth={2.2} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {error ? <p className="rpt-error">{error}</p> : null}

            <div className="rpt-actions">
              <button type="button" className="rpt-btn rpt-btn-ghost" onClick={onClose}>
                Huỷ
              </button>
              <button
                type="button"
                className="rpt-btn rpt-btn-primary"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 size={15} className="rpt-spin" aria-hidden />
                ) : null}
                Gửi báo cáo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import {
  TIMELINE_MOC_DESC_MAX,
  TIMELINE_MOC_LABEL_MAX,
  TIMELINE_MOC_LINK_MAX,
  type TuyenSinhTimelineMoc,
} from "@/lib/truong/timeline-steps";

type Props = {
  initial: TuyenSinhTimelineMoc;
  onSubmit: (moc: TuyenSinhTimelineMoc) => void;
  onDelete?: () => void;
  submitLabel?: string;
};

function EndAddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EndRemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function TruongTimelineMocSingleForm({
  initial,
  onSubmit,
  onDelete,
  submitLabel = "Lưu mốc",
}: Props) {
  const [row, setRow] = useState(initial);
  const [showEnd, setShowEnd] = useState(Boolean(initial.ngay_den));

  useEffect(() => {
    setRow(initial);
    setShowEnd(Boolean(initial.ngay_den));
  }, [initial]);

  function patch(p: Partial<TuyenSinhTimelineMoc>) {
    setRow((prev) => ({ ...prev, ...p }));
  }

  return (
    <form
      className="tdh-timeline-moc-single-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(row);
      }}
    >
      <label className="tdh-inline-field">
        <span>Tên mốc</span>
        <input
          type="text"
          value={row.label}
          maxLength={TIMELINE_MOC_LABEL_MAX}
          placeholder="VD: Nhận hồ sơ đăng ký"
          onChange={(e) => patch({ label: e.target.value })}
          required
        />
      </label>
      <div
        className={`tdh-timeline-moc-dates${showEnd ? " tdh-timeline-moc-dates--range" : " tdh-timeline-moc-dates--single"}`}
      >
        <label className="tdh-inline-field">
          <span>{showEnd ? "Từ ngày" : "Ngày"}</span>
          <input
            type="date"
            value={row.ngay_tu ?? ""}
            onChange={(e) => patch({ ngay_tu: e.target.value || null })}
            required
          />
        </label>
        {showEnd ? (
          <label className="tdh-inline-field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={row.ngay_den ?? ""}
              onChange={(e) => patch({ ngay_den: e.target.value || null })}
            />
          </label>
        ) : null}
        {showEnd ? (
          <button
            type="button"
            className="tdh-timeline-moc-end-icon-btn tdh-timeline-moc-end-icon-btn--remove"
            onClick={() => {
              patch({ ngay_den: null });
              setShowEnd(false);
            }}
            aria-label="Bỏ đến ngày"
            title="Bỏ đến ngày"
          >
            <EndRemoveIcon />
          </button>
        ) : (
          <button
            type="button"
            className="tdh-timeline-moc-end-icon-btn tdh-timeline-moc-end-icon-btn--add"
            onClick={() => setShowEnd(true)}
            aria-label="Thêm đến ngày"
            title="Thêm đến ngày"
          >
            <EndAddIcon />
          </button>
        )}
      </div>
      <label className="tdh-inline-field">
        <span>Mô tả (tối đa {TIMELINE_MOC_DESC_MAX} ký tự)</span>
        <textarea
          rows={3}
          maxLength={TIMELINE_MOC_DESC_MAX}
          value={row.mo_ta ?? ""}
          placeholder="Ghi chú ngắn cho thí sinh"
          onChange={(e) => patch({ mo_ta: e.target.value || null })}
        />
      </label>
      <label className="tdh-inline-field">
        <span>Link đính kèm</span>
        <input
          type="url"
          maxLength={TIMELINE_MOC_LINK_MAX}
          value={row.link ?? ""}
          placeholder="https://…"
          onChange={(e) => patch({ link: e.target.value || null })}
        />
      </label>
      <div className="tdh-inline-modal-actions tdh-timeline-moc-single-actions">
        {onDelete ? (
          <button
            type="button"
            className="tdh-inline-btn ghost tdh-timeline-moc-single-del"
            onClick={onDelete}
          >
            Xóa mốc
          </button>
        ) : null}
        <button type="submit" className="tdh-inline-btn primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

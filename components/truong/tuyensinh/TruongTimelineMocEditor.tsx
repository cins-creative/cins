"use client";

import { useEffect, useState } from "react";

import {
  emptyTimelineMoc,
  mocHasTime,
  TIMELINE_MOC_DESC_MAX,
  TIMELINE_MOC_LABEL_MAX,
  TIMELINE_MOC_LINK_MAX,
  TIMELINE_MOC_MAX_ITEMS,
  withMocTime,
  withoutMocTime,
  type TuyenSinhTimelineMoc,
} from "@/lib/truong/timeline-steps";

function TimelineMocEndAddIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TimelineMocEndRemoveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

type Props = {
  moc: TuyenSinhTimelineMoc[];
  onChange: (next: TuyenSinhTimelineMoc[]) => void;
  linkThongTin: string;
  onLinkThongTinChange: (v: string) => void;
};

function endDateExpanded(
  row: TuyenSinhTimelineMoc,
  openMap: Record<string, boolean>,
): boolean {
  return Boolean(openMap[row.id] || row.ngay_den);
}

export function TruongTimelineMocEditor({
  moc,
  onChange,
  linkThongTin,
  onLinkThongTinChange,
}: Props) {
  const [endDateOpen, setEndDateOpen] = useState<Record<string, boolean>>({});
  const [timeOpen, setTimeOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setEndDateOpen((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of moc) {
        if (row.ngay_den && !next[row.id]) {
          next[row.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setTimeOpen((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of moc) {
        if (
          (mocHasTime(row.ngay_tu) || mocHasTime(row.ngay_den)) &&
          !next[row.id]
        ) {
          next[row.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [moc]);

  function toggleTime(index: number, rowId: string, next: boolean) {
    const conv = next ? withMocTime : withoutMocTime;
    updateAt(index, {
      ngay_tu: conv(moc[index]?.ngay_tu),
      ngay_den: conv(moc[index]?.ngay_den),
    });
    setTimeOpen((prev) => ({ ...prev, [rowId]: next }));
  }

  function showTimeFor(rowId: string): boolean {
    return Boolean(timeOpen[rowId]);
  }

  function updateAt(index: number, patch: Partial<TuyenSinhTimelineMoc>) {
    onChange(
      moc.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeAt(index: number) {
    const removed = moc[index];
    onChange(moc.filter((_, i) => i !== index));
    if (removed) {
      setEndDateOpen((prev) => {
        const next = { ...prev };
        delete next[removed.id];
        return next;
      });
    }
  }

  function addMoc() {
    if (moc.length >= TIMELINE_MOC_MAX_ITEMS) return;
    onChange([...moc, emptyTimelineMoc()]);
  }

  function showEndFor(row: TuyenSinhTimelineMoc): boolean {
    return endDateExpanded(row, endDateOpen);
  }

  function openEndDate(rowId: string) {
    setEndDateOpen((prev) => ({ ...prev, [rowId]: true }));
  }

  function closeEndDate(index: number, rowId: string) {
    updateAt(index, { ngay_den: null });
    setEndDateOpen((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }

  return (
    <div className="tdh-timeline-moc-editor">
      <p className="tdh-inline-field-hint tdh-timeline-moc-hint">
        Thêm từng mốc (tên, ngày, mô tả ngắn, link). Tối đa{" "}
        {TIMELINE_MOC_MAX_ITEMS} mốc.
      </p>
      <ol className="tdh-timeline-moc-list">
        {moc.map((row, index) => {
          const showEnd = showEndFor(row);
          const showTime = showTimeFor(row.id);
          const dateType = showTime ? "datetime-local" : "date";
          const dateVal = (v: string | null) =>
            !v ? "" : showTime ? v.slice(0, 16) : v.slice(0, 10);
          return (
            <li key={row.id} className="tdh-timeline-moc-card">
              <div className="tdh-timeline-moc-card-hdr">
                <span className="tdh-timeline-moc-card-num">
                  Mốc {index + 1}
                </span>
                <button
                  type="button"
                  className="tdh-timeline-moc-del"
                  onClick={() => removeAt(index)}
                  disabled={moc.length <= 1}
                  aria-label={`Xóa mốc ${index + 1}`}
                >
                  Xóa
                </button>
              </div>
              <label className="tdh-inline-field">
                <span>Tên mốc</span>
                <input
                  type="text"
                  value={row.label}
                  maxLength={TIMELINE_MOC_LABEL_MAX}
                  placeholder="VD: Nhận hồ sơ đăng ký"
                  onChange={(e) => updateAt(index, { label: e.target.value })}
                />
              </label>
              <div
                className={`tdh-timeline-moc-dates${showEnd ? " tdh-timeline-moc-dates--range" : " tdh-timeline-moc-dates--single"}`}
              >
                <label className="tdh-inline-field">
                  <span>{showEnd ? "Từ ngày" : "Ngày"}</span>
                  <input
                    type={dateType}
                    value={dateVal(row.ngay_tu)}
                    onChange={(e) =>
                      updateAt(index, {
                        ngay_tu: e.target.value || null,
                      })
                    }
                  />
                </label>
                {showEnd ? (
                  <label className="tdh-inline-field">
                    <span>Đến ngày</span>
                    <input
                      type={dateType}
                      value={dateVal(row.ngay_den)}
                      onChange={(e) =>
                        updateAt(index, {
                          ngay_den: e.target.value || null,
                        })
                      }
                    />
                  </label>
                ) : null}
                {showEnd ? (
                  <button
                    type="button"
                    className="tdh-timeline-moc-end-icon-btn tdh-timeline-moc-end-icon-btn--remove"
                    onClick={() => closeEndDate(index, row.id)}
                    aria-label="Bỏ đến ngày"
                    title="Bỏ đến ngày"
                  >
                    <TimelineMocEndRemoveIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="tdh-timeline-moc-end-icon-btn tdh-timeline-moc-end-icon-btn--add"
                    onClick={() => openEndDate(row.id)}
                    aria-label="Thêm đến ngày"
                    title="Thêm đến ngày"
                  >
                    <TimelineMocEndAddIcon />
                  </button>
                )}
              </div>
              <label className="tdh-timeline-moc-time-toggle">
                <input
                  type="checkbox"
                  checked={showTime}
                  onChange={(e) =>
                    toggleTime(index, row.id, e.target.checked)
                  }
                />
                <span>Thêm giờ cụ thể</span>
              </label>
              <label className="tdh-inline-field">
                <span>Mô tả (tối đa {TIMELINE_MOC_DESC_MAX} ký tự)</span>
                <textarea
                  rows={2}
                  maxLength={TIMELINE_MOC_DESC_MAX}
                  value={row.mo_ta ?? ""}
                  placeholder="Ghi chú ngắn cho thí sinh"
                  onChange={(e) =>
                    updateAt(index, { mo_ta: e.target.value || null })
                  }
                />
              </label>
              <label className="tdh-inline-field">
                <span>Link đính kèm</span>
                <input
                  type="url"
                  maxLength={TIMELINE_MOC_LINK_MAX}
                  value={row.link ?? ""}
                  placeholder="https://…"
                  onChange={(e) =>
                    updateAt(index, { link: e.target.value || null })
                  }
                />
              </label>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="tdh-inline-btn ghost tdh-timeline-moc-add"
        onClick={addMoc}
        disabled={moc.length >= TIMELINE_MOC_MAX_ITEMS}
      >
        + Thêm mốc
      </button>
      <label className="tdh-inline-field tdh-timeline-moc-global-link">
        <span>Link thông tin chính thức (chung cả năm)</span>
        <input
          type="url"
          maxLength={TIMELINE_MOC_LINK_MAX}
          value={linkThongTin}
          onChange={(e) => onLinkThongTinChange(e.target.value)}
          placeholder="https://…"
        />
        <span className="tdh-inline-field-hint">
          Hiển thị ở mục tài liệu tuyển sinh và sidebar lịch.
        </span>
      </label>
    </div>
  );
}

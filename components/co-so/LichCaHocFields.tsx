"use client";

import {
  formatLichCaHoc,
  LICH_CA_PRESETS,
  parseLichCaHoc,
  THU_OPTIONS,
  type LichCaHocDraft,
} from "@/lib/to-chuc/lich-ca-hoc-form";

type Props = {
  value: string;
  onChange: (value: string) => void;
  idPrefix?: string;
};

function draftFromValue(value: string): LichCaHocDraft {
  return parseLichCaHoc(value);
}

function emitChange(draft: LichCaHocDraft, onChange: (value: string) => void) {
  onChange(formatLichCaHoc(draft) ?? "");
}

export function LichCaHocFields({ value, onChange, idPrefix = "lich-ca" }: Props) {
  const draft = draftFromValue(value);
  const preview = formatLichCaHoc(draft);

  function patch(next: Partial<LichCaHocDraft>) {
    emitChange({ ...draft, ...next }, onChange);
  }

  function toggleThu(day: number) {
    const has = draft.thu.includes(day);
    patch({
      thu: has ? draft.thu.filter((d) => d !== day) : [...draft.thu, day],
    });
  }

  return (
    <div className="cso-kh-lich-ca">
      <div className="cso-kh-lich-ca-row">
        <span className="cso-kh-lich-ca-k">Ca học</span>
        <div className="cso-kh-lich-ca-presets">
          {LICH_CA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`cso-kh-lich-ca-chip${draft.caLabel === preset.label ? " on" : ""}`}
              onClick={() =>
                patch({
                  caLabel: draft.caLabel === preset.label ? "" : preset.label,
                })
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="cso-kh-input cso-kh-lich-ca-custom"
          value={draft.caLabel}
          onChange={(e) => patch({ caLabel: e.target.value })}
          placeholder="Hoặc tên ca tuỳ chỉnh (VD: Ca nâng cao)"
          aria-label="Tên ca học"
        />
      </div>

      <div className="cso-kh-lich-ca-row">
        <span className="cso-kh-lich-ca-k" id={`${idPrefix}-thu-label`}>
          Thứ học
        </span>
        <div
          className="cso-kh-lich-ca-thu"
          role="group"
          aria-labelledby={`${idPrefix}-thu-label`}
        >
          {THU_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`cso-kh-lich-ca-chip cso-kh-lich-ca-chip--thu${draft.thu.includes(opt.value) ? " on" : ""}`}
              aria-pressed={draft.thu.includes(opt.value)}
              onClick={() => toggleThu(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cso-kh-lich-ca-row cso-kh-lich-ca-row--time">
        <span className="cso-kh-lich-ca-k">Giờ học</span>
        <div className="cso-kh-lich-ca-time">
          <input
            type="time"
            className="cso-kh-input cso-kh-lich-ca-time-input"
            value={draft.gioBatDau}
            onChange={(e) => patch({ gioBatDau: e.target.value })}
            aria-label="Giờ bắt đầu"
          />
          <span className="cso-kh-lich-ca-time-sep" aria-hidden>
            —
          </span>
          <input
            type="time"
            className="cso-kh-input cso-kh-lich-ca-time-input"
            value={draft.gioKetThuc}
            onChange={(e) => patch({ gioKetThuc: e.target.value })}
            aria-label="Giờ kết thúc"
          />
        </div>
      </div>

      {preview ? (
        <p className="cso-kh-lich-ca-preview" role="status">
          Hiển thị: <b>{preview}</b>
        </p>
      ) : (
        <p className="cso-kh-field-hint">
          Chọn ca, thứ và khung giờ — hệ thống tự ghép chuỗi hiển thị dưới mã
          lớp.
        </p>
      )}
    </div>
  );
}

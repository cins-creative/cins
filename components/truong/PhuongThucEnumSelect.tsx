"use client";

import {
  PHUONG_THUC_ENUM_OPTIONS,
  phuongThucTooltip,
} from "@/lib/truong/phuong-thuc";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
};

/** Dropdown danh mục phương thức chuẩn CINs (`ten_phuong_thuc_enum`). */
export function PhuongThucEnumSelect({
  value,
  onChange,
  id = "phuong-thuc-enum-select",
  label = "Phương thức xét tuyển",
}: Props) {
  const hint = phuongThucTooltip(value);

  return (
    <label className="tdh-inline-field">
      <span>{label}</span>
      <select
        id={id}
        className="tdh-calc-pt-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {PHUONG_THUC_ENUM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p className="tdh-calc-pt-hint" role="note">
          {hint}
        </p>
      ) : null}
    </label>
  );
}

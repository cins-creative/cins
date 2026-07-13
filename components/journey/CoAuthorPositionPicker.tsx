"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { CoAuthorRoleInput } from "@/components/editor/CoAuthorRoleInput";
import type { CoAuthorNgheRoleOption } from "@/lib/editor/coauthor-role-types";
import { MAX_COAUTHOR_POSITIONS } from "@/lib/social/vai-tro";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  options: CoAuthorNgheRoleOption[];
  max?: number;
};

/** Chọn vị trí công việc của chính mình trong tác phẩm — tối đa {@link max}. */
export function CoAuthorPositionPicker({
  value,
  onChange,
  options,
  max = MAX_COAUTHOR_POSITIONS,
}: Props) {
  const [search, setSearch] = useState("");
  const full = value.length >= max;

  const addPosition = (label: string) => {
    const next = label.trim();
    if (!next) return;
    if (value.some((v) => v.toLowerCase() === next.toLowerCase())) return;
    if (value.length >= max) return;
    onChange([...value, next]);
    setSearch("");
  };

  const removePosition = (label: string) => {
    onChange(value.filter((v) => v !== label));
  };

  return (
    <div className="j-coauthor-pos-picker">
      {value.length > 0 ? (
        <ul className="j-coauthor-pos-chips">
          {value.map((label) => (
            <li key={label} className="j-coauthor-pos-chip">
              <span>{label}</span>
              <button
                type="button"
                className="j-coauthor-pos-chip-x"
                aria-label={`Bỏ vị trí ${label}`}
                onClick={() => removePosition(label)}
              >
                <X size={12} strokeWidth={2.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {full ? (
        <p className="j-coauthor-pos-hint">Đã chọn tối đa {max} vị trí.</p>
      ) : (
        <CoAuthorRoleInput
          value={search}
          onChange={setSearch}
          options={options}
          onSelect={(option) => addPosition(option.roleLabel)}
          onAddCustom={(label) => addPosition(label)}
          ariaLabel="Chọn vị trí công việc của bạn"
          placeholder="Tìm vị trí công việc của bạn"
        />
      )}
    </div>
  );
}

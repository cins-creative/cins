"use client";

import { Pencil } from "lucide-react";

type Props = {
  /** Tên nhãn — tooltip / aria. */
  label: string;
  onEdit: () => void;
  disabled?: boolean;
};

/** Nút sửa tên nhãn — hiện khi hover/focus row (cùng pattern `.j-dd-share`). */
export function JourneyFilterRenameButton({
  label,
  onEdit,
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      className="j-dd-edit"
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      title={`Đổi tên nhãn "${label}"`}
      aria-label={`Đổi tên ${label}`}
      disabled={disabled}
    >
      <Pencil size={12} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

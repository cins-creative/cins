"use client";

import { useState } from "react";

import { TruongNganhProgramEditModal } from "@/components/truong/inline/TruongNganhProgramEditModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { TruongNganhProgram } from "@/lib/truong/types";

type Props = {
  prog: TruongNganhProgram;
  year: number;
  orgId: string;
  onRemoved?: () => void;
};

export function TruongNganhEditButton({
  prog,
  year,
  orgId,
  onRemoved,
}: Props) {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);

  if (!ctx?.isEditing) return null;

  return (
    <>
      <button
        type="button"
        className="tdh-nganh-edit-btn"
        aria-label={`Sửa ngành ${prog.nganhTitle}`}
        title="Sửa dữ liệu ngành"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        Sửa
      </button>

      <TruongNganhProgramEditModal
        open={open}
        onClose={() => setOpen(false)}
        prog={prog}
        orgId={orgId}
        initialYear={year}
        onRemoved={onRemoved}
      />
    </>
  );
}

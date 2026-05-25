"use client";

import { useState } from "react";

import { TruongAddYearDataModal } from "@/components/truong/inline/TruongAddYearDataModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

export function TruongAddYearDataButton() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);

  if (!ctx?.isEditing) return null;

  return (
    <>
      <button
        type="button"
        className="tdh-add-year-trigger"
        onClick={() => setOpen(true)}
      >
        Sửa dữ liệu
      </button>
      <TruongAddYearDataModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

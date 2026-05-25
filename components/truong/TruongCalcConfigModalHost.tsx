"use client";

import { useMemo } from "react";

import {
  TruongCalcConfigModal,
} from "@/components/truong/TruongCalcConfigModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { aggregatePhuongThucForCalc } from "@/lib/truong/phuong-thuc";

/** Modal cấu hình PT & hệ số — một instance cho cả trang (sidebar + accordion ngành). */
export function TruongCalcConfigModalHost() {
  const ctx = useTruongInlineEdit();
  const year = ctx?.calcConfigModalYear ?? null;

  const phuongThucOptions = useMemo(() => {
    if (!ctx || year == null) return [];
    return aggregatePhuongThucForCalc(
      ctx.tuyenSinh.filter((r) => r.nam === year),
    );
  }, [ctx, year]);

  if (!ctx?.isEditing || year == null) return null;

  return (
    <TruongCalcConfigModal
      open
      onClose={ctx.closeCalcConfigModal}
      orgId={ctx.orgId}
      year={year}
      phuongThucOptions={phuongThucOptions}
      initial={ctx.getCalcDraft(year)}
      onApply={(draft) => {
        ctx.setCalcDraft(year, draft);
        ctx.closeCalcConfigModal();
        ctx.showToast("Đã áp dụng cấu hình tính điểm cho trường");
      }}
    />
  );
}

"use client";

import { useMemo, useState } from "react";

import { addTruongToNganh, removeTruongFromNganh } from "@/app/nganh/actions";
import { NctSchoolsGrid } from "@/components/nganh/NctSchoolsGrid";
import { NctTruongPickerAdd } from "@/components/nganh/NctTruongPickerAdd";
import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import type { NganhTruongRow } from "@/lib/nganh/truong-shared";

type Props = {
  rows: NganhTruongRow[];
};

export function NganhTruongSection({ rows }: Props) {
  const ctx = useNganhInlineEdit();
  const [busy, setBusy] = useState(false);

  const displayRows = ctx?.isEditing ? ctx.truong : rows;
  const showSection = displayRows.length > 0 || ctx?.isEditing;

  const linkedOrgIds = useMemo(
    () => [...new Set(displayRows.map((r) => r.id))],
    [displayRows],
  );

  if (!showSection) return null;

  async function onAdd(orgSlug: string) {
    if (!ctx?.isEditing) return;
    setBusy(true);
    const r = await addTruongToNganh(
      ctx.article.id,
      ctx.article.slug,
      orgSlug,
    );
    setBusy(false);
    if (!r.ok) {
      ctx.showToast(r.message);
      return;
    }
    ctx.setTruong(r.items);
    ctx.showToast("Đã thêm trường đào tạo");
  }

  async function onRemove(programId: string) {
    if (!ctx?.isEditing) return;
    if (!confirm("G\u1ee1 tr\u01b0\u1eddng kh\u1ecfi danh s\u00e1ch \u0111\u00e0o t\u1ea1o ng\u00e0nh n\u00e0y?"))
      return;
    setBusy(true);
    const r = await removeTruongFromNganh(
      ctx.article.id,
      ctx.article.slug,
      programId,
    );
    setBusy(false);
    if (!r.ok) {
      ctx.showToast(r.message);
      return;
    }
    ctx.setTruong(r.items);
    ctx.showToast("Đã gỡ trường");
  }

  return (
    <>
      <div className="nct-sec-title nct-sec-title--with-actions">
        <div className="nct-sec-title-main">
          <div className="nct-sec-num">05</div>
          <div>
            <h2 className="nct-sec-h">Trường đào tạo</h2>
            {ctx?.isEditing ? (
              <p className="nct-sec-sub nct-sec-sub--edit">
                Thêm hoặc gỡ trường — lưu ngay trên CINs.
              </p>
            ) : null}
          </div>
        </div>
        {ctx?.isEditing ? (
          <NctTruongPickerAdd
            linkedOrgIds={linkedOrgIds}
            busy={busy}
            onPick={(slug) => void onAdd(slug)}
          />
        ) : null}
      </div>

      {displayRows.length > 0 ? (
        <NctSchoolsGrid
          rows={displayRows}
          editing={Boolean(ctx?.isEditing)}
          onRemove={ctx?.isEditing ? (id) => void onRemove(id) : undefined}
        />
      ) : ctx?.isEditing ? (
        <p className="nct-inline-empty-hint">
          Chưa có trường — bấm «+ Thêm trường» để chọn.
        </p>
      ) : null}
    </>
  );
}

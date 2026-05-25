"use client";

import { useState } from "react";

import {
  addMonHocBatchToNganh,
  removeMonHocFromNganh,
} from "@/app/nganh/actions";
import { NctMonHocGroups } from "@/components/nganh/NctMonHocGroups";
import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import type { MonHocCapDoValue } from "@/lib/articles/queries";
import type { MonHocNganhWithCapDo } from "@/lib/nganh/monHoc";

type Props = {
  items: MonHocNganhWithCapDo[];
};

export function NganhMonHocSection({ items }: Props) {
  const ctx = useNganhInlineEdit();
  const [busy, setBusy] = useState(false);

  const displayItems = ctx?.isEditing ? ctx.mon_hoc : items;
  const showSection = displayItems.length > 0 || ctx?.isEditing;

  if (!showSection) return null;

  async function onAdd(slugs: string[], capDo: MonHocCapDoValue) {
    if (!ctx?.isEditing) return;
    setBusy(true);
    const r = await addMonHocBatchToNganh(
      ctx.article.id,
      ctx.article.slug,
      slugs,
      capDo,
    );
    setBusy(false);
    if (!r.ok) {
      ctx.showToast(r.message);
      return;
    }
    ctx.setMonHoc(r.items);
    ctx.showToast(
      r.added === 1 ? "Đã thêm 1 môn học" : `Đã thêm ${r.added} môn học`,
    );
  }

  async function onRemove(monId: string) {
    if (!ctx?.isEditing) return;
    if (!confirm("Gỡ môn học khỏi ngành này?")) return;
    setBusy(true);
    const r = await removeMonHocFromNganh(
      ctx.article.id,
      ctx.article.slug,
      monId,
    );
    setBusy(false);
    if (!r.ok) {
      ctx.showToast(r.message);
      return;
    }
    ctx.setMonHoc(r.items);
    ctx.showToast("Đã gỡ môn học");
  }

  return (
    <>
      <div className="nct-sec-title">
        <div className="nct-sec-num">02</div>
        <div>
          <h2 className="nct-sec-h">Bạn sẽ học những gì?</h2>
          {ctx?.isEditing ? (
            <p className="nct-sec-sub nct-sec-sub--edit">
              Thêm môn theo từng nhóm cấp độ — lưu quan hệ ngay; nhớ bấm Lưu
              thay đổi cho phần nội dung khác.
            </p>
          ) : (
            <p className="meta-note nct-sec-meta-note">
              Chương trình học gợi ý dưới đây là thông tin phổ quát, thực tế sẽ
              tùy từng trường
            </p>
          )}
        </div>
      </div>

      {ctx?.isEditing || displayItems.length > 0 ? (
        <NctMonHocGroups
          items={displayItems}
          editing={Boolean(ctx?.isEditing)}
          onRemove={ctx?.isEditing ? (id) => void onRemove(id) : undefined}
          onAdd={ctx?.isEditing ? (slugs, cap) => void onAdd(slugs, cap) : undefined}
          addBusy={busy}
        />
      ) : null}
    </>
  );
}

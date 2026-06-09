"use client";

import { useEffect, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

/** Form danh tính trường — chỉ hiện khi `isEditing` (sidebar v6). */
export function TruongEditableSidebarIdentity() {
  const ctx = useTruongInlineEdit();
  const [ten, setTen] = useState("");
  const [tenEn, setTenEn] = useState("");
  const [moTa, setMoTa] = useState("");
  const [namThanhLap, setNamThanhLap] = useState("");

  useEffect(() => {
    if (!ctx?.isEditing) return;
    setTen(ctx.school.ten);
    setTenEn(ctx.school.ten_tieng_anh ?? "");
    setMoTa(ctx.school.mo_ta ?? "");
    setNamThanhLap(
      ctx.school.nam_thanh_lap != null ? String(ctx.school.nam_thanh_lap) : "",
    );
  }, [
    ctx?.isEditing,
    ctx?.school.ten,
    ctx?.school.ten_tieng_anh,
    ctx?.school.mo_ta,
    ctx?.school.nam_thanh_lap,
  ]);

  if (!ctx || !ctx.isEditing) return null;
  const editCtx = ctx;

  async function save() {
    let nam: number | null = null;
    if (namThanhLap.trim() !== "") {
      nam = Number.parseInt(namThanhLap.trim(), 10);
      if (!Number.isInteger(nam) || nam < 1800 || nam > 2100) {
        editCtx.showToast("Năm thành lập không hợp lệ (1800–2100).");
        return;
      }
    }
    await editCtx.patchSchool({
      ten: ten.trim(),
      mo_ta: moTa.trim() || null,
      ten_tieng_anh: tenEn.trim() || null,
      nam_thanh_lap: nam,
    });
  }

  return (
    <div className="ss-sidebar-edit-block">
      <label className="tdh-inline-field ss-sidebar-field">
        <span>Tên trường</span>
        <input
          value={ten}
          maxLength={120}
          onChange={(e) => setTen(e.target.value)}
        />
      </label>
      <label className="tdh-inline-field ss-sidebar-field">
        <span>Tên tiếng Anh</span>
        <input
          value={tenEn}
          onChange={(e) => setTenEn(e.target.value)}
          placeholder="English name"
        />
      </label>
      <label className="tdh-inline-field ss-sidebar-field">
        <span>Mô tả ngắn</span>
        <textarea
          rows={2}
          value={moTa}
          onChange={(e) => setMoTa(e.target.value)}
          placeholder="Một câu giới thiệu — hiện trên thẻ trường ở hub"
        />
      </label>
      <label className="tdh-inline-field ss-sidebar-field">
        <span>Năm thành lập</span>
        <input
          type="number"
          min={1800}
          max={2100}
          value={namThanhLap}
          onChange={(e) => setNamThanhLap(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="tdh-inline-chip-btn ss-sidebar-save-btn"
        onClick={() => void save()}
      >
        Lưu danh tính
      </button>
    </div>
  );
}

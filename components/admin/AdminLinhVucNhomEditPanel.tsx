"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  adminCreateLinhVucNhom,
  adminSaveLinhVucNhom,
} from "@/app/admin/actions";
import type { AdminLinhVucNhomRow } from "@/lib/admin/linh-vuc-server";

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Tắt" },
] as const;

type Props = {
  row?: AdminLinhVucNhomRow;
  onCancel: () => void;
  onSaved: () => void;
};

function slugifyClient(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function AdminLinhVucNhomEditPanel({ row, onCancel, onSaved }: Props) {
  const isCreate = row == null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [ten, setTen] = useState(row?.ten ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(row?.slug));
  const [tenEng, setTenEng] = useState(row?.ten_eng ?? "");
  const [moTa, setMoTa] = useState(row?.mo_ta ?? "");
  const [thuTu, setThuTu] = useState(String(row?.thu_tu ?? 0));
  const [trangThai, setTrangThai] = useState(row?.trang_thai ?? "active");

  useEffect(() => {
    if (!row) {
      setTen("");
      setSlug("");
      setSlugTouched(false);
      setTenEng("");
      setMoTa("");
      setThuTu("0");
      setTrangThai("active");
      setSaveMsg(null);
      return;
    }
    setTen(row.ten);
    setSlug(row.slug);
    setSlugTouched(true);
    setTenEng(row.ten_eng ?? "");
    setMoTa(row.mo_ta ?? "");
    setThuTu(String(row.thu_tu ?? 0));
    setTrangThai(row.trang_thai ?? "active");
    setSaveMsg(null);
  }, [row]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaving(true);

    const fd = new FormData();
    fd.set("ten", ten);
    fd.set("slug", slug.trim() || slugifyClient(ten));
    fd.set("ten_eng", tenEng);
    fd.set("mo_ta", moTa);
    fd.set("thu_tu", thuTu);
    fd.set("trang_thai", trangThai);

    let r: { ok: boolean; message?: string };
    if (isCreate) {
      r = await adminCreateLinhVucNhom(fd);
    } else {
      fd.set("id", row!.id);
      r = await adminSaveLinhVucNhom(fd);
    }

    setSaving(false);
    if (r.ok) {
      setSaveMsg({
        type: "ok",
        text: isCreate ? "Đã thêm nhóm." : "Đã lưu.",
      });
      onSaved();
    } else {
      setSaveMsg({ type: "err", text: r.message ?? "Lưu thất bại." });
    }
  }

  return (
    <form className="admin-edit-form" onSubmit={(e) => void onSave(e)}>
      {saveMsg ? (
        <p
          className={`admin-edit-form__msg admin-edit-form__msg--${saveMsg.type}`}
          role={saveMsg.type === "err" ? "alert" : "status"}
        >
          {saveMsg.text}
        </p>
      ) : null}

      {row ? (
        <p className="admin-mon-thi-edit-hero-id">
          <code>{row.id}</code> · {row.so_linh_vuc} lĩnh vực
        </p>
      ) : null}

      <div className="admin-edit-form__fields">
        <div className="form-group">
          <label className="form-label" htmlFor="lvn-ten">
            Tên nhóm *
          </label>
          <input
            id="lvn-ten"
            className="form-input"
            value={ten}
            onChange={(e) => {
              const v = e.target.value;
              setTen(v);
              if (!slugTouched) setSlug(slugifyClient(v));
            }}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lvn-slug">
            Slug *
          </label>
          <input
            id="lvn-slug"
            className="form-input"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            spellCheck={false}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lvn-ten-eng">
            Tên tiếng Anh
          </label>
          <input
            id="lvn-ten-eng"
            className="form-input"
            value={tenEng}
            onChange={(e) => setTenEng(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lvn-mo-ta">
            Mô tả
          </label>
          <textarea
            id="lvn-mo-ta"
            className="form-input"
            rows={3}
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
          />
        </div>

        <div className="admin-linh-vuc-form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="lvn-thu-tu">
              Thứ tự
            </label>
            <input
              id="lvn-thu-tu"
              className="form-input"
              type="number"
              value={thuTu}
              onChange={(e) => setThuTu(e.target.value)}
            />
          </div>
          <div className="form-group">
            <span className="form-label">Trạng thái</span>
            <div className="admin-mon-status-chips" role="group">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`admin-mon-status-chip admin-mon-status-chip--${o.value}${trangThai === o.value ? " is-active" : ""}`}
                  aria-pressed={trangThai === o.value}
                  onClick={() => setTrangThai(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-edit-form__footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Đang lưu…" : isCreate ? "Thêm nhóm" : "Lưu"}
        </button>
      </div>
    </form>
  );
}

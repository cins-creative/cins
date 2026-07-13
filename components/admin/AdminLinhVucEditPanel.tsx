"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  adminCreateLinhVuc,
  adminSaveLinhVuc,
} from "@/app/admin/actions";
import { AdminLinhVucThumb } from "@/components/admin/AdminLinhVucThumb";
import type {
  AdminLinhVucNhomRow,
  AdminLinhVucRow,
} from "@/lib/admin/linh-vuc-server";

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Tắt" },
] as const;

type Props = {
  row?: AdminLinhVucRow;
  nhomCatalog: AdminLinhVucNhomRow[];
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

export function AdminLinhVucEditPanel({
  row,
  nhomCatalog,
  onCancel,
  onSaved,
}: Props) {
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
  const [thumbnailId, setThumbnailId] = useState(row?.thumbnail_id ?? "");
  const [thumbnailSrc, setThumbnailSrc] = useState(row?.thumbnail_src ?? null);
  const [selectedNhomIds, setSelectedNhomIds] = useState<string[]>(
    () => row?.nhoms.map((n) => n.id_nhom) ?? [],
  );
  const [nhomChinhId, setNhomChinhId] = useState(
    () => row?.nhom_chinh?.id_nhom ?? row?.nhoms[0]?.id_nhom ?? "",
  );

  useEffect(() => {
    if (!row) {
      setTen("");
      setSlug("");
      setSlugTouched(false);
      setTenEng("");
      setMoTa("");
      setThuTu("0");
      setTrangThai("active");
      setThumbnailId("");
      setThumbnailSrc(null);
      setSelectedNhomIds([]);
      setNhomChinhId("");
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
    setThumbnailId(row.thumbnail_id ?? "");
    setThumbnailSrc(row.thumbnail_src ?? null);
    setSelectedNhomIds(row.nhoms.map((n) => n.id_nhom));
    setNhomChinhId(row.nhom_chinh?.id_nhom ?? row.nhoms[0]?.id_nhom ?? "");
    setSaveMsg(null);
  }, [row]);

  function toggleNhom(id: string) {
    setSelectedNhomIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (nhomChinhId === id) setNhomChinhId(next[0] ?? "");
        return next;
      }
      const next = [...prev, id];
      if (!nhomChinhId) setNhomChinhId(id);
      return next;
    });
  }

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
    fd.set("thumbnail_id", thumbnailId);
    fd.set("nhom_ids", selectedNhomIds.join(","));
    fd.set("nhom_chinh_id", nhomChinhId);

    let r: { ok: boolean; message?: string };
    if (isCreate) {
      r = await adminCreateLinhVuc(fd);
    } else {
      fd.set("id", row!.id);
      r = await adminSaveLinhVuc(fd);
    }

    setSaving(false);
    if (r.ok) {
      setSaveMsg({
        type: "ok",
        text: isCreate ? "Đã thêm lĩnh vực." : "Đã lưu.",
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

      <div className="admin-linh-vuc-edit-hero">
        <AdminLinhVucThumb
          id={row?.id ?? "__new__"}
          ten={ten || "Lĩnh vực"}
          thumbnailSrc={thumbnailSrc}
          uploadEnabled={!isCreate}
          onThumbnailChange={({ thumbnail_id, thumbnail_url }) => {
            setThumbnailId(thumbnail_id);
            setThumbnailSrc(thumbnail_url);
          }}
        />
        <div>
          <p className="admin-mon-thi-edit-hero-name">
            {ten.trim() || (isCreate ? "Lĩnh vực mới" : "—")}
          </p>
          {row ? (
            <p className="admin-mon-thi-edit-hero-id">
              <code>{row.id}</code>
            </p>
          ) : (
            <p className="admin-mon-thi-edit-hero-hint">
              Lưu trước rồi mới tải thumbnail.
            </p>
          )}
        </div>
      </div>

      <div className="admin-edit-form__fields">
        <div className="form-group">
          <label className="form-label" htmlFor="lv-ten">
            Tên *
          </label>
          <input
            id="lv-ten"
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
          <label className="form-label" htmlFor="lv-slug">
            Slug *
          </label>
          <input
            id="lv-slug"
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
          <label className="form-label" htmlFor="lv-ten-eng">
            Tên tiếng Anh
          </label>
          <input
            id="lv-ten-eng"
            className="form-input"
            value={tenEng}
            onChange={(e) => setTenEng(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lv-mo-ta">
            Mô tả
          </label>
          <textarea
            id="lv-mo-ta"
            className="form-input"
            rows={3}
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
          />
        </div>

        <div className="admin-linh-vuc-form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="lv-thu-tu">
              Thứ tự
            </label>
            <input
              id="lv-thu-tu"
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

        <fieldset className="admin-linh-vuc-nhom-fieldset">
          <legend>Nhóm lĩnh vực (nhiều nhóm)</legend>
          {nhomCatalog.length === 0 ? (
            <p className="admin-mon-thi-edit-hero-hint">
              Chưa có nhóm — tạo ở tab Nhóm trước.
            </p>
          ) : (
            <ul className="admin-linh-vuc-nhom-check-list">
              {nhomCatalog.map((n) => {
                const checked = selectedNhomIds.includes(n.id);
                return (
                  <li key={n.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleNhom(n.id)}
                      />
                      <span>{n.ten}</span>
                    </label>
                    {checked ? (
                      <label className="admin-linh-vuc-nhom-chinh">
                        <input
                          type="radio"
                          name="nhom_chinh"
                          checked={nhomChinhId === n.id}
                          onChange={() => setNhomChinhId(n.id)}
                        />
                        Chính
                      </label>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </div>

      <div className="admin-edit-form__footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Đang lưu…" : isCreate ? "Thêm lĩnh vực" : "Lưu"}
        </button>
      </div>
    </form>
  );
}

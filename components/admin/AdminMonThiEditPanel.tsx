"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { adminCreateMonThi, adminSaveMonThi } from "@/app/admin/actions";
import { AdminMonThiThumb } from "@/components/admin/AdminMonThiThumb";
import { labelMonThiLoai, MON_THI_LOAI_LABELS } from "@/lib/truong/mon-thi-catalog";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import type { AdminToHopMonRow } from "@/lib/admin/to-hop-mon-server";
import { defaultPlaceholderThumbnailId } from "@/lib/truong/mon-thi-thumbnail";

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Tắt" },
  { value: "archived", label: "Lưu trữ" },
] as const;

const LOAI_OPTIONS = Object.keys(MON_THI_LOAI_LABELS);

type Props = {
  /** Không truyền = tạo mới */
  row?: AdminMonThiRow;
  /** Khối thi đang chứa môn này (khi sửa). */
  khoiForMon?: AdminToHopMonRow[];
  onGoToKhoiTab?: () => void;
  onCancel: () => void;
  onSaved: () => void;
};

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function AdminMonThiEditPanel({
  row,
  khoiForMon = [],
  onGoToKhoiTab,
  onCancel,
  onSaved,
}: Props) {
  const isCreate = row == null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [ten, setTen] = useState(row?.ten ?? "");
  const [ma, setMa] = useState(row?.ma ?? "");
  const [loai, setLoai] = useState(row?.loai ?? "nang_khieu");
  const [trang_thai, setTrangThai] = useState(row?.trang_thai ?? "active");
  const [thumbnail_id, setThumbnailId] = useState(row?.thumbnail_id ?? "");
  const [thumbnail_src, setThumbnailSrc] = useState(row?.thumbnail_src ?? null);
  const [thumbnail_from_cover, setThumbnailFromCover] = useState(
    row?.thumbnail_from_cover ?? false,
  );

  useEffect(() => {
    if (!row) {
      setTen("");
      setMa("");
      setLoai("nang_khieu");
      setTrangThai("active");
      setThumbnailId("");
      setThumbnailSrc(null);
      setThumbnailFromCover(false);
      setSaveMsg(null);
      return;
    }
    setTen(row.ten);
    setMa(row.ma ?? "");
    setLoai(row.loai ?? "nang_khieu");
    setTrangThai(row.trang_thai ?? "active");
    setThumbnailId(row.thumbnail_id ?? "");
    setThumbnailSrc(row.thumbnail_src ?? null);
    setThumbnailFromCover(row.thumbnail_from_cover ?? false);
    setSaveMsg(null);
  }, [
    row?.id,
    row?.ten,
    row?.ma,
    row?.loai,
    row?.trang_thai,
    row?.thumbnail_id,
    row?.thumbnail_src,
    row?.thumbnail_from_cover,
  ]);

  const previewRow = useMemo((): AdminMonThiRow => {
    const loaiVal = loai.trim() || null;
    const thumb =
      thumbnail_id.trim() ||
      (isCreate ? defaultPlaceholderThumbnailId(loaiVal) : row?.thumbnail_id ?? null);
    return {
      id: row?.id ?? "__new__",
      ten: ten.trim() || "Môn mới",
      ma: ma.trim() || null,
      loai: loaiVal,
      trang_thai: trang_thai.trim() || null,
      thumbnail_id: thumb,
      id_bai_viet: row?.id_bai_viet ?? null,
      thumbnail_src,
      thumbnail_from_cover,
    };
  }, [
    row,
    isCreate,
    ten,
    ma,
    loai,
    trang_thai,
    thumbnail_id,
    thumbnail_src,
    thumbnail_from_cover,
  ]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaving(true);
    const loaiVal = loai.trim() || "nang_khieu";
    const fd = new FormData();
    fd.set("ten", ten);
    fd.set("ma", ma);
    fd.set("loai", loaiVal);
    fd.set("trang_thai", trang_thai);
    fd.set(
      "thumbnail_id",
      thumbnail_id.trim() || defaultPlaceholderThumbnailId(loaiVal),
    );
    fd.set("id_bai_viet", row?.id_bai_viet ?? "");

    let r: { ok: boolean; message?: string };
    if (isCreate) {
      r = await adminCreateMonThi(fd);
    } else {
      fd.set("id", row!.id);
      r = await adminSaveMonThi(fd);
    }

    setSaving(false);
    if (r.ok) {
      setSaveMsg({ type: "ok", text: isCreate ? "Đã thêm môn thi." : "Đã lưu." });
      onSaved();
    } else {
      const msg = r.message ?? "Lưu thất bại.";
      setSaveMsg({ type: "err", text: msg });
    }
  }

  return (
    <form
      className="admin-edit-form admin-mon-thi-edit"
      onSubmit={(e) => void onSave(e)}
    >
      {saveMsg ? (
        <p
          className={`admin-edit-form__msg admin-edit-form__msg--${saveMsg.type}`}
          role={saveMsg.type === "err" ? "alert" : "status"}
        >
          {saveMsg.text}
        </p>
      ) : null}

      <div className="admin-mon-thi-edit-hero">
        <div className="admin-mon-thi-edit-hero-thumb">
          <AdminMonThiThumb
            row={previewRow}
            uploadEnabled={!isCreate}
            onThumbnailChange={({ thumbnail_id: nextId, thumbnail_url }) => {
              setThumbnailId(nextId);
              setThumbnailSrc(thumbnail_url);
              setThumbnailFromCover(false);
            }}
          />
        </div>
        <div className="admin-mon-thi-edit-hero-main">
          <p className="admin-mon-thi-edit-hero-name">
            {ten.trim() || (isCreate ? "Môn mới" : "—")}
          </p>
          <div className="admin-mon-thi-edit-hero-badges">
            <span className="admin-pill admin-pill--loai">
              {labelMonThiLoai(loai)}
            </span>
            <span
              className={`admin-pill admin-pill--status admin-pill--status-${trang_thai}`}
            >
              {statusLabel(trang_thai)}
            </span>
          </div>
          {ma.trim() ? (
            <p className="admin-mon-thi-edit-hero-ma">
              <code>{ma.trim()}</code>
            </p>
          ) : null}
          {row ? (
            <p className="admin-mon-thi-edit-hero-id">
              <code>{row.id}</code>
            </p>
          ) : (
            <p className="admin-mon-thi-edit-hero-hint">
              Lưu để tạo bản ghi — sau đó có thể tải ảnh thumbnail.
            </p>
          )}
        </div>
      </div>

      <div className="admin-edit-form__fields">
        <section className="admin-mon-thi-edit-sec">
          <h3 className="admin-mon-thi-edit-sec-title">Thông tin môn</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="mon-thi-ten">
              Tên môn thi *
            </label>
            <input
              id="mon-thi-ten"
              className="form-input"
              type="text"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="VD: Hình họa Chân dung"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mon-thi-ma">
              Mã (ma)
            </label>
            <input
              id="mon-thi-ma"
              className="form-input admin-mon-thi-edit-ma-input"
              type="text"
              value={ma}
              onChange={(e) => setMa(e.target.value)}
              placeholder="hinh_hoa_chan_dung"
              spellCheck={false}
            />
          </div>
        </section>

        <section className="admin-mon-thi-edit-sec">
          <h3 className="admin-mon-thi-edit-sec-title">Phân loại</h3>
          <div className="form-group">
            <span className="form-label">Loại *</span>
            <div className="admin-mon-loai-chips" role="group" aria-label="Loại môn">
              {LOAI_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`admin-mon-loai-chip${loai === k ? " is-active" : ""}`}
                  aria-pressed={loai === k}
                  onClick={() => setLoai(k)}
                >
                  {MON_THI_LOAI_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <span className="form-label">Trạng thái</span>
            <div className="admin-mon-status-chips" role="group" aria-label="Trạng thái">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`admin-mon-status-chip admin-mon-status-chip--${o.value}${trang_thai === o.value ? " is-active" : ""}`}
                  aria-pressed={trang_thai === o.value}
                  onClick={() => setTrangThai(o.value)}
                >
                  {o.label}
                </button>
              ))}
              {trang_thai &&
              !STATUS_OPTIONS.some((o) => o.value === trang_thai) ? (
                <button
                  type="button"
                  className="admin-mon-status-chip is-active"
                  aria-pressed
                >
                  {trang_thai}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-mon-thi-edit-sec admin-mon-khoi-ref">
          <div className="admin-mon-khoi-ref-head">
            <h3 className="admin-mon-thi-edit-sec-title">Khối thi</h3>
            {onGoToKhoiTab ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onGoToKhoiTab}
              >
                Tab Khối thi →
              </button>
            ) : null}
          </div>
          {!isCreate && khoiForMon.length > 0 ? (
            <ul className="admin-mon-khoi-ref-list">
              {khoiForMon.map((k) => (
                <li key={k.id}>
                  <span className="admin-khoi-chip">{k.ma_to_hop}</span>
                  <span className="admin-mon-khoi-ref-ten">{k.ten_to_hop}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="form-hint admin-mon-khoi-ref-hint">
              {isCreate
                ? "Sau khi tạo môn, gán vào khối ở tab Khối thi (A00, A01…)."
                : "Môn chưa nằm trong khối nào — mở tab Khối thi để thêm vào A00, A01…"}
            </p>
          )}
        </section>
      </div>

      <div className="admin-edit-form__footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? "Đang lưu…"
            : isCreate
              ? "Thêm môn thi"
              : "Lưu môn thi"}
        </button>
      </div>
    </form>
  );
}

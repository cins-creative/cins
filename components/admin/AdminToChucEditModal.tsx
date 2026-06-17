"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import type {
  AdminToChucDetail,
  AdminToChucListRow,
} from "@/lib/admin/to-chuc-types";
import {
  ADMIN_TO_CHUC_HOAT_DONG_OPTIONS,
  ADMIN_TO_CHUC_TIN_CAY_OPTIONS,
} from "@/lib/admin/to-chuc-types";
import { TINH_THANH_OPTIONS } from "@/lib/truong/contact";
import { MO_TA_SHORT_MAX } from "@/lib/truong/mo-ta-short";

type Props = {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (row: AdminToChucListRow) => void;
};

export function AdminToChucEditModal({
  orgId,
  open,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [ten, setTen] = useState("");
  const [slug, setSlug] = useState("");
  const [loaiLabel, setLoaiLabel] = useState("");
  const [moTa, setMoTa] = useState("");
  const [tinhThanh, setTinhThanh] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [dienThoai, setDienThoai] = useState("");
  const [emailLienHe, setEmailLienHe] = useState("");
  const [trangThaiTinCay, setTrangThaiTinCay] = useState("binh_thuong");
  const [trangThaiHoatDong, setTrangThaiHoatDong] = useState("dang_hoat_dong");

  useEffect(() => {
    if (!open || !orgId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaveMsg(null);

    void fetch(`/api/admin/to-chuc/${encodeURIComponent(orgId)}`)
      .then(async (res) => {
        const json = (await res.json()) as { org?: AdminToChucDetail; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Không tải được tổ chức.");
        }
        return json.org!;
      })
      .then((org) => {
        if (cancelled) return;
        setTen(org.ten);
        setSlug(org.slug);
        setLoaiLabel(org.loaiLabel);
        setMoTa(org.moTa ?? "");
        setTinhThanh(org.tinhThanh ?? "");
        setDiaChi(org.diaChi ?? "");
        setDienThoai(org.dienThoai ?? "");
        setEmailLienHe(org.emailLienHe ?? "");
        setTrangThaiTinCay(org.trangThaiTinCay);
        setTrangThaiHoatDong(org.trangThaiHoatDong);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Lỗi tải tổ chức.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, orgId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/to-chuc/${encodeURIComponent(orgId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten,
          slug,
          moTa: moTa.trim() || null,
          tinhThanh: tinhThanh || null,
          diaChi: diaChi.trim() || null,
          dienThoai: dienThoai.trim() || null,
          emailLienHe: emailLienHe.trim() || null,
          trangThaiTinCay,
          trangThaiHoatDong,
        }),
      });
      const json = (await res.json()) as {
        row?: AdminToChucListRow;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Không lưu được thay đổi.");
      }
      if (!json.row) {
        throw new Error("Phản hồi không hợp lệ.");
      }
      setSaveMsg("Đã lưu tổ chức.");
      onSaved(json.row);
      window.setTimeout(() => onClose(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được thay đổi.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="admin-confirm-backdrop open"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-to-chuc-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-to-chuc-edit-title"
      >
        <div className="admin-to-chuc-edit-dialog__header">
          <h2 id="admin-to-chuc-edit-title" className="admin-to-chuc-edit-dialog__title">
            Sửa tổ chức
          </h2>
          <button
            type="button"
            className="so-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={2.2} aria-hidden />
          </button>
        </div>

        <form className="admin-edit-form admin-to-chuc-edit-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="admin-to-chuc-edit-dialog__body">
            {loading ? (
              <p className="admin-to-chuc-edit-loading">
                <Loader2 size={16} className="admin-to-chuc-spin" aria-hidden />
                Đang tải…
              </p>
            ) : null}

            {error ? (
              <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
                {error}
              </p>
            ) : null}

            {saveMsg ? (
              <p className="admin-edit-form__msg admin-edit-form__msg--ok" role="status">
                {saveMsg}
              </p>
            ) : null}

            {!loading && !error ? (
              <div className="admin-edit-form__fields">
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-to-chuc-ten">
                    Tên tổ chức *
                  </label>
                  <input
                    id="admin-to-chuc-ten"
                    className="form-input"
                    type="text"
                    value={ten}
                    onChange={(e) => setTen(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="admin-to-chuc-slug">
                    Slug / đường dẫn *
                  </label>
                  <input
                    id="admin-to-chuc-slug"
                    className="form-input"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    spellCheck={false}
                    autoCapitalize="off"
                  />
                  <p className="form-hint">Chữ thường, số, gạch ngang — vd. dai-hoc-kien-truc-tphcm</p>
                </div>

                <div className="form-group">
                  <span className="form-label">Loại tổ chức</span>
                  <p className="admin-to-chuc-edit-readonly">{loaiLabel}</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="admin-to-chuc-mota">
                    Mô tả ngắn
                  </label>
                  <textarea
                    id="admin-to-chuc-mota"
                    className="form-input"
                    rows={3}
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    maxLength={MO_TA_SHORT_MAX}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="admin-to-chuc-tinh">
                      Tỉnh / thành
                    </label>
                    <select
                      id="admin-to-chuc-tinh"
                      className="form-input"
                      value={tinhThanh}
                      onChange={(e) => setTinhThanh(e.target.value)}
                    >
                      {TINH_THANH_OPTIONS.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="admin-to-chuc-tincay">
                      Tin cậy
                    </label>
                    <select
                      id="admin-to-chuc-tincay"
                      className="form-input"
                      value={trangThaiTinCay}
                      onChange={(e) => setTrangThaiTinCay(e.target.value)}
                    >
                      {ADMIN_TO_CHUC_TIN_CAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="admin-to-chuc-hoatdong">
                    Trạng thái hoạt động
                  </label>
                  <select
                    id="admin-to-chuc-hoatdong"
                    className="form-input"
                    value={trangThaiHoatDong}
                    onChange={(e) => setTrangThaiHoatDong(e.target.value)}
                  >
                    {ADMIN_TO_CHUC_HOAT_DONG_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="admin-to-chuc-diachi">
                    Địa chỉ
                  </label>
                  <input
                    id="admin-to-chuc-diachi"
                    className="form-input"
                    type="text"
                    value={diaChi}
                    onChange={(e) => setDiaChi(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="admin-to-chuc-phone">
                      Điện thoại
                    </label>
                    <input
                      id="admin-to-chuc-phone"
                      className="form-input"
                      type="text"
                      value={dienThoai}
                      onChange={(e) => setDienThoai(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="admin-to-chuc-email">
                      Email liên hệ
                    </label>
                    <input
                      id="admin-to-chuc-email"
                      className="form-input"
                      type="email"
                      value={emailLienHe}
                      onChange={(e) => setEmailLienHe(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="admin-edit-form__footer admin-to-chuc-edit-dialog__footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || saving || Boolean(error && !ten)}
            >
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

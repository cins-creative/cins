"use client";

import {
  Dices,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  fetchShopCuaHangClient,
  fetchUuDaiCached,
  invalidateUuDaiCache,
  peekUuDai,
} from "@/lib/shop/client-fetch-cache";
import type {
  ShopCuaHang,
  ShopLoaiGiam,
  ShopVoucher,
} from "@/lib/shop/types";

import { ShopVoucherCard } from "./ShopVoucherCard";
import "./shop-dashboard.css";

type VoucherFormState = {
  ma: string;
  ten: string;
  loaiGiam: ShopLoaiGiam;
  giaTri: string;
  giamToiDa: string;
  donToiThieu: string;
  soLuongTong: string;
  gioiHanMoiNguoi: string;
  batDau: string;
  ketThuc: string;
  congKhai: boolean;
};

const EMPTY_FORM = (): VoucherFormState => ({
  ma: "",
  ten: "",
  loaiGiam: "phan_tram",
  giaTri: "",
  giamToiDa: "",
  donToiThieu: "0",
  soLuongTong: "",
  gioiHanMoiNguoi: "1",
  batDau: "",
  ketThuc: "",
  congKhai: true,
});

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function randomMa(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function voucherTrangThai(v: ShopVoucher): string {
  if (!v.kichHoat) return "Tắt";
  const now = Date.now();
  if (v.batDau) {
    const start = new Date(v.batDau).getTime();
    if (!Number.isNaN(start) && start > now) return "Hẹn giờ";
  }
  if (v.ketThuc) {
    const end = new Date(v.ketThuc).getTime();
    if (!Number.isNaN(end) && end <= now) return "Hết hạn";
  }
  if (v.soLuongTong != null && v.soLuongDaDung >= v.soLuongTong) {
    return "Hết lượt";
  }
  return "Đang chạy";
}

function voucherToForm(v: ShopVoucher): VoucherFormState {
  return {
    ma: v.ma,
    ten: v.ten,
    loaiGiam: v.loaiGiam,
    giaTri: String(v.giaTri),
    giamToiDa: v.giamToiDa != null ? String(v.giamToiDa) : "",
    donToiThieu: String(v.donToiThieu),
    soLuongTong: v.soLuongTong != null ? String(v.soLuongTong) : "",
    gioiHanMoiNguoi: String(v.gioiHanMoiNguoi),
    batDau: isoToDatetimeLocal(v.batDau),
    ketThuc: isoToDatetimeLocal(v.ketThuc),
    congKhai: v.congKhai,
  };
}

function shopBannerUrl(shop: ShopCuaHang | null): string | null {
  if (!shop) return null;
  return (
    shop.coverUrl ??
    (shop.bannerSuKienHien ? shop.bannerSuKienUrl : null) ??
    null
  );
}

export function ShopUuDaiVoucherClient() {
  const [vouchers, setVouchers] = useState<ShopVoucher[]>(
    () => peekUuDai()?.vouchers ?? [],
  );
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const [loading, setLoading] = useState(!peekUuDai());
  const [err, setErr] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchUuDaiCached(force ? { force: true } : undefined);
      setVouchers(data.vouchers);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được voucher.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchShopCuaHangClient()
      .then((data) => setShop(data.shop))
      .catch(() => undefined);
  }, []);

  const shopTen = shop?.ten?.trim() || null;
  const shopAvatar = shop?.avatarUrl ?? null;
  const shopBanner = shopBannerUrl(shop);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setFormErr(null);
    setDialogOpen(true);
  };

  const openEdit = (v: ShopVoucher) => {
    setEditingId(v.id);
    setForm(voucherToForm(v));
    setFormErr(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingId(null);
    setFormErr(null);
  };

  async function handleToggle(v: ShopVoucher) {
    setToggleBusy(v.id);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/voucher/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kichHoat: !v.kichHoat }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopVoucher;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Không cập nhật được.");
      invalidateUuDaiCache();
      setVouchers((prev) =>
        prev.map((item) =>
          item.id === v.id
            ? { ...item, kichHoat: json?.item?.kichHoat ?? !v.kichHoat }
            : item,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không cập nhật được.");
    } finally {
      setToggleBusy(null);
    }
  }

  async function handleDelete(v: ShopVoucher) {
    if (!window.confirm(`Xóa voucher «${v.ma}»?`)) return;
    setErr(null);
    try {
      const res = await fetch(`/api/shop/voucher/${v.id}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Không xóa được.");
      invalidateUuDaiCache();
      setVouchers((prev) => prev.filter((item) => item.id !== v.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không xóa được.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormErr(null);
    const payload = {
      ma: form.ma.trim().toUpperCase(),
      ten: form.ten.trim(),
      loaiGiam: form.loaiGiam,
      giaTri: Number(form.giaTri),
      giamToiDa:
        form.loaiGiam === "phan_tram" && form.giamToiDa.trim()
          ? Number(form.giamToiDa)
          : null,
      donToiThieu: Number(form.donToiThieu) || 0,
      soLuongTong: form.soLuongTong.trim()
        ? Number(form.soLuongTong)
        : null,
      gioiHanMoiNguoi: Number(form.gioiHanMoiNguoi) || 0,
      batDau: datetimeLocalToIso(form.batDau),
      ketThuc: datetimeLocalToIso(form.ketThuc),
      congKhai: form.congKhai,
      designKieu: "mac_dinh" as const,
      designMauNen: null,
      designMauChu: null,
      designNhan: null,
      designAnhId: null,
    };
    try {
      const url = editingId
        ? `/api/shop/voucher/${editingId}`
        : "/api/shop/voucher";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopVoucher;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Không lưu được.");
      invalidateUuDaiCache();
      if (json?.item) {
        setVouchers((prev) => {
          const idx = prev.findIndex((item) => item.id === json.item!.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = json.item!;
            return next;
          }
          return [json.item!, ...prev];
        });
      } else {
        await load(true);
      }
      closeDialog();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  function copyMa(ma: string) {
    void navigator.clipboard.writeText(ma).then(() => {
      setCopyOk(ma);
      window.setTimeout(() => setCopyOk(null), 2000);
    });
  }

  const previewVoucher: ShopVoucher = {
    id: "preview",
    idNguoiDung: "",
    ma: form.ma.trim().toUpperCase() || "MAVOUCHER",
    ten: form.ten.trim() || "Tên voucher",
    moTa: null,
    loaiGiam: form.loaiGiam,
    giaTri: Number(form.giaTri) || 10,
    giamToiDa:
      form.loaiGiam === "phan_tram" && form.giamToiDa.trim()
        ? Number(form.giamToiDa)
        : null,
    donToiThieu: Number(form.donToiThieu) || 0,
    soLuongTong: form.soLuongTong.trim()
      ? Number(form.soLuongTong)
      : null,
    soLuongDaDung: 0,
    gioiHanMoiNguoi: Number(form.gioiHanMoiNguoi) || 1,
    batDau: null,
    ketThuc: form.ketThuc ? datetimeLocalToIso(form.ketThuc) : null,
    kichHoat: true,
    congKhai: form.congKhai,
    designKieu: "mac_dinh",
    designAnhId: null,
    designAnhUrl: null,
    designMauNen: null,
    designMauChu: null,
    designNhan: null,
    taoLuc: new Date().toISOString(),
  };

  const dialog =
    dialogOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="shop-kho-nhom-backdrop"
            role="presentation"
          >
            <div
              className="shop-kho-nhom-dialog shop-uu-dai-dialog shop-uu-dai-dialog--wide shop-uu-dai-dialog--voucher"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-voucher-dialog-title"
              onClick={(ev) => ev.stopPropagation()}
            >
              <header className="shop-kho-nhom-dialog-head">
                <h3 id="shop-voucher-dialog-title">
                  {editingId ? "Sửa voucher" : "Tạo voucher"}
                </h3>
                <button
                  type="button"
                  className="shop-kho-nhom-dialog-close"
                  onClick={closeDialog}
                  aria-label="Đóng"
                >
                  <X size={18} aria-hidden />
                </button>
              </header>
              <form
                className="shop-kho-nhom-panel shop-uu-dai-form shop-uu-dai-form--split"
                onSubmit={handleSubmit}
              >
                <div className="shop-uu-dai-form-col">
                  {formErr ? (
                    <p className="shop-dash-err-inline">{formErr}</p>
                  ) : null}
                  <label className="shop-dash-field">
                    Mã voucher
                    <div className="shop-uu-dai-ma-row">
                      <input
                        required
                        value={form.ma}
                        onChange={(ev) =>
                          setForm((p) => ({
                            ...p,
                            ma: ev.target.value.toUpperCase(),
                          }))
                        }
                        maxLength={20}
                        pattern="[A-Z0-9]{3,20}"
                        title="3–20 ký tự A–Z / 0–9"
                      />
                      <button
                        type="button"
                        className="shop-uu-dai-random-ma"
                        onClick={() =>
                          setForm((p) => ({ ...p, ma: randomMa() }))
                        }
                      >
                        <Dices size={16} aria-hidden />
                        Ngẫu nhiên
                      </button>
                    </div>
                  </label>
                  <label className="shop-dash-field">
                    Tên hiển thị
                    <input
                      required
                      value={form.ten}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, ten: ev.target.value }))
                      }
                      maxLength={80}
                    />
                  </label>
                  <div
                    className="shop-uu-dai-loai-giam-toggle"
                    role="radiogroup"
                    aria-label="Loại giảm"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.loaiGiam === "phan_tram"}
                      className={
                        form.loaiGiam === "phan_tram" ? "is-on" : undefined
                      }
                      onClick={() =>
                        setForm((p) => ({ ...p, loaiGiam: "phan_tram" }))
                      }
                    >
                      Phần trăm (%)
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.loaiGiam === "so_tien"}
                      className={
                        form.loaiGiam === "so_tien" ? "is-on" : undefined
                      }
                      onClick={() =>
                        setForm((p) => ({ ...p, loaiGiam: "so_tien" }))
                      }
                    >
                      Số tiền (₫)
                    </button>
                  </div>
                  <div className="shop-dash-form">
                    <label className="shop-dash-field">
                      Giá trị
                      <input
                        required
                        type="number"
                        min={form.loaiGiam === "phan_tram" ? 1 : 1000}
                        max={form.loaiGiam === "phan_tram" ? 100 : undefined}
                        step={form.loaiGiam === "phan_tram" ? 1 : 1000}
                        value={form.giaTri}
                        onChange={(ev) =>
                          setForm((p) => ({ ...p, giaTri: ev.target.value }))
                        }
                      />
                    </label>
                    {form.loaiGiam === "phan_tram" ? (
                      <label className="shop-dash-field">
                        Trần giảm (₫)
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={form.giamToiDa}
                          onChange={(ev) =>
                            setForm((p) => ({
                              ...p,
                              giamToiDa: ev.target.value,
                            }))
                          }
                          placeholder="Không giới hạn"
                        />
                      </label>
                    ) : null}
                  </div>
                  <div className="shop-dash-form">
                    <label className="shop-dash-field">
                      Đơn tối thiểu (₫)
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={form.donToiThieu}
                        onChange={(ev) =>
                          setForm((p) => ({
                            ...p,
                            donToiThieu: ev.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="shop-dash-field">
                      Số voucher tung ra
                      <input
                        type="number"
                        min={1}
                        value={form.soLuongTong}
                        onChange={(ev) =>
                          setForm((p) => ({
                            ...p,
                            soLuongTong: ev.target.value,
                          }))
                        }
                        placeholder="Không giới hạn"
                      />
                    </label>
                  </div>
                  <label className="shop-dash-field">
                    Giới hạn mỗi người
                    <input
                      type="number"
                      min={0}
                      value={form.gioiHanMoiNguoi}
                      onChange={(ev) =>
                        setForm((p) => ({
                          ...p,
                          gioiHanMoiNguoi: ev.target.value,
                        }))
                      }
                    />
                    <span className="shop-uu-dai-hint">0 = không giới hạn</span>
                  </label>
                  <div className="shop-dash-form">
                    <label className="shop-dash-field">
                      Bắt đầu
                      <input
                        type="datetime-local"
                        value={form.batDau}
                        onChange={(ev) =>
                          setForm((p) => ({ ...p, batDau: ev.target.value }))
                        }
                      />
                    </label>
                    <label className="shop-dash-field">
                      Kết thúc
                      <input
                        type="datetime-local"
                        value={form.ketThuc}
                        onChange={(ev) =>
                          setForm((p) => ({ ...p, ketThuc: ev.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <label className="shop-uu-dai-check">
                    <input
                      type="checkbox"
                      checked={form.congKhai}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, congKhai: ev.target.checked }))
                      }
                    />
                    Hiện ở trang /cua-hang (săn voucher)
                  </label>
                </div>
                <div className="shop-uu-dai-preview-col">
                  <p className="shop-uu-dai-preview-label">Xem trước</p>
                  <ShopVoucherCard
                    ma={previewVoucher.ma}
                    ten={previewVoucher.ten}
                    loaiGiam={previewVoucher.loaiGiam}
                    giaTri={previewVoucher.giaTri}
                    designKieu="mac_dinh"
                    donToiThieu={previewVoucher.donToiThieu}
                    soLuongTong={previewVoucher.soLuongTong}
                    ketThuc={previewVoucher.ketThuc}
                    tenCuaHang={shopTen}
                    shopAvatarUrl={shopAvatar}
                    shopBannerUrl={shopBanner}
                  />
                </div>
                <div className="shop-uu-dai-dialog-actions shop-uu-dai-dialog-actions--full">
                  <button type="button" onClick={closeDialog} disabled={saving}>
                    Hủy
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 size={16} className="shop-spin" aria-hidden />
                    ) : null}
                    {editingId ? "Lưu" : "Tạo voucher"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (loading && vouchers.length === 0) {
    return (
      <div className="shop-dash-loading" aria-busy="true">
        <Loader2 size={20} className="shop-spin" aria-hidden />
        Đang tải…
      </div>
    );
  }

  const liveCount = vouchers.filter(
    (v) => voucherTrangThai(v) === "Đang chạy",
  ).length;

  return (
    <>
      {err ? <p className="shop-dash-err">{err}</p> : null}
      {copyOk ? (
        <p className="shop-uu-dai-copy-toast" role="status">
          Đã sao chép mã {copyOk}
        </p>
      ) : null}
      <section className="shop-dash-card shop-uu-dai-panel shop-uu-dai-voucher-panel">
        <header className="shop-uu-dai-combo-hero">
          <div className="shop-uu-dai-combo-hero-copy">
            <p className="shop-uu-dai-combo-kicker shop-uu-dai-voucher-kicker">
              Voucher
            </p>
            <h2>Mã giảm cho khách nhập lúc thanh toán</h2>
          </div>
          <div className="shop-uu-dai-combo-hero-aside">
            {vouchers.length > 0 ? (
              <dl
                className="shop-uu-dai-combo-stats"
                aria-label="Tóm tắt voucher"
              >
                <div>
                  <dt>Tổng</dt>
                  <dd>{vouchers.length}</dd>
                </div>
                <div>
                  <dt>Đang chạy</dt>
                  <dd>{liveCount}</dd>
                </div>
              </dl>
            ) : null}
            <button
              type="button"
              className="shop-uu-dai-combo-cta shop-uu-dai-voucher-cta"
              onClick={openCreate}
            >
              <Plus size={18} strokeWidth={2.2} aria-hidden />
              Tạo voucher
            </button>
          </div>
        </header>

        {vouchers.length === 0 ? (
          <div className="shop-uu-dai-voucher-empty">
            <div className="shop-uu-dai-voucher-empty-art" aria-hidden>
              <span className="shop-uu-dai-voucher-ticket">
                <span className="shop-uu-dai-voucher-ticket-code">SAVE10</span>
                <span className="shop-uu-dai-voucher-ticket-off">−10%</span>
              </span>
              <span className="shop-uu-dai-voucher-ticket is-back" />
            </div>
            <div className="shop-uu-dai-voucher-empty-body">
              <h3>Chưa có voucher nào</h3>
              <p>
                Ví dụ: mã <strong>WELCOME</strong> giảm 20k cho đơn từ 200k —
                khách nhập lúc checkout hoặc săn trên trang cửa hàng.
              </p>
              <button
                type="button"
                className="shop-uu-dai-combo-cta is-secondary shop-uu-dai-voucher-cta"
                onClick={openCreate}
              >
                <Plus size={18} strokeWidth={2.2} aria-hidden />
                Tạo voucher đầu tiên
              </button>
            </div>
          </div>
        ) : (
          <ul className="shop-uu-dai-voucher-grid">
            {vouchers.map((v) => {
              const status = voucherTrangThai(v);
              const progress =
                v.soLuongTong != null && v.soLuongTong > 0
                  ? Math.min(
                      100,
                      (v.soLuongDaDung / v.soLuongTong) * 100,
                    )
                  : null;
              return (
                <li
                  key={v.id}
                  className={`shop-uu-dai-voucher-item${
                    status === "Đang chạy" ? " is-live" : ""
                  }${!v.kichHoat ? " is-off" : ""}`}
                >
                  <ShopVoucherCard
                    ma={v.ma}
                    ten={v.ten}
                    loaiGiam={v.loaiGiam}
                    giaTri={v.giaTri}
                    designKieu="mac_dinh"
                    donToiThieu={v.donToiThieu}
                    soLuongTong={v.soLuongTong}
                    soLuongDaDung={v.soLuongDaDung}
                    ketThuc={v.ketThuc}
                    tenCuaHang={shopTen}
                    shopAvatarUrl={shopAvatar}
                    shopBannerUrl={shopBanner}
                    onCopy={() => copyMa(v.ma)}
                  />
                  <div className="shop-uu-dai-voucher-toolbar">
                    <span
                      className={`shop-uu-dai-status${
                        status === "Đang chạy" ? " is-live" : ""
                      }${
                        status === "Hết hạn" ||
                        status === "Tắt" ||
                        status === "Hết lượt"
                          ? " is-muted"
                          : ""
                      }`}
                    >
                      {status}
                    </span>
                    <div className="shop-uu-dai-voucher-toolbar-actions">
                      <button
                        type="button"
                        className={`shop-dash-switch${v.kichHoat ? " on" : ""}`}
                        role="switch"
                        aria-checked={v.kichHoat}
                        aria-label={
                          v.kichHoat ? "Tắt voucher" : "Bật voucher"
                        }
                        disabled={toggleBusy === v.id}
                        onClick={() => void handleToggle(v)}
                      >
                        <span className="shop-dash-switch-knob" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="shop-uu-dai-icon-btn"
                        onClick={() => openEdit(v)}
                        aria-label="Sửa voucher"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="shop-uu-dai-icon-btn is-danger"
                        onClick={() => void handleDelete(v)}
                        aria-label="Xóa voucher"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {progress != null ? (
                    <div
                      className="shop-uu-dai-progress"
                      role="progressbar"
                      aria-valuenow={v.soLuongDaDung}
                      aria-valuemin={0}
                      aria-valuemax={v.soLuongTong ?? 0}
                      aria-label="Lượt đã dùng"
                    >
                      <div className="shop-uu-dai-progress-track">
                        <div
                          className="shop-uu-dai-progress-bar"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="shop-uu-dai-progress-text">
                        {v.soLuongDaDung} / {v.soLuongTong} đã dùng
                      </span>
                    </div>
                  ) : (
                    <p className="shop-uu-dai-progress-unlimited">
                      Không giới hạn lượt
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {dialog}
    </>
  );
}

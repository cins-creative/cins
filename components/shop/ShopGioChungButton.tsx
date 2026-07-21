"use client";

import {
  Check,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ShopMuaHistory } from "@/components/shop/ShopMuaHistory";

import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { SHOP_BUYER_TRANSFER_DISCLAIMER } from "@/lib/shop/terms";
import type {
  ShopDonHang,
  ShopGioChung,
  ShopGioChungNhom,
} from "@/lib/shop/types";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";

import "./shop-gio-chung.css";

/** Event để các nơi khác báo giỏ chung vừa đổi (badge tự refresh). */
export const GIO_CHUNG_CHANGED_EVENT = "cins:gio-chung-changed";
/** Event để nơi khác mở panel giỏ chung (vd. nút giỏ trên storefront). */
export const GIO_CHUNG_OPEN_EVENT = "cins:gio-chung-open";

function money(n: number, tienTe: string): string {
  return `${n.toLocaleString("vi-VN")} ${tienTe}`;
}

export function ShopGioChungButton() {
  const [open, setOpen] = useState(false);
  const [gio, setGio] = useState<ShopGioChung | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyBt, setBusyBt] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  /** Đơn đã gửi trong phiên này — hiển thị card xanh phía trên. */
  const [sentDons, setSentDons] = useState<ShopDonHang[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/gio-chung", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải giỏ.");
        return;
      }
      setGio(json?.gio ?? { id: null, nhom: [], tongSoDong: 0 });
    } catch {
      setErr("Không tải giỏ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPortalReady(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  /* Refresh badge khi nơi khác thêm hàng vào giỏ chung; mở panel theo event. */
  useEffect(() => {
    const onChanged = () => void load();
    const onOpen = () => setOpen(true);
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
    window.addEventListener(GIO_CHUNG_OPEN_EVENT, onOpen);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
      window.removeEventListener(GIO_CHUNG_OPEN_EVENT, onOpen);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const patchQty = useCallback(
    async (idBienThe: string, soLuong: number) => {
      setBusyBt(idBienThe);
      setErr(null);
      try {
        const res = await fetch("/api/shop/gio-chung", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idBienThe, soLuong }),
        });
        const json = (await res.json().catch(() => null)) as {
          gio?: ShopGioChung;
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không cập nhật giỏ.");
          return;
        }
        if (json?.gio) setGio(json.gio);
        window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
      } catch {
        setErr("Không cập nhật giỏ.");
      } finally {
        setBusyBt(null);
      }
    },
    [],
  );

  const onSent = useCallback((don: ShopDonHang) => {
    setSentDons((prev) => [don, ...prev.filter((d) => d.id !== don.id)]);
    void load();
  }, [load]);

  const count = gio?.tongSoDong ?? 0;
  const groups = gio?.nhom ?? [];
  const sentSellerIds = new Set(sentDons.map((d) => d.idNguoiBan));
  /* Ẩn nhóm đã gửi khỏi list chờ (đã có card xanh). */
  const pendingGroups = groups.filter((g) => !sentSellerIds.has(g.idNguoiBan));

  const panel =
    open && portalReady
      ? createPortal(
          <div
            className="gio-chung-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <aside
              className="gio-chung-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Giỏ chờ mua"
            >
              <header className="gio-chung-hdr">
                <div>
                  <p className="gio-chung-kicker">Giỏ chờ mua</p>
                  <h2>Hàng của bạn</h2>
                </div>
                <div className="gio-chung-hdr-actions">
                  <button
                    type="button"
                    className="gio-chung-history-btn"
                    aria-label="Lịch sử mua hàng"
                    title="Lịch sử mua hàng"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History size={17} strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="gio-chung-close"
                    aria-label="Đóng"
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </header>

              {err ? (
                <p className="gio-chung-err" role="alert">
                  {err}
                </p>
              ) : null}

              <div className="gio-chung-body">
                {sentDons.map((don) => (
                  <SentCard key={don.id} don={don} />
                ))}

                {loading && groups.length === 0 && sentDons.length === 0 ? (
                  <p className="gio-chung-muted">
                    <Loader2 size={16} className="gio-chung-spin" aria-hidden />{" "}
                    Đang tải…
                  </p>
                ) : pendingGroups.length === 0 && sentDons.length === 0 ? (
                  <div className="gio-chung-empty">
                    <ShoppingBag size={26} strokeWidth={2} aria-hidden />
                    <p>Giỏ chờ mua còn trống</p>
                    <span>Thêm hàng từ các cửa hàng để gom vào đây.</span>
                  </div>
                ) : (
                  pendingGroups.map((group) => (
                    <ShopGioChungGroup
                      key={group.idNguoiBan}
                      group={group}
                      busyBt={busyBt}
                      onQty={patchQty}
                      onSent={onSent}
                    />
                  ))
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  /* Giỏ trống + panel đóng → ẩn hẳn nút khỏi topbar. */
  const showTrigger = count > 0 || open;

  return (
    <>
      {showTrigger ? (
        <div className="gio-chung">
          <button
            type="button"
            className={`gio-chung-trigger${count > 0 ? " has-items" : ""}${open ? " is-open" : ""}`}
            aria-label={
              count > 0 ? `Giỏ chờ mua, ${count} món` : "Giỏ chờ mua"
            }
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
          >
            <ShoppingBag size={18} strokeWidth={2} aria-hidden />
            {count > 0 ? (
              <span className="gio-chung-count" aria-hidden>
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
      {panel}
      <ShopMuaHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}

/* ── Card đơn đã gửi (xanh) ────────────────────────────────────── */
function SentCard({ don }: { don: ShopDonHang }) {
  const snap = don.thanhToanSnapshot;
  const qrUrl =
    snap?.qrAnhUrl ??
    (snap
      ? buildVietQrImageUrl({
          nganHang: snap.nganHang,
          soTaiKhoan: snap.soTaiKhoan,
        })
      : null);
  return (
    <section className="gio-chung-group is-sent">
      <div className="gio-chung-group-hdr">
        <span className="gio-chung-shop">
          <Check size={15} strokeWidth={2.6} aria-hidden />
          {don.banTen ?? "Cửa hàng"}
        </span>
        <span className="gio-chung-sent-badge">Đã gửi đơn</span>
      </div>
      <p className="gio-chung-sent-ma">
        Mã đơn <strong>{don.maDon ?? don.id.slice(0, 8)}</strong> ·{" "}
        {money(don.tongTien, don.tienTe)}
      </p>
      {snap ? (
        <div className="gio-chung-pay">
          <div className="gio-chung-pay-info">
            <p>
              <strong>{snap.nganHang}</strong>
            </p>
            <p>
              STK: <strong>{snap.soTaiKhoan}</strong>
            </p>
            <p>Chủ TK: {snap.tenChuTaiKhoan}</p>
            <p>
              Nội dung CK: <strong>{snap.noiDungCk}</strong>
            </p>
          </div>
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR chuyển khoản" className="gio-chung-qr" />
          ) : null}
        </div>
      ) : null}
      {don.bienLaiAnhUrl ? (
        <div className="gio-chung-sent-bill">
          <span className="gio-chung-sent-bill-label">Biên lai đã gửi</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={don.bienLaiAnhUrl} alt="Biên lai chuyển khoản" />
        </div>
      ) : null}
      <p className="gio-chung-sent-note">
        Chuyển khoản trực tiếp cho người bán — CINs không trung gian tiền.
      </p>
    </section>
  );
}

/* ── Một nhóm cửa hàng ─────────────────────────────────────────── */
type GroupProps = {
  group: ShopGioChungNhom;
  busyBt: string | null;
  onQty: (idBienThe: string, soLuong: number) => Promise<void>;
  onSent: (don: ShopDonHang) => void;
};

function ShopGioChungGroup({ group, busyBt, onQty, onSent }: GroupProps) {
  const [checkout, setCheckout] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [ghiChu, setGhiChu] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pay, setPay] = useState<{
    nganHang: string;
    soTaiKhoan: string;
    tenChuTaiKhoan: string;
    chinhSach: string | null;
  } | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const payFetched = useRef(false);

  const [billUrl, setBillUrl] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [billUploading, setBillUploading] = useState(false);
  const [billErr, setBillErr] = useState<string | null>(null);
  const billFileRef = useRef<HTMLInputElement>(null);
  const billLocalUrlRef = useRef<string | null>(null);

  const clearBillLocalUrl = useCallback(() => {
    if (billLocalUrlRef.current) {
      URL.revokeObjectURL(billLocalUrlRef.current);
      billLocalUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => clearBillLocalUrl(), [clearBillLocalUrl]);

  const uploadBill = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!isAllowedUploadImageFile(file)) {
        setBillErr("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.");
        return;
      }
      if (file.size > MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES) {
        setBillErr(cloudflareImageTooLargeError());
        return;
      }
      clearBillLocalUrl();
      const localUrl = URL.createObjectURL(file);
      billLocalUrlRef.current = localUrl;
      setBillUrl(localUrl);
      setBillId(null);
      setBillUploading(true);
      setBillErr(null);
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 45_000);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/post-image/upload", {
          method: "POST",
          body: fd,
          signal: ctrl.signal,
        });
        const json = (await res.json().catch(() => null)) as {
          url?: string;
          imageId?: string;
          error?: string;
        } | null;
        if (!res.ok || !json?.url) {
          clearBillLocalUrl();
          setBillUrl(null);
          setBillId(null);
          setBillErr(json?.error ?? "Tải ảnh thất bại. Thử lại.");
          return;
        }
        clearBillLocalUrl();
        setBillUrl(json.url);
        setBillId(json.imageId?.trim() || null);
      } catch {
        clearBillLocalUrl();
        setBillUrl(null);
        setBillId(null);
        setBillErr("Tải ảnh thất bại. Thử lại.");
      } finally {
        window.clearTimeout(timer);
        setBillUploading(false);
      }
    },
    [clearBillLocalUrl],
  );

  const removeBill = useCallback(() => {
    clearBillLocalUrl();
    setBillUrl(null);
    setBillId(null);
    setBillErr(null);
  }, [clearBillLocalUrl]);

  /** Biên lai đã upload xong (không phải blob tạm). */
  const billOk =
    Boolean(billUrl) && !billUploading && !billUrl?.startsWith("blob:");

  const loadPay = useCallback(async () => {
    if (payFetched.current) return;
    payFetched.current = true;
    setPayLoading(true);
    setPayErr(null);
    try {
      const res = await fetch(
        `/api/shop/cua-hang/thanh-toan?sellerId=${encodeURIComponent(group.idNguoiBan)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        payment?: {
          nganHang?: string;
          soTaiKhoan?: string;
          tenChuTaiKhoan?: string;
        } | null;
        shop?: { chinhSach?: string | null } | null;
        error?: string;
      } | null;
      if (!res.ok || !json?.payment) {
        setPayErr(json?.error ?? "Người bán chưa thêm tài khoản nhận tiền.");
        return;
      }
      setPay({
        nganHang: json.payment.nganHang ?? "",
        soTaiKhoan: json.payment.soTaiKhoan ?? "",
        tenChuTaiKhoan: json.payment.tenChuTaiKhoan ?? "",
        chinhSach: json.shop?.chinhSach ?? null,
      });
    } catch {
      setPayErr("Không tải được thông tin nhận tiền.");
    } finally {
      setPayLoading(false);
    }
  }, [group.idNguoiBan]);

  const toggleCheckout = useCallback(() => {
    setCheckout((v) => {
      const next = !v;
      if (next) void loadPay();
      return next;
    });
  }, [loadPay]);

  const submit = useCallback(async () => {
    setSending(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/gio-chung/don", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: group.idNguoiBan,
          ghiChu: ghiChu.trim() || null,
          nguoiMuaChapNhanRuiRo: true,
          bienLaiAnhUrl: billUrl,
          bienLaiAnhId: billId,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok || !json?.don) {
        setErr(json?.error ?? "Không gửi được đơn.");
        return;
      }
      onSent(json.don);
    } catch {
      setErr("Không gửi được đơn.");
    } finally {
      setSending(false);
    }
  }, [group.idNguoiBan, ghiChu, billUrl, billId, onSent]);

  const qrUrl = pay
    ? buildVietQrImageUrl({
        nganHang: pay.nganHang,
        soTaiKhoan: pay.soTaiKhoan,
      })
    : null;

  const canSend =
    !sending &&
    accepted &&
    billOk &&
    !group.coVanDe &&
    group.coThanhToan &&
    Boolean(pay);

  return (
    <section className="gio-chung-group">
      <div className="gio-chung-group-hdr">
        <span className="gio-chung-shop">
          {group.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.avatarUrl}
              alt=""
              className="gio-chung-shop-avatar"
            />
          ) : (
            <Store size={15} strokeWidth={1.9} aria-hidden />
          )}
          {group.sellerSlug ? (
            <Link href={`/${group.sellerSlug}/shop`} className="gio-chung-shop-link">
              {group.tenCuaHang}
            </Link>
          ) : (
            group.tenCuaHang
          )}
        </span>
        <strong className="gio-chung-group-total">
          {money(group.tongTien, group.tienTe)}
        </strong>
      </div>

      <ul className="gio-chung-lines">
        {group.dong.map((d) => {
          const busy = busyBt === d.idBienThe;
          const canInc = d.soLuong < d.soLuongTon && !d.ngungBan;
          return (
            <li
              key={d.idBienThe}
              className={`gio-chung-line${d.ngungBan ? " is-off" : ""}`}
            >
              <span className="gio-chung-thumb" aria-hidden>
                {d.anhUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.anhUrl} alt="" loading="lazy" />
                ) : (
                  <Package size={16} strokeWidth={1.7} />
                )}
              </span>
              <span className="gio-chung-line-body">
                <span className="gio-chung-line-name">
                  {d.tenSanPham}
                  {d.nhanBienThe !== "Mặc định" ? (
                    <span className="gio-chung-line-var"> · {d.nhanBienThe}</span>
                  ) : null}
                </span>
                {d.ngungBan ? (
                  <span className="gio-chung-line-warn">Đã ngừng bán</span>
                ) : d.soLuong > d.soLuongTon ? (
                  <span className="gio-chung-line-warn">
                    Chỉ còn {d.soLuongTon}
                  </span>
                ) : (
                  <span className="gio-chung-line-price">
                    {money(d.giaHienThi, d.tienTe)}
                  </span>
                )}
              </span>
              <div className="gio-chung-qty">
                <button
                  type="button"
                  aria-label="Bớt"
                  disabled={busy}
                  onClick={() => void onQty(d.idBienThe, d.soLuong - 1)}
                >
                  {d.soLuong <= 1 ? (
                    <Trash2 size={13} strokeWidth={2} />
                  ) : (
                    <Minus size={13} strokeWidth={2} />
                  )}
                </button>
                <span>{d.soLuong}</span>
                <button
                  type="button"
                  aria-label="Thêm"
                  disabled={busy || !canInc}
                  onClick={() => void onQty(d.idBienThe, d.soLuong + 1)}
                >
                  <Plus size={13} strokeWidth={2} />
                </button>
              </div>
              <button
                type="button"
                className="gio-chung-line-remove"
                aria-label={`Xóa ${d.tenSanPham} khỏi giỏ`}
                title="Xóa khỏi giỏ"
                disabled={busy}
                onClick={() => void onQty(d.idBienThe, 0)}
              >
                <X size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      {group.coVanDe ? (
        <p className="gio-chung-group-warn" role="alert">
          <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
          Có món hết hàng / ngừng bán — hãy gỡ trước khi gửi đơn.
        </p>
      ) : !group.coThanhToan ? (
        <p className="gio-chung-group-warn" role="alert">
          <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
          Người bán chưa mở nhận tiền — chưa gửi đơn được.
        </p>
      ) : null}

      {!checkout ? (
        <button
          type="button"
          className="gio-chung-pay-btn"
          disabled={group.coVanDe || !group.coThanhToan}
          onClick={toggleCheckout}
        >
          Thanh toán · {money(group.tongTien, group.tienTe)}
        </button>
      ) : (
        <div className="gio-chung-checkout">
          <h4 className="gio-chung-checkout-title">Chuyển khoản tới</h4>
          {payLoading ? (
            <p className="gio-chung-muted">
              <Loader2 size={14} className="gio-chung-spin" aria-hidden /> Đang
              tải thông tin nhận tiền…
            </p>
          ) : pay ? (
            <div className="gio-chung-pay">
              <div className="gio-chung-pay-info">
                <p>
                  <strong>{pay.nganHang}</strong>
                </p>
                <p>
                  STK: <strong>{pay.soTaiKhoan}</strong>
                </p>
                <p>Chủ TK: {pay.tenChuTaiKhoan}</p>
                <p>
                  Số tiền: <strong>{money(group.tongTien, group.tienTe)}</strong>
                </p>
                {pay.chinhSach ? (
                  <p className="gio-chung-pay-policy">{pay.chinhSach}</p>
                ) : null}
              </div>
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR chuyển khoản"
                  className="gio-chung-qr"
                />
              ) : null}
            </div>
          ) : (
            <p className="gio-chung-err" role="alert">
              {payErr ?? "Người bán chưa thêm tài khoản nhận tiền."}
            </p>
          )}

          <div className="gio-chung-bill">
            <span className="gio-chung-bill-label">
              Ảnh biên lai chuyển khoản <b aria-hidden>*</b>
            </span>
            <input
              ref={billFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void uploadBill(e.target.files?.[0] ?? null);
                if (billFileRef.current) billFileRef.current.value = "";
              }}
            />
            {billUrl ? (
              <div className="gio-chung-bill-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={billUrl} alt="Biên lai chuyển khoản" />
                {billUploading ? (
                  <span className="gio-chung-bill-busy">
                    <Loader2
                      size={16}
                      className="gio-chung-spin"
                      aria-hidden
                    />
                    Đang tải…
                  </span>
                ) : null}
                <button
                  type="button"
                  className="gio-chung-bill-remove"
                  aria-label="Gỡ ảnh biên lai"
                  disabled={billUploading}
                  onClick={removeBill}
                >
                  <X size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="gio-chung-bill-btn"
                disabled={billUploading}
                onClick={() => billFileRef.current?.click()}
              >
                <Upload size={15} strokeWidth={2} aria-hidden />
                Đính kèm biên lai
              </button>
            )}
            {billErr ? (
              <p className="gio-chung-err" role="alert">
                {billErr}
              </p>
            ) : null}
          </div>

          <label className="gio-chung-note">
            <span>Ghi chú cho người bán</span>
            <textarea
              rows={2}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
            />
          </label>

          <label className="gio-chung-accept">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>{SHOP_BUYER_TRANSFER_DISCLAIMER}</span>
          </label>

          {err ? (
            <p className="gio-chung-err" role="alert">
              {err}
            </p>
          ) : null}

          {pay && !canSend && !sending ? (
            <p className="gio-chung-send-hint">
              {!billOk
                ? "Đính kèm ảnh biên lai chuyển khoản để gửi đơn."
                : !accepted
                  ? "Tích xác nhận để gửi đơn."
                  : null}
            </p>
          ) : null}

          <div className="gio-chung-checkout-actions">
            <button
              type="button"
              className="gio-chung-submit"
              disabled={!canSend}
              onClick={() => void submit()}
            >
              {sending ? (
                <Loader2 size={15} className="gio-chung-spin" aria-hidden />
              ) : (
                "Gửi đơn cho người bán"
              )}
            </button>
            <button
              type="button"
              className="gio-chung-cancel"
              disabled={sending}
              onClick={() => setCheckout(false)}
            >
              Quay lại
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

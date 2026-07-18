"use client";

import { Loader2, Package, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  SHOP_LOAI_DON_LABEL,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
} from "@/lib/shop/types";

import "./shop-don-detail-modal.css";

type Props = {
  donId: string | null;
  open: boolean;
  onClose: () => void;
  /** Vai trò xem — ảnh hưởng nút hành động. */
  viewerRole?: "buyer" | "seller" | "auto";
  /** Gọi sau khi PATCH thành công (cập nhật list ngoài). */
  onDonChange?: (don: ShopDonHang) => void;
  /** Mở chat với đối tác (người mua / người bán tùy role). */
  onOpenChat?: (targetUserId: string) => void;
};

export function ShopDonDetailModal({
  donId,
  open,
  onClose,
  viewerRole = "auto",
  onDonChange,
  onOpenChat,
}: Props) {
  const [don, setDon] = useState<ShopDonHang | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/don/${id}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok || !json?.don) {
        setDon(null);
        setErr(json?.error ?? "Không tải đơn.");
        return;
      }
      setDon(json.don);
    } catch {
      setDon(null);
      setErr("Không tải đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !donId) {
      setDon(null);
      setErr(null);
      return;
    }
    void load(donId);
  }, [open, donId, load]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          profile?: { id?: string };
        } | null;
        if (!cancelled) setViewerId(json?.profile?.id ?? null);
      } catch {
        if (!cancelled) setViewerId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const role: "buyer" | "seller" | null = (() => {
    if (!don || !viewerId) return null;
    if (viewerRole === "buyer") return "buyer";
    if (viewerRole === "seller") return "seller";
    if (don.idNguoiMua === viewerId) return "buyer";
    if (don.idNguoiBan === viewerId) return "seller";
    return null;
  })();

  async function patch(action: "da_nhan_tien" | "da_giao_tai_su_kien") {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/don/${don.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không cập nhật được.");
        return;
      }
      if (json?.don) {
        setDon(json.don);
        onDonChange?.(json.don);
      } else {
        await load(don.id);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!portalReady || !open) return null;

  // Theme xanh theo loại thanh toán «Đã thanh toán» (mua_ngay), không chờ
  // seller xác nhận — khớp card chat.
  const isPaid = don?.loaiDon === "mua_ngay";
  const isLater = don?.loaiDon === "dat_truoc_nhan_su_kien";

  return createPortal(
    <div
      className="shop-don-detail"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`shop-don-detail-panel${isPaid ? " is-paid" : isLater ? " is-later" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-don-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shop-don-detail-hdr">
          <div>
            <p className="shop-don-detail-kicker">
              {don?.maDon ? `Mã ${don.maDon}` : "Đơn hàng"}
            </p>
            <h3 id="shop-don-detail-title">Chi tiết đơn</h3>
          </div>
          <button
            type="button"
            className="shop-don-detail-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {loading ? (
          <p className="shop-don-detail-loading">
            <Loader2 size={18} className="shop-spin" aria-hidden /> Đang tải…
          </p>
        ) : err && !don ? (
          <p className="shop-don-detail-err" role="alert">
            {err}
          </p>
        ) : don ? (
          <>
            <div className="shop-don-detail-meta">
              <span
                className={`shop-don-detail-status shop-status--${don.trangThai}`}
              >
                {SHOP_TRANG_THAI_DON_LABEL[don.trangThai]}
              </span>
              <span className="shop-don-detail-loai">
                {don.loaiDon === "mua_ngay"
                  ? "Đã thanh toán"
                  : "Thanh toán sau"}
              </span>
            </div>

            <p className="shop-don-detail-parties">
              {role === "buyer" ? (
                <>
                  Người bán: <strong>{don.banTen ?? "—"}</strong>
                </>
              ) : role === "seller" ? (
                <>
                  Người mua: <strong>{don.muaTen ?? "—"}</strong>
                </>
              ) : (
                <>
                  {don.muaTen ?? "Người mua"} → {don.banTen ?? "Người bán"}
                </>
              )}
            </p>

            <ul className="shop-don-detail-lines">
              {don.dong.map((line) => {
                const nhan =
                  line.nhanSnapshot?.trim() &&
                  line.nhanSnapshot.trim() !== "Mặc định"
                    ? line.nhanSnapshot.trim()
                    : null;
                return (
                  <li key={line.id} className="shop-don-detail-line">
                    <span className="shop-don-detail-thumb" aria-hidden>
                      {line.anhUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.anhUrl} alt="" loading="lazy" />
                      ) : (
                        <Package size={18} strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="shop-don-detail-line-body">
                      <span className="shop-don-detail-line-name">
                        {line.tenSnapshot}
                      </span>
                      <span className="shop-don-detail-line-meta">
                        {nhan ? `${nhan} · ` : ""}×{line.soLuong}
                      </span>
                      <strong className="shop-don-detail-line-price">
                        {(line.giaDonVi * line.soLuong).toLocaleString("vi-VN")}{" "}
                        {don.tienTe}
                      </strong>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="shop-don-detail-tong">
              <span>Tổng</span>
              <strong>
                {don.tongTien.toLocaleString("vi-VN")} {don.tienTe}
              </strong>
            </div>

            {don.ghiChu?.trim() ? (
              <p className="shop-don-detail-note">
                <span>Ghi chú</span>
                {don.ghiChu
                  .split("\n")
                  .filter((l) => !l.startsWith("Hóa đơn thanh toán:"))
                  .join("\n")
                  .trim() || "—"}
              </p>
            ) : null}

            {err ? (
              <p className="shop-don-detail-err" role="alert">
                {err}
              </p>
            ) : null}

            <div className="shop-don-detail-actions">
              {don.trangThai === "cho_xac_nhan" && role === "seller" ? (
                don.loaiDon === "mua_ngay" ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn primary"
                    disabled={busy}
                    onClick={() => void patch("da_nhan_tien")}
                  >
                    Đã nhận tiền
                  </button>
                ) : (
                  <button
                    type="button"
                    className="shop-don-detail-btn primary"
                    disabled={busy}
                    onClick={() => void patch("da_giao_tai_su_kien")}
                  >
                    Đã giao / nhận hàng
                  </button>
                )
              ) : null}
              {onOpenChat && role === "seller" ? (
                <button
                  type="button"
                  className="shop-don-detail-btn ghost"
                  onClick={() => onOpenChat(don.idNguoiMua)}
                >
                  Chat người mua
                </button>
              ) : onOpenChat && role === "buyer" ? (
                <button
                  type="button"
                  className="shop-don-detail-btn ghost"
                  onClick={() => onOpenChat(don.idNguoiBan)}
                >
                  Chat người bán
                </button>
              ) : null}
              <button
                type="button"
                className="shop-don-detail-btn ghost"
                onClick={onClose}
              >
                Đóng
              </button>
            </div>

            <p className="shop-don-detail-foot">
              {SHOP_LOAI_DON_LABEL[don.loaiDon]} ·{" "}
              {new Date(don.taoLuc).toLocaleString("vi-VN")}
            </p>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

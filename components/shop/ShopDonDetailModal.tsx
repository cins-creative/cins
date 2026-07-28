"use client";

import {
  Ban,
  Clock,
  Flag,
  Loader2,
  Package,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ReportModal } from "@/components/social/ReportModal";
import {
  SHOP_DON_NHAC_GIO,
  SHOP_LOAI_DON_LABEL,
  SHOP_LY_DO_HUY_MAX,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopBuyerTrust,
  type ShopDonHang,
} from "@/lib/shop/types";

import "./shop-don-detail-modal.css";

const HUY_LY_DO_PRESETS = [
  "Không nhận được tiền / biên lai không hợp lệ",
  "Hết hàng",
  "Người mua yêu cầu hủy",
];

/** Thời gian đã chờ từ khi tạo đơn + cờ "chờ quá lâu" (để nhắc seller). */
function waitingSince(iso: string): { text: string; long: boolean } {
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  const days = Math.floor(ageH / 24);
  const text =
    days >= 1 ? `${days} ngày` : ageH >= 1 ? `${Math.floor(ageH)} giờ` : "vừa gửi";
  return { text, long: ageH >= SHOP_DON_NHAC_GIO };
}

function accountAgeLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "mới hôm nay";
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.floor(days / 30)} tháng`;
  return `${Math.floor(days / 365)} năm`;
}

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
  const [buyerTrust, setBuyerTrust] = useState<ShopBuyerTrust | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  /** Phóng to biên lai ngay trong modal — không mở tab mới. */
  const [billZoom, setBillZoom] = useState(false);
  /** Bảng hủy đơn (seller). */
  const [huyOpen, setHuyOpen] = useState(false);
  const [huyLyDo, setHuyLyDo] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setErr(null);
    setHuyOpen(false);
    setHuyLyDo("");
    setBlocked(false);
    try {
      const res = await fetch(`/api/shop/don/${id}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        buyerTrust?: ShopBuyerTrust | null;
        error?: string;
      } | null;
      if (!res.ok || !json?.don) {
        setDon(null);
        setBuyerTrust(null);
        setErr(json?.error ?? "Không tải đơn.");
        return;
      }
      setDon(json.don);
      setBuyerTrust(json.buyerTrust ?? null);
    } catch {
      setDon(null);
      setBuyerTrust(null);
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
    if (!open) {
      setBillZoom(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      /* Đóng lớp phóng biên lai trước, chưa đóng cả modal. */
      setBillZoom((zoom) => {
        if (zoom) return false;
        onClose();
        return zoom;
      });
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

  async function cancelDon() {
    if (!don) return;
    const lyDo = huyLyDo.trim();
    if (!lyDo) {
      setErr("Cần nhập lý do hủy đơn.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/don/${don.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "huy", lyDo }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không hủy được đơn.");
        return;
      }
      if (json?.don) {
        setDon(json.don);
        onDonChange?.(json.don);
        setHuyOpen(false);
      } else {
        await load(don.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function blockBuyer() {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ket-ban/${don.idNguoiMua}/block`, {
        method: "POST",
      });
      if (res.ok) {
        setBlocked(true);
      } else {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không chặn được người mua.");
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
  const noteText = (don?.ghiChu ?? "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("Hóa đơn thanh toán:"))
    .join("\n")
    .trim();

  return createPortal(
    <div
      className="shop-don-detail"
      role="presentation"
      onMouseDown={(e) => {
        /* Portal: chặn event rò lên React-tree cha (vd. ChatBubbleActionsHost
           mở overlay thả emoji khi bắt click/contextmenu của card đơn). */
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
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
              {don.trangThai === "cho_xac_nhan"
                ? (() => {
                    const { text, long } = waitingSince(don.taoLuc);
                    return (
                      <span
                        className={`shop-don-detail-expiry${long ? " is-overdue" : ""}`}
                        title="Đơn chờ xác nhận — bạn có thể xác nhận hoặc hủy"
                      >
                        <Clock size={12} strokeWidth={2.2} aria-hidden />
                        {long ? `Chờ ${text} — nên xử lý` : `Chờ ${text}`}
                      </span>
                    );
                  })()
                : null}
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

            {role === "seller" && buyerTrust ? (
              <div
                className="shop-don-detail-trust"
                aria-label="Tín hiệu tin cậy người mua"
              >
                <span
                  className={`shop-don-detail-trust-chip${buyerTrust.daXacMinh ? " is-good" : " is-warn"}`}
                >
                  <ShieldCheck size={12} strokeWidth={2.2} aria-hidden />
                  {buyerTrust.daXacMinh ? "Đã xác minh" : "Chưa xác minh"}
                </span>
                {buyerTrust.taoLuc ? (
                  <span className="shop-don-detail-trust-chip">
                    TK {accountAgeLabel(buyerTrust.taoLuc)}
                  </span>
                ) : null}
                <span className="shop-don-detail-trust-chip">
                  {buyerTrust.soDonTruoc} đơn trước
                </span>
                {buyerTrust.soDonHuy > 0 ? (
                  <span className="shop-don-detail-trust-chip is-warn">
                    {buyerTrust.soDonHuy} đơn đã hủy
                  </span>
                ) : null}
              </div>
            ) : null}

            <ul className="shop-don-detail-lines" aria-label="Chi tiết đơn">
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
                        <Package size={16} strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="shop-don-detail-line-body">
                      <span className="shop-don-detail-line-name">
                        {line.tenSnapshot}
                        {nhan ? (
                          <span className="shop-don-detail-line-var">
                            {" "}
                            · {nhan}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className="shop-don-detail-line-qty"
                      title={`Số lượng: ${line.soLuong}`}
                    >
                      ×{line.soLuong}
                    </span>
                    <strong className="shop-don-detail-line-price">
                      {(line.giaDonVi * line.soLuong).toLocaleString("vi-VN")}{" "}
                      {don.tienTe}
                    </strong>
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

            {role === "seller" &&
            (don.muaHoTen || don.muaSoDienThoai || don.muaDiaChi) ? (
              <div className="shop-don-detail-nhan">
                <span className="shop-don-detail-note-label">
                  Thông tin nhận hàng
                </span>
                {don.muaHoTen ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>Họ tên</span>
                    <strong>{don.muaHoTen}</strong>
                  </p>
                ) : null}
                {don.muaSoDienThoai ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>SĐT</span>
                    <a href={`tel:${don.muaSoDienThoai.replace(/\s+/g, "")}`}>
                      {don.muaSoDienThoai}
                    </a>
                  </p>
                ) : null}
                {don.muaDiaChi ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>Địa chỉ</span>
                    <strong>{don.muaDiaChi}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}

            {noteText ? (
              <div className="shop-don-detail-note">
                <span className="shop-don-detail-note-label">Lời nhắn</span>
                <p className="shop-don-detail-note-text">{noteText}</p>
              </div>
            ) : null}

            {don.trangThai === "huy" && don.lyDoHuy ? (
              <div className="shop-don-detail-note">
                <span className="shop-don-detail-note-label">Lý do hủy</span>
                <p className="shop-don-detail-note-text">{don.lyDoHuy}</p>
              </div>
            ) : null}

            {don.bienLaiAnhUrl ? (
              <div className="shop-don-detail-bill">
                <span className="shop-don-detail-note-label">
                  Biên lai chuyển khoản
                </span>
                <button
                  type="button"
                  className="shop-don-detail-bill-link"
                  onClick={() => setBillZoom(true)}
                  aria-label="Phóng to biên lai chuyển khoản"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={don.bienLaiAnhUrl} alt="Biên lai chuyển khoản" />
                </button>
              </div>
            ) : null}

            {err ? (
              <p className="shop-don-detail-err" role="alert">
                {err}
              </p>
            ) : null}

            {huyOpen && role === "seller" ? (
              <div className="shop-don-detail-huy">
                <span className="shop-don-detail-note-label">Lý do hủy đơn</span>
                <div className="shop-don-detail-huy-presets">
                  {HUY_LY_DO_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`shop-don-detail-huy-chip${huyLyDo === preset ? " is-active" : ""}`}
                      onClick={() => setHuyLyDo(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  className="shop-don-detail-huy-input"
                  value={huyLyDo}
                  maxLength={SHOP_LY_DO_HUY_MAX}
                  rows={2}
                  placeholder="Nhập lý do (bắt buộc)…"
                  onChange={(e) => setHuyLyDo(e.target.value)}
                />
                <p className="shop-don-detail-huy-hint">
                  Hủy sẽ hoàn hàng về kho và báo người mua. Nền tảng không giữ
                  tiền — hai bên tự dàn xếp hoàn tiền.
                </p>
                <div className="shop-don-detail-actions-row">
                  <button
                    type="button"
                    className="shop-don-detail-btn danger"
                    disabled={busy || !huyLyDo.trim()}
                    onClick={() => void cancelDon()}
                  >
                    Xác nhận hủy
                  </button>
                  <button
                    type="button"
                    className="shop-don-detail-btn ghost"
                    disabled={busy}
                    onClick={() => setHuyOpen(false)}
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="shop-don-detail-actions">
                {don.trangThai === "cho_xac_nhan" && role === "seller" ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn primary"
                    disabled={busy}
                    onClick={() =>
                      void patch(
                        don.loaiDon === "mua_ngay"
                          ? "da_nhan_tien"
                          : "da_giao_tai_su_kien",
                      )
                    }
                  >
                    {don.loaiDon === "mua_ngay"
                      ? "Đã nhận tiền"
                      : "Đã giao / nhận hàng"}
                  </button>
                ) : null}

                {(onOpenChat && (role === "seller" || role === "buyer")) ||
                (don.trangThai === "cho_xac_nhan" && role === "seller") ? (
                  <div className="shop-don-detail-actions-row">
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
                    {don.trangThai === "cho_xac_nhan" && role === "seller" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={busy}
                        onClick={() => {
                          setErr(null);
                          setHuyOpen(true);
                        }}
                      >
                        Hủy đơn
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {role === "seller" ? (
                  <div className="shop-don-detail-mod">
                    <button
                      type="button"
                      className="shop-don-detail-btn ghost"
                      disabled={busy || blocked}
                      onClick={() => void blockBuyer()}
                    >
                      <Ban size={14} strokeWidth={2} aria-hidden />
                      {blocked ? "Đã chặn" : "Chặn"}
                    </button>
                    <button
                      type="button"
                      className="shop-don-detail-btn ghost"
                      onClick={() => setReportOpen(true)}
                    >
                      <Flag size={14} strokeWidth={2} aria-hidden />
                      Báo cáo
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <p className="shop-don-detail-foot">
              {SHOP_LOAI_DON_LABEL[don.loaiDon]} ·{" "}
              {new Date(don.taoLuc).toLocaleString("vi-VN")}
            </p>
          </>
        ) : null}
      </div>

      {billZoom && don?.bienLaiAnhUrl ? (
        <div
          className="shop-don-detail-bill-zoom"
          role="dialog"
          aria-modal="true"
          aria-label="Biên lai chuyển khoản"
          onMouseDown={() => setBillZoom(false)}
        >
          <button
            type="button"
            className="shop-don-detail-bill-zoom-close"
            aria-label="Đóng"
            onClick={() => setBillZoom(false)}
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={don.bienLaiAnhUrl}
            alt="Biên lai chuyển khoản"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {don && role === "seller" ? (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetId={don.idNguoiMua}
          targetTitle={don.muaTen ?? undefined}
          loaiDoiTuong="user"
          viewerLoggedIn={viewerId != null}
        />
      ) : null}
    </div>,
    document.body,
  );
}

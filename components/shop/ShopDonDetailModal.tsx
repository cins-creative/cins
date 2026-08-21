"use client";

import { Ban, Clock, Copy, Flag, Loader2, Package, Printer, Truck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { ReportModal } from "@/components/social/ReportModal";
import {
  invalidateBaoCaoCache,
  invalidateDonHangCache,
} from "@/lib/shop/client-fetch-cache";
import { formatDate, formatMoney } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/messages";
import type { TFn } from "@/lib/i18n/t";
import { useT } from "@/lib/i18n/use-t";
import { useLocale } from "@/lib/locale/context";
import { formatDiaChiNhanCopy } from "@/lib/shop/export-viettelpost";
import { printPhieuDongGoi } from "@/lib/shop/phieu-dong-goi";
import {
  SHOP_DON_NHAC_GIO,
  shopLoaiDonLabel,
  shopTrangThaiDonLabel,
  SHOP_LY_DO_HUY_MAX,
  type ShopDonHang,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";
import type { ShopLyDoKhieuNaiClient } from "@/lib/shop/khieu-nai-labels";
import {
  buildTheoDoiUrl,
  detectDvvcTuLink,
  safeHttpUrl,
  SHOP_DVVC_OPTIONS,
  SHOP_VAN_CHUYEN_MA_MAX,
} from "@/lib/shop/van-chuyen";

import "./shop-don-detail-modal.css";

const HUY_LY_DO_PRESETS_SELLER: Array<{ value: string; key: MessageKey }> = [
  { value: "Không nhận được tiền / biên lai không hợp lệ", key: "shop.order.cancel.noPay" },
  { value: "Hết hàng", key: "shop.order.cancel.soldOut" },
  { value: "Người mua yêu cầu hủy", key: "shop.order.cancel.buyerAsked" },
];

const HUY_LY_DO_PRESETS_YEU_CAU: Array<{ value: string; key: MessageKey }> = [
  { value: "Hết hàng", key: "shop.order.cancel.soldOut" },
  { value: "Sai giá / sai mẫu", key: "shop.order.cancel.wrongPrice" },
  { value: "Không giao được tới địa chỉ", key: "shop.order.cancel.cantShip" },
];

const HUY_LY_DO_PRESETS_BUYER: Array<{ value: string; key: MessageKey }> = [
  { value: "Đặt nhầm", key: "shop.order.cancel.wrongOrder" },
  { value: "Đổi ý", key: "shop.order.cancel.changedMind" },
  { value: "Tìm được chỗ khác", key: "shop.order.cancel.foundElse" },
  { value: "Shop nhờ hủy", key: "shop.order.cancel.shopAsked" },
];

const DISPUTE_KEYS: Record<ShopLyDoKhieuNaiClient, MessageKey> = {
  chua_giao: "shop.order.dispute.chua_giao",
  huy_khong_hoan: "shop.order.dispute.huy_khong_hoan",
  hang_sai: "shop.order.dispute.hang_sai",
  hang_loi: "shop.order.dispute.hang_loi",
  khac: "shop.order.dispute.khac",
};

type HuyPanel = "seller_huy" | "buyer_huy" | "yeu_cau_huy" | null;

const VAN_CHUYEN_EDITABLE: ShopTrangThaiDon[] = [
  "da_nhan_tien",
  "cho_lay_hang",
  "dang_giao",
  "da_giao_tai_su_kien",
];

function canEditVanChuyen(don: ShopDonHang): boolean {
  const hinh = don.hinhThucGiao ?? "truc_tiep";
  if (hinh === "truc_tiep") return false;
  return VAN_CHUYEN_EDITABLE.includes(don.trangThai);
}

/** Thời gian đã chờ từ khi tạo đơn + cờ "chờ quá lâu" (để nhắc seller). */
function waitingSince(
  iso: string,
  t: TFn,
): { text: string; recent: boolean; long: boolean } {
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  const days = Math.floor(ageH / 24);
  const recent = ageH < 1;
  const text =
    days >= 1
      ? t("shop.order.days", { count: days })
      : ageH >= 1
        ? t("shop.order.hours", { count: Math.floor(ageH) })
        : "";
  return { text, recent, long: ageH >= SHOP_DON_NHAC_GIO };
}

/** Avatar + tên đối phương, click mở card hồ sơ (JourneyUserPopover). */
function PartyChip({
  slug,
  name,
  avatarUrl,
}: {
  slug: string | null | undefined;
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
}) {
  const display = name?.trim() || "—";
  const initial = display.slice(0, 1).toUpperCase();
  return (
    <JourneyUserPopover
      slug={slug ?? null}
      fallbackName={name}
      fallbackAvatarUrl={avatarUrl}
      backdropZIndex={12800}
    >
      <span className="shop-don-detail-party">
        <span className="shop-don-detail-party-avatar" aria-hidden>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" loading="lazy" />
          ) : (
            initial
          )}
        </span>
        <strong>{display}</strong>
      </span>
    </JourneyUserPopover>
  );
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
  const t = useT();
  const locale = useLocale();
  const [don, setDon] = useState<ShopDonHang | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  /** Phóng to biên lai ngay trong modal — không mở tab mới. */
  const [billZoom, setBillZoom] = useState(false);
  /** Bảng hủy / nhờ hủy / buyer hủy. */
  const [huyPanel, setHuyPanel] = useState<HuyPanel>(null);
  const [huyLyDo, setHuyLyDo] = useState("");
  /** Buyer ẩn banner «Shop đề nghị hủy» phía client (không API). */
  const [anYeuCauBanner, setAnYeuCauBanner] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  /** Người bán đã gửi báo cáo cho người mua này trong phiên hiện tại. */
  const [hasReported, setHasReported] = useState(false);
  /** Hiện inline confirm trước khi thực sự chặn. */
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [knOpen, setKnOpen] = useState(false);
  const [knLyDo, setKnLyDo] = useState<ShopLyDoKhieuNaiClient>("chua_giao");
  const [knMoTa, setKnMoTa] = useState("");
  const [knBusy, setKnBusy] = useState(false);
  const [knMsg, setKnMsg] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [vcMaDraft, setVcMaDraft] = useState("");
  const [vcDvvcDraft, setVcDvvcDraft] = useState("");
  const [canKhaoSat, setCanKhaoSat] = useState(false);
  const [dongDonHint, setDongDonHint] = useState<string | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setErr(null);
    setHuyPanel(null);
    setHuyLyDo("");
    setAnYeuCauBanner(false);
    setBlocked(false);
    try {
      const res = await fetch(`/api/shop/orders/${id}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
        dongDon?: {
          canKhaoSat?: boolean;
          ngayKhaoSat?: string | null;
          ngayTuDong?: string | null;
          hoanDen?: string | null;
          soLanHoan?: number;
          soLanChoHoan?: number;
        };
      } | null;
      if (!res.ok || !json?.don) {
        setDon(null);
        setCanKhaoSat(false);
        setDongDonHint(null);
        setErr(json?.error ?? t("shop.order.loadFail"));
        return;
      }
      setDon(json.don);
      setCanKhaoSat(Boolean(json.dongDon?.canKhaoSat));
      const dd = json.dongDon;
      if (dd?.hoanDen) {
        setDongDonHint(
          t("shop.order.deferredHint", {
            from: dd.hoanDen,
            used: dd.soLanHoan ?? 0,
            max: dd.soLanChoHoan ?? 2,
          }),
        );
      } else if (dd?.ngayTuDong) {
        setDongDonHint(
          `${t("shop.order.autoCloseHint", { from: dd.ngayTuDong })}${
            dd.ngayKhaoSat
              ? t("shop.order.surveyHint", { from: dd.ngayKhaoSat })
              : ""
          }.`,
        );
      } else {
        setDongDonHint(null);
      }
      setVcMaDraft(json.don.vanChuyenMa?.trim() || "");
      setVcDvvcDraft(
        json.don.vanChuyenDvvc?.trim() ||
          detectDvvcTuLink(json.don.vanChuyenLink) ||
          "",
      );
    } catch {
      setDon(null);
      setErr(t("shop.order.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open || !donId) {
      setDon(null);
      setErr(null);
      return;
    }
    void load(donId);
  }, [open, donId, load]);

  /**
   * Đơn vừa đổi → cache danh sách đơn (20s) và báo cáo (45s) đang giữ bản cũ.
   * Đặt ở modal thay vì ở từng host để mọi nơi mở modal đều được dọn cache.
   */
  function invalidateDonCaches() {
    invalidateDonHangCache();
    invalidateBaoCaoCache();
  }

  async function moKhieuNai() {
    if (!don) return;
    setKnBusy(true);
    setKnMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/shop/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idDonHang: don.id,
          lyDo: knLyDo,
          moTa: knMoTa.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? t("shop.order.disputeOpenFail"));
        return;
      }
      setKnMsg(t("shop.order.disputeSent"));
      setKnOpen(false);
      invalidateDonCaches();
    } finally {
      setKnBusy(false);
    }
  }

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

  const flashCopy = useCallback((label: string) => {
    setCopyFlash(label);
    window.setTimeout(() => setCopyFlash(null), 1600);
  }, []);

  const copyText = useCallback(
    async (text: string, label: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        await navigator.clipboard.writeText(trimmed);
        flashCopy(label);
      } catch {
        setErr(t("shop.order.copyFail"));
      }
    },
    [flashCopy, t],
  );

  async function patch(
    action:
      | "da_nhan_tien"
      | "da_giao_tai_su_kien"
      | "hoan_thanh"
      | "hoan_tra"
      | "buyer_da_nhan"
      | "buyer_chua_nhan",
  ) {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/orders/${don.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
        ketQua?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? t("shop.order.updateFail"));
        return;
      }
      invalidateDonCaches();
      if (json?.ketQua === "mo_khieu_nai") {
        setKnMsg(t("shop.order.escalatedAdmin"));
      } else if (json?.ketQua === "hoan") {
        setKnMsg(t("shop.order.notReceivedLogged"));
      }
      if (json?.don) {
        setDon(json.don);
        onDonChange?.(json.don);
        if (action === "buyer_da_nhan" || action === "buyer_chua_nhan") {
          await load(don.id);
        }
      } else {
        await load(don.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function patchHuy(
    action: "huy" | "buyer_huy" | "yeu_cau_huy" | "bo_yeu_cau_huy",
    lyDo?: string,
  ) {
    if (!don) return;
    if (action === "huy" || action === "buyer_huy" || action === "yeu_cau_huy") {
      /* buyer_huy ở da_nhan_tien không bắt buộc lyDo — shop đã nêu. */
      if (action !== "buyer_huy" || don.trangThai === "cho_xac_nhan") {
        const reason = (lyDo ?? "").trim();
        if (!reason) {
          setErr(t("shop.order.cancelReasonRequired"));
          return;
        }
      }
    }
    setBusy(true);
    setErr(null);
    try {
      const body: { action: string; lyDo?: string } = { action };
      if (lyDo?.trim()) body.lyDo = lyDo.trim();
      const res = await fetch(`/api/shop/orders/${don.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? t("shop.order.updateOrderFail"));
        return;
      }
      invalidateDonCaches();
      if (json?.don) {
        setDon(json.don);
        onDonChange?.(json.don);
        setHuyPanel(null);
        setHuyLyDo("");
      } else {
        await load(don.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelDon() {
    await patchHuy("huy", huyLyDo);
  }

  async function saveVanChuyen(next: { ma: string; dvvc: string }) {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/orders/${don.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cap_nhat_van_chuyen",
          ma: next.ma,
          dvvc: next.dvvc,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? t("shop.order.saveTrackingFail"));
        return;
      }
      invalidateDonCaches();
      if (json?.don) {
        setDon(json.don);
        setVcMaDraft(json.don.vanChuyenMa?.trim() || "");
        setVcDvvcDraft(json.don.vanChuyenDvvc?.trim() || "");
        onDonChange?.(json.don);
      } else {
        await load(don.id);
      }
    } finally {
      setBusy(false);
    }
  }

  async function blockBuyer() {
    if (!don) return;
    setConfirmBlock(false);
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/friends/${don.idNguoiMua}/block`, {
        method: "POST",
      });
      if (res.ok) {
        setBlocked(true);
      } else {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? t("shop.order.blockFail"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function unblockBuyer() {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/friends/${don.idNguoiMua}/block`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBlocked(false);
      } else {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? t("shop.order.unblockFail"));
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
              {don?.maDon
                ? t("shop.history.orderCode", { code: don.maDon })
                : t("shop.order.fallback")}
            </p>
            <h3 id="shop-don-detail-title">{t("shop.order.title")}</h3>
          </div>
          <button
            type="button"
            className="shop-don-detail-close"
            aria-label={t("actors.close")}
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {loading ? (
          <p className="shop-don-detail-loading">
            <Loader2 size={18} className="shop-spin" aria-hidden />{" "}
            {t("shop.loadingShort")}
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
                {shopTrangThaiDonLabel(don.trangThai, locale)}
              </span>
              <span className="shop-don-detail-loai">
                {don.loaiDon === "mua_ngay"
                  ? t("shop.order.paidNow")
                  : t("shop.order.payLater")}
              </span>
              {don.trangThai === "cho_xac_nhan"
                ? (() => {
                    const { text, recent, long } = waitingSince(don.taoLuc, t);
                    return (
                      <span
                        className={`shop-don-detail-expiry${long ? " is-overdue" : ""}`}
                        title={t("shop.order.waitingTitle")}
                      >
                        <Clock size={12} strokeWidth={2.2} aria-hidden />
                        {recent
                          ? t("shop.order.justPlaced")
                          : long
                            ? t("shop.order.waitShouldAct", { text })
                            : t("shop.order.waitFor", { text })}
                      </span>
                    );
                  })()
                : null}
            </div>

            <p className="shop-don-detail-parties">
              {role === "buyer" ? (
                <>
                  {t("shop.order.seller")}:{" "}
                  <PartyChip
                    slug={don.banSlug}
                    name={don.banTen}
                    avatarUrl={don.banAvatarUrl}
                  />
                </>
              ) : role === "seller" ? (
                <>
                  {t("shop.order.buyer")}:{" "}
                  <PartyChip
                    slug={don.muaSlug}
                    name={don.muaTen}
                    avatarUrl={don.muaAvatarUrl}
                  />
                </>
              ) : (
                <>
                  <PartyChip
                    slug={don.muaSlug}
                    name={don.muaTen ?? t("shop.order.buyer")}
                    avatarUrl={don.muaAvatarUrl}
                  />
                  {" → "}
                  <PartyChip
                    slug={don.banSlug}
                    name={don.banTen ?? t("shop.order.seller")}
                    avatarUrl={don.banAvatarUrl}
                  />
                </>
              )}
            </p>

            <div className="shop-don-detail-body">
            <div className="shop-don-detail-main">
            <ul className="shop-don-detail-lines" aria-label={t("shop.order.linesAria")}>
              {don.dong.map((line) => {
                const nhan =
                  line.nhanSnapshot?.trim() &&
                  line.nhanSnapshot.trim() !== "Mặc định"
                    ? line.nhanSnapshot.trim()
                    : null;
                const loaiParts = [line.phanLoai, line.phanLoai2]
                  .map((s) => s?.trim())
                  .filter((s): s is string => Boolean(s));
                const loaiLabel = loaiParts.join(" · ");
                const loaiHien =
                  loaiLabel && loaiLabel !== line.tenSnapshot.trim()
                    ? loaiLabel
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
                      {loaiHien ? (
                        <span className="shop-don-detail-line-loai">
                          {loaiHien}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="shop-don-detail-line-qty"
                      title={t("shop.order.qty", { count: line.soLuong })}
                    >
                      ×{line.soLuong}
                    </span>
                    <strong className="shop-don-detail-line-price">
                      {formatMoney(
                        line.giaDonVi * line.soLuong,
                        locale,
                        don.tienTe,
                      )}
                    </strong>
                  </li>
                );
              })}
            </ul>

            <div className="shop-don-detail-tong">
              <span>{t("shop.order.subtotal")}</span>
              <strong>
                {formatMoney(don.tongHang ?? don.tongTien, locale, don.tienTe)}
              </strong>
            </div>
            {(don.tienGiamCombo ?? 0) > 0 ? (
              <div className="shop-don-detail-tong is-discount">
                <span>
                  {t("shop.order.comboOff")}
                  {don.giamSnapshot?.combo?.length
                    ? ` (${don.giamSnapshot.combo.map((c) => c.ten).join(", ")})`
                    : ""}
                </span>
                <strong>
                  −{formatMoney(don.tienGiamCombo ?? 0, locale, don.tienTe)}
                </strong>
              </div>
            ) : null}
            {(don.tienGiamVoucher ?? 0) > 0 ? (
              <div className="shop-don-detail-tong is-discount">
                <span>
                  {t("shop.order.voucherOff")}
                  {don.giamSnapshot?.voucher?.ma
                    ? ` (${don.giamSnapshot.voucher.ma})`
                    : ""}
                </span>
                <strong>
                  −{formatMoney(don.tienGiamVoucher ?? 0, locale, don.tienTe)}
                </strong>
              </div>
            ) : null}
            <div className="shop-don-detail-tong is-final">
              <span>{t("shop.order.due")}</span>
              <strong>
                {formatMoney(don.tongTien, locale, don.tienTe)}
              </strong>
            </div>
            </div>

            <div className="shop-don-detail-aside">
            {knMsg ? (
              <p className="shop-don-detail-note-text" role="status">
                {knMsg}
              </p>
            ) : null}

            {role === "buyer" &&
            (don.trangThai === "da_nhan_tien" ||
              don.trangThai === "hoan_thanh" ||
              don.trangThai === "huy" ||
              don.trangThai === "da_giao_tai_su_kien") ? (
              <div className="shop-don-detail-nhan">
                <span className="shop-don-detail-note-label">
                  {t("shop.order.dispute")}
                </span>
                {!knOpen ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn ghost"
                    onClick={() => setKnOpen(true)}
                  >
                    {t("shop.order.openDispute")}
                  </button>
                ) : (
                  <div className="shop-don-detail-huy">
                    <select
                      className="shop-don-detail-huy-input"
                      value={knLyDo}
                      onChange={(e) =>
                        setKnLyDo(e.target.value as ShopLyDoKhieuNaiClient)
                      }
                    >
                      {(
                        Object.keys(DISPUTE_KEYS) as ShopLyDoKhieuNaiClient[]
                      ).map((k) => (
                        <option key={k} value={k}>
                          {t(DISPUTE_KEYS[k])}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="shop-don-detail-huy-input"
                      rows={2}
                      placeholder={t("shop.order.disputePlaceholder")}
                      value={knMoTa}
                      onChange={(e) => setKnMoTa(e.target.value)}
                    />
                    <p className="shop-don-detail-huy-hint">
                      {t("shop.order.disputeHint")}
                    </p>
                    <div className="shop-don-detail-actions-row">
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={knBusy}
                        onClick={() => void moKhieuNai()}
                      >
                        {t("shop.order.sendDispute")}
                      </button>
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost"
                        disabled={knBusy}
                        onClick={() => setKnOpen(false)}
                      >
                        {t("shop.order.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {(don.muaHoTen || don.muaSoDienThoai || don.muaDiaChi) ? (
              <div className="shop-don-detail-nhan">
                <div className="shop-don-detail-nhan-hdr">
                  <span className="shop-don-detail-note-label">
                    {t("shop.order.shipTo")}
                  </span>
                  <div className="shop-don-detail-nhan-tools">
                    <button
                      type="button"
                      className="shop-don-detail-btn ghost shop-don-detail-nhan-tool"
                      title={t("shop.order.copyAll")}
                      onClick={() =>
                        void copyText(
                          formatDiaChiNhanCopy(don),
                          t("shop.order.copiedShip"),
                        )
                      }
                    >
                      <Copy size={14} aria-hidden />
                      {t("shop.order.copy")}
                    </button>
                    {role === "seller" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost shop-don-detail-nhan-tool"
                        title={t("shop.order.printSlip")}
                        onClick={() => {
                          try {
                            printPhieuDongGoi(don);
                          } catch {
                            setErr(t("shop.history.popupBlocked"));
                          }
                        }}
                      >
                        <Printer size={14} aria-hidden />
                        {t("shop.order.slip")}
                      </button>
                    ) : null}
                  </div>
                </div>
                {copyFlash ? (
                  <p className="shop-don-detail-copy-flash" role="status">
                    {copyFlash}
                  </p>
                ) : null}
                {don.muaHoTen ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>{t("shop.order.fullName")}</span>
                    <strong>{don.muaHoTen}</strong>
                    <button
                      type="button"
                      className="shop-don-detail-copy-one"
                      aria-label={t("shop.order.copyName")}
                      onClick={() =>
                        void copyText(don.muaHoTen ?? "", t("shop.order.copiedName"))
                      }
                    >
                      <Copy size={12} aria-hidden />
                    </button>
                  </p>
                ) : null}
                {don.muaSoDienThoai ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>{t("shop.order.phone")}</span>
                    <a href={`tel:${don.muaSoDienThoai.replace(/\s+/g, "")}`}>
                      {don.muaSoDienThoai}
                    </a>
                    <button
                      type="button"
                      className="shop-don-detail-copy-one"
                      aria-label={t("shop.order.copyPhone")}
                      onClick={() =>
                        void copyText(
                          don.muaSoDienThoai ?? "",
                          t("shop.order.copiedPhone"),
                        )
                      }
                    >
                      <Copy size={12} aria-hidden />
                    </button>
                  </p>
                ) : null}
                {don.muaDiaChi ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>{t("shop.order.address")}</span>
                    <strong>{don.muaDiaChi}</strong>
                    <button
                      type="button"
                      className="shop-don-detail-copy-one"
                      aria-label={t("shop.order.copyAddress")}
                      onClick={() =>
                        void copyText(
                          don.muaDiaChi ?? "",
                          t("shop.order.copiedAddress"),
                        )
                      }
                    >
                      <Copy size={12} aria-hidden />
                    </button>
                  </p>
                ) : null}
              </div>
            ) : null}

            {(() => {
              const trackSafe =
                safeHttpUrl(
                  buildTheoDoiUrl(don.vanChuyenDvvc, don.vanChuyenMa) ||
                    don.vanChuyenLink,
                );
              const editable = role === "seller" && canEditVanChuyen(don);
              const showBuyerTrack =
                role === "buyer" &&
                trackSafe &&
                don.trangThai !== "huy";
              const showSeller =
                role === "seller" &&
                (editable ||
                  Boolean(don.vanChuyenMa || don.vanChuyenDvvc || trackSafe) ||
                  don.trangThai === "cho_xac_nhan");
              if (!showBuyerTrack && !showSeller) return null;
              return (
                  <div className="shop-don-detail-nhan shop-don-detail-vc">
                    <div className="shop-don-detail-nhan-hdr">
                      <span className="shop-don-detail-note-label">
                        {t("shop.order.shipping")}
                      </span>
                    </div>
                    {showBuyerTrack && trackSafe ? (
                      <a
                        href={trackSafe}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="shop-don-detail-vc-track"
                      >
                        <Truck size={14} strokeWidth={2.2} aria-hidden />
                        {t("shop.order.track")}
                        <span className="shop-don-detail-vc-carrier">
                          {[don.vanChuyenDvvc, don.vanChuyenMa]
                            .filter(Boolean)
                            .join(" · ") || t("shop.order.lookup")}
                        </span>
                      </a>
                    ) : null}
                    {showSeller ? (
                      editable ? (
                        <form
                          className="shop-don-detail-vc-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void saveVanChuyen({
                              ma: vcMaDraft,
                              dvvc: vcDvvcDraft,
                            });
                          }}
                        >
                          <select
                            className="shop-don-detail-huy-input"
                            value={vcDvvcDraft}
                            disabled={busy}
                            aria-label={t("shop.order.carrier")}
                            onChange={(e) => setVcDvvcDraft(e.target.value)}
                          >
                            <option value="">{t("shop.order.pickCarrier")}</option>
                            {SHOP_DVVC_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className="shop-don-detail-huy-input"
                            value={vcMaDraft}
                            maxLength={SHOP_VAN_CHUYEN_MA_MAX}
                            placeholder={t("shop.order.trackingCode")}
                            disabled={busy}
                            aria-label={t("shop.order.trackingCode")}
                            onChange={(e) => setVcMaDraft(e.target.value)}
                          />
                          <div className="shop-don-detail-actions-row">
                            <button
                              type="submit"
                              className="shop-don-detail-btn"
                              disabled={busy}
                            >
                              {busy ? (
                                <Loader2
                                  size={14}
                                  className="shop-spin"
                                  aria-hidden
                                />
                              ) : null}
                              {t("shop.order.save")}
                            </button>
                            {don.vanChuyenMa || don.vanChuyenDvvc ? (
                              <button
                                type="button"
                                className="shop-don-detail-btn ghost"
                                disabled={busy}
                                onClick={() =>
                                  void saveVanChuyen({ ma: "", dvvc: "" })
                                }
                              >
                                {t("shop.order.delete")}
                              </button>
                            ) : null}
                          </div>
                          {don.trangThai === "da_nhan_tien" ||
                          don.trangThai === "cho_lay_hang" ? (
                            <p className="shop-don-detail-huy-hint">
                              {t("shop.order.shippingHint")}
                            </p>
                          ) : null}
                        </form>
                      ) : don.vanChuyenMa || don.vanChuyenDvvc ? (
                        <>
                          {don.vanChuyenDvvc ? (
                            <p className="shop-don-detail-nhan-line">
                              <span>{t("shop.order.carrierShort")}</span>
                              <strong>{don.vanChuyenDvvc}</strong>
                            </p>
                          ) : null}
                          {don.vanChuyenMa ? (
                            <p className="shop-don-detail-nhan-line">
                              <span>{t("shop.order.codeShort")}</span>
                              <strong>{don.vanChuyenMa}</strong>
                            </p>
                          ) : null}
                        </>
                      ) : don.trangThai === "cho_xac_nhan" ? (
                        <p className="shop-don-detail-huy-hint">
                          {t("shop.order.confirmBeforeShip")}
                        </p>
                      ) : null
                    ) : null}
                  </div>
              );
            })()}

            {noteText ? (
              <div className="shop-don-detail-note">
                <span className="shop-don-detail-note-label">{t("shop.order.note")}</span>
                <p className="shop-don-detail-note-text">{noteText}</p>
              </div>
            ) : null}

            {don.trangThai === "huy" && don.lyDoHuy ? (
              <div className="shop-don-detail-note">
                <span className="shop-don-detail-note-label">{t("shop.order.cancelReason")}</span>
                <p className="shop-don-detail-note-text">{don.lyDoHuy}</p>
              </div>
            ) : null}

            {don.bienLaiAnhUrl ? (
              <div className="shop-don-detail-bill">
                <span className="shop-don-detail-note-label">
                  {t("shop.order.receipt")}
                </span>
                <button
                  type="button"
                  className="shop-don-detail-bill-link"
                  onClick={() => setBillZoom(true)}
                  aria-label={t("shop.order.zoomReceipt")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={don.bienLaiAnhUrl} alt={t("shop.order.receipt")} />
                </button>
              </div>
            ) : null}

            {err ? (
              <p className="shop-don-detail-err" role="alert">
                {err}
              </p>
            ) : null}

            {huyPanel ? (
              <div className="shop-don-detail-huy">
                <span className="shop-don-detail-note-label">
                  {huyPanel === "yeu_cau_huy"
                    ? t("shop.order.askCancelReason")
                    : t("shop.order.cancelReasonLabel")}
                </span>
                <div className="shop-don-detail-huy-presets">
                  {(huyPanel === "buyer_huy"
                    ? HUY_LY_DO_PRESETS_BUYER
                    : huyPanel === "yeu_cau_huy"
                      ? HUY_LY_DO_PRESETS_YEU_CAU
                      : HUY_LY_DO_PRESETS_SELLER
                  ).map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`shop-don-detail-huy-chip${huyLyDo === preset.value ? " is-active" : ""}`}
                      onClick={() => setHuyLyDo(preset.value)}
                    >
                      {t(preset.key)}
                    </button>
                  ))}
                </div>
                <textarea
                  className="shop-don-detail-huy-input"
                  value={huyLyDo}
                  maxLength={SHOP_LY_DO_HUY_MAX}
                  rows={2}
                  placeholder={t("shop.order.cancelPlaceholder")}
                  onChange={(e) => setHuyLyDo(e.target.value)}
                />
                {huyPanel === "buyer_huy" && don.bienLaiAnhUrl ? (
                  <p className="shop-don-detail-huy-hint is-warn">
                    {t("shop.order.cancelPaidHint")}
                  </p>
                ) : (
                  <p className="shop-don-detail-huy-hint">
                    {huyPanel === "yeu_cau_huy"
                      ? t("shop.order.askCancelHint")
                      : t("shop.order.cancelStockHint")}
                  </p>
                )}
                <div className="shop-don-detail-actions-row">
                  <button
                    type="button"
                    className="shop-don-detail-btn danger"
                    disabled={busy || !huyLyDo.trim()}
                    onClick={() => {
                      if (huyPanel === "yeu_cau_huy") {
                        void patchHuy("yeu_cau_huy", huyLyDo);
                      } else if (huyPanel === "buyer_huy") {
                        void patchHuy("buyer_huy", huyLyDo);
                      } else {
                        void cancelDon();
                      }
                    }}
                  >
                    {huyPanel === "yeu_cau_huy"
                      ? t("shop.order.sendCancelAsk")
                      : t("shop.order.confirmCancel")}
                  </button>
                  <button
                    type="button"
                    className="shop-don-detail-btn ghost"
                    disabled={busy}
                    onClick={() => setHuyPanel(null)}
                  >
                    {t("shop.order.back")}
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
                      ? t("shop.order.confirmPaid")
                      : t("shop.order.handedOver")}
                  </button>
                ) : null}

                {don.trangThai === "da_nhan_tien" && role === "seller" ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn primary"
                    disabled={busy}
                    onClick={() => void patch("hoan_thanh")}
                  >
                    {t("shop.order.complete")}
                  </button>
                ) : null}

                {don.trangThai === "cho_lay_hang" && role === "seller" ? (
                  <>
                    <button
                      type="button"
                      className="shop-don-detail-btn primary"
                      disabled={busy}
                      onClick={() => void patch("hoan_thanh")}
                    >
                      {t("shop.order.complete")}
                    </button>
                    <button
                      type="button"
                      className="shop-don-detail-btn danger"
                      disabled={busy}
                      onClick={() => void patch("hoan_tra")}
                    >
                      {t("shop.order.return")}
                    </button>
                  </>
                ) : null}

                {don.trangThai === "dang_giao" && role === "seller" ? (
                  <>
                    <button
                      type="button"
                      className="shop-don-detail-btn primary"
                      disabled={busy}
                      onClick={() => void patch("hoan_thanh")}
                    >
                      {t("shop.order.complete")}
                    </button>
                    <button
                      type="button"
                      className="shop-don-detail-btn danger"
                      disabled={busy}
                      onClick={() => void patch("hoan_tra")}
                    >
                      {t("shop.order.return")}
                    </button>
                  </>
                ) : null}

                {don.trangThai === "da_giao_tai_su_kien" && role === "seller" ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn primary"
                    disabled={busy}
                    onClick={() => void patch("hoan_thanh")}
                  >
                    {t("shop.order.complete")}
                  </button>
                ) : null}

                {role === "buyer" &&
                (don.trangThai === "da_nhan_tien" ||
                  don.trangThai === "cho_lay_hang" ||
                  don.trangThai === "dang_giao" ||
                  don.trangThai === "da_giao_tai_su_kien") ? (
                  <div className="shop-don-detail-buyer-nhan">
                    {dongDonHint ? (
                      <p className="shop-don-detail-note">{dongDonHint}</p>
                    ) : null}
                    <div className="shop-don-detail-actions-row">
                      <button
                        type="button"
                        className="shop-don-detail-btn primary"
                        disabled={busy}
                        onClick={() => void patch("buyer_da_nhan")}
                      >
                        {t("shop.order.received")}
                      </button>
                      {canKhaoSat ? (
                        <button
                          type="button"
                          className="shop-don-detail-btn ghost"
                          disabled={busy}
                          onClick={() => void patch("buyer_chua_nhan")}
                        >
                          {t("shop.order.notReceived")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {role === "buyer" &&
                don.trangThai === "da_nhan_tien" &&
                don.yeuCauHuyLuc &&
                !anYeuCauBanner ? (
                  <div className="shop-don-detail-huy">
                    <span className="shop-don-detail-note-label">
                      {t("shop.order.shopAskCancel")}
                    </span>
                    {don.yeuCauHuyLyDo?.trim() ? (
                      <p className="shop-don-detail-huy-hint">
                        {don.yeuCauHuyLyDo.trim()}
                      </p>
                    ) : null}
                    <p className="shop-don-detail-huy-hint">
                      {t("shop.order.agreeCancelHint")}
                    </p>
                    <div className="shop-don-detail-actions-row">
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={busy}
                        onClick={() => void patchHuy("buyer_huy")}
                      >
                        {t("shop.order.agreeCancel")}
                      </button>
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost"
                        disabled={busy}
                        onClick={() => setAnYeuCauBanner(true)}
                      >
                        {t("shop.order.keepOrder")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {role === "seller" &&
                don.trangThai === "da_nhan_tien" &&
                don.yeuCauHuyLuc ? (
                  <div className="shop-don-detail-huy">
                    <span className="shop-don-detail-note-label">
                      {t("shop.order.waitingBuyerCancel")}
                    </span>
                    {don.yeuCauHuyLyDo?.trim() ? (
                      <p className="shop-don-detail-huy-hint">
                        {don.yeuCauHuyLyDo.trim()}
                      </p>
                    ) : null}
                    <div className="shop-don-detail-actions-row">
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost"
                        disabled={busy}
                        onClick={() => void patchHuy("bo_yeu_cau_huy")}
                      >
                        {t("shop.order.withdraw")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {(onOpenChat && (role === "seller" || role === "buyer")) ||
                (don.trangThai === "cho_xac_nhan" &&
                  (role === "seller" || role === "buyer")) ||
                (don.trangThai === "da_nhan_tien" &&
                  role === "seller" &&
                  !don.yeuCauHuyLuc) ? (
                  <div className="shop-don-detail-actions-row">
                    {onOpenChat && role === "seller" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost"
                        onClick={() => {
                          /* Đóng modal chi tiết (z-index 12600) trước khi mở chat
                             (z-index 11000) — nếu không, chat mở phía dưới modal
                             và trông như "nhấp nháy rồi tắt". */
                          onOpenChat(don.idNguoiMua);
                          onClose();
                        }}
                      >
                        {t("shop.order.chatBuyer")}
                      </button>
                    ) : onOpenChat && role === "buyer" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost"
                        onClick={() => {
                          onOpenChat(don.idNguoiBan);
                          onClose();
                        }}
                      >
                        {t("shop.order.chatSeller")}
                      </button>
                    ) : null}
                    {don.trangThai === "cho_xac_nhan" && role === "seller" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={busy}
                        onClick={() => {
                          setErr(null);
                          setHuyPanel("seller_huy");
                        }}
                      >
                        {t("shop.order.cancelOrder")}
                      </button>
                    ) : null}
                    {don.trangThai === "cho_xac_nhan" && role === "buyer" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={busy}
                        onClick={() => {
                          setErr(null);
                          setHuyPanel("buyer_huy");
                        }}
                      >
                        {t("shop.order.cancelOrder")}
                      </button>
                    ) : null}
                    {don.trangThai === "da_nhan_tien" &&
                    role === "seller" &&
                    !don.yeuCauHuyLuc ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={busy}
                        onClick={() => {
                          setErr(null);
                          setHuyPanel("yeu_cau_huy");
                        }}
                      >
                        {t("shop.order.askBuyerCancel")}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {role === "seller" ? (
                  <div className="shop-don-detail-mod">
                    {confirmBlock ? (
                      <div className="shop-don-detail-confirm-block">
                        <span className="shop-don-detail-confirm-block-text">
                          {t("shop.order.blockConfirm")}
                        </span>
                        <div className="shop-don-detail-confirm-block-actions">
                          <button
                            type="button"
                            className="shop-don-detail-btn danger"
                            disabled={busy}
                            onClick={() => void blockBuyer()}
                          >
                            <Ban size={14} strokeWidth={2} aria-hidden />
                            {t("shop.order.confirmBlock")}
                          </button>
                          <button
                            type="button"
                            className="shop-don-detail-btn ghost"
                            disabled={busy}
                            onClick={() => setConfirmBlock(false)}
                          >
                            {t("shop.order.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {blocked ? (
                          <button
                            type="button"
                            className="shop-don-detail-btn ghost"
                            disabled={busy}
                            onClick={() => void unblockBuyer()}
                          >
                            <Ban size={14} strokeWidth={2} aria-hidden />
                            {t("shop.order.unblock")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="shop-don-detail-btn ghost"
                            disabled={busy || !hasReported}
                            title={
                              !hasReported
                                ? t("shop.order.blockNeedReport")
                                : undefined
                            }
                            onClick={() => setConfirmBlock(true)}
                          >
                            <Ban size={14} strokeWidth={2} aria-hidden />
                            {t("shop.order.block")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="shop-don-detail-btn ghost"
                          onClick={() => setReportOpen(true)}
                        >
                          <Flag size={14} strokeWidth={2} aria-hidden />
                          {t("shop.order.report")}
                          {hasReported ? " ✓" : ""}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            </div>
            </div>

            <p className="shop-don-detail-foot">
              {shopLoaiDonLabel(don.loaiDon, locale)} ·{" "}
              {formatDate(don.taoLuc, locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </>
        ) : null}
      </div>

      {billZoom && don?.bienLaiAnhUrl ? (
        <div
          className="shop-don-detail-bill-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={t("shop.order.receipt")}
          onMouseDown={() => setBillZoom(false)}
        >
          <button
            type="button"
            className="shop-don-detail-bill-zoom-close"
            aria-label={t("actors.close")}
            onClick={() => setBillZoom(false)}
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={don.bienLaiAnhUrl}
            alt={t("shop.order.receipt")}
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
          onSubmitted={() => setHasReported(true)}
        />
      ) : null}
    </div>,
    document.body,
  );
}

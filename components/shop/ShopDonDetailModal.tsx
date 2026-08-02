"use client";

import { Ban, Clock, Copy, Flag, Loader2, Package, Printer, Truck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { ReportModal } from "@/components/social/ReportModal";
import { formatDiaChiNhanCopy } from "@/lib/shop/export-viettelpost";
import { printPhieuDongGoi } from "@/lib/shop/phieu-dong-goi";
import {
  SHOP_DON_NHAC_GIO,
  SHOP_LOAI_DON_LABEL,
  SHOP_LY_DO_HUY_MAX,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";
import { SHOP_LY_DO_KHIEU_NAI_LABEL } from "@/lib/shop/khieu-nai-labels";
import {
  buildTheoDoiUrl,
  detectDvvcTuLink,
  safeHttpUrl,
  SHOP_DVVC_OPTIONS,
  SHOP_VAN_CHUYEN_MA_MAX,
} from "@/lib/shop/van-chuyen";

import "./shop-don-detail-modal.css";

const HUY_LY_DO_PRESETS = [
  "Không nhận được tiền / biên lai không hợp lệ",
  "Hết hàng",
  "Người mua yêu cầu hủy",
];

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
function waitingSince(iso: string): { text: string; recent: boolean; long: boolean } {
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  const days = Math.floor(ageH / 24);
  const recent = ageH < 1;
  const text = days >= 1 ? `${days} ngày` : ageH >= 1 ? `${Math.floor(ageH)} giờ` : "";
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
  const [don, setDon] = useState<ShopDonHang | null>(null);
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
  /** Người bán đã gửi báo cáo cho người mua này trong phiên hiện tại. */
  const [hasReported, setHasReported] = useState(false);
  /** Hiện inline confirm trước khi thực sự chặn. */
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [knOpen, setKnOpen] = useState(false);
  const [knLyDo, setKnLyDo] = useState<keyof typeof SHOP_LY_DO_KHIEU_NAI_LABEL>("chua_giao");
  const [knMoTa, setKnMoTa] = useState("");
  const [knBusy, setKnBusy] = useState(false);
  const [knMsg, setKnMsg] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [vcMaDraft, setVcMaDraft] = useState("");
  const [vcDvvcDraft, setVcDvvcDraft] = useState("");

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
        error?: string;
      } | null;
      if (!res.ok || !json?.don) {
        setDon(null);
        setErr(json?.error ?? "Không tải đơn.");
        return;
      }
      setDon(json.don);
      setVcMaDraft(json.don.vanChuyenMa?.trim() || "");
      setVcDvvcDraft(
        json.don.vanChuyenDvvc?.trim() ||
          detectDvvcTuLink(json.don.vanChuyenLink) ||
          "",
      );
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

  async function moKhieuNai() {
    if (!don) return;
    setKnBusy(true);
    setKnMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/shop/khieu-nai", {
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
        setErr(json?.error ?? "Không mở được khiếu nại.");
        return;
      }
      setKnMsg("Đã gửi khiếu nại. CINs sẽ trọng tài — không hoàn tiền qua nền tảng.");
      setKnOpen(false);
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
      const t = text.trim();
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        flashCopy(label);
      } catch {
        setErr("Không copy được — kiểm tra quyền clipboard.");
      }
    },
    [flashCopy],
  );

  async function patch(
    action:
      | "da_nhan_tien"
      | "da_giao_tai_su_kien"
      | "hoan_thanh"
      | "hoan_tra",
  ) {
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

  async function saveVanChuyen(next: { ma: string; dvvc: string }) {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/don/${don.id}`, {
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
        setErr(json?.error ?? "Không lưu được mã vận đơn.");
        return;
      }
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

  async function unblockBuyer() {
    if (!don) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ket-ban/${don.idNguoiMua}/block`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBlocked(false);
      } else {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không bỏ chặn được.");
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
                    const { text, recent, long } = waitingSince(don.taoLuc);
                    return (
                      <span
                        className={`shop-don-detail-expiry${long ? " is-overdue" : ""}`}
                        title="Đơn chờ xác nhận — bạn có thể xác nhận hoặc hủy"
                      >
                        <Clock size={12} strokeWidth={2.2} aria-hidden />
                        {recent
                          ? "Vừa đặt"
                          : long
                            ? `Chờ ${text} — nên xử lý`
                            : `Chờ ${text}`}
                      </span>
                    );
                  })()
                : null}
            </div>

            <p className="shop-don-detail-parties">
              {role === "buyer" ? (
                <>
                  Người bán:{" "}
                  <PartyChip
                    slug={don.banSlug}
                    name={don.banTen}
                    avatarUrl={don.banAvatarUrl}
                  />
                </>
              ) : role === "seller" ? (
                <>
                  Người mua:{" "}
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
                    name={don.muaTen ?? "Người mua"}
                    avatarUrl={don.muaAvatarUrl}
                  />
                  {" → "}
                  <PartyChip
                    slug={don.banSlug}
                    name={don.banTen ?? "Người bán"}
                    avatarUrl={don.banAvatarUrl}
                  />
                </>
              )}
            </p>

            <div className="shop-don-detail-body">
            <div className="shop-don-detail-main">
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
              <span>Tổng hàng</span>
              <strong>
                {don.tongTien.toLocaleString("vi-VN")} {don.tienTe}
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
                <span className="shop-don-detail-note-label">Khiếu nại</span>
                {!knOpen ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn ghost"
                    onClick={() => setKnOpen(true)}
                  >
                    Mở khiếu nại
                  </button>
                ) : (
                  <div className="shop-don-detail-huy">
                    <select
                      className="shop-don-detail-huy-input"
                      value={knLyDo}
                      onChange={(e) =>
                        setKnLyDo(
                          e.target.value as keyof typeof SHOP_LY_DO_KHIEU_NAI_LABEL,
                        )
                      }
                    >
                      {(
                        Object.keys(SHOP_LY_DO_KHIEU_NAI_LABEL) as Array<
                          keyof typeof SHOP_LY_DO_KHIEU_NAI_LABEL
                        >
                      ).map((k) => (
                        <option key={k} value={k}>
                          {SHOP_LY_DO_KHIEU_NAI_LABEL[k]}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="shop-don-detail-huy-input"
                      rows={2}
                      placeholder="Mô tả ngắn…"
                      value={knMoTa}
                      onChange={(e) => setKnMoTa(e.target.value)}
                    />
                    <p className="shop-don-detail-huy-hint">
                      CINs trọng tài cấp 1, không hoàn tiền. Hai bên tự dàn xếp
                      nếu cần chuyển lại tiền.
                    </p>
                    <div className="shop-don-detail-actions-row">
                      <button
                        type="button"
                        className="shop-don-detail-btn danger"
                        disabled={knBusy}
                        onClick={() => void moKhieuNai()}
                      >
                        Gửi khiếu nại
                      </button>
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost"
                        disabled={knBusy}
                        onClick={() => setKnOpen(false)}
                      >
                        Hủy
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
                    Thông tin nhận hàng
                  </span>
                  <div className="shop-don-detail-nhan-tools">
                    <button
                      type="button"
                      className="shop-don-detail-btn ghost shop-don-detail-nhan-tool"
                      title="Copy họ tên, SĐT, địa chỉ"
                      onClick={() =>
                        void copyText(
                          formatDiaChiNhanCopy(don),
                          "Đã copy thông tin nhận",
                        )
                      }
                    >
                      <Copy size={14} aria-hidden />
                      Copy
                    </button>
                    {role === "seller" ? (
                      <button
                        type="button"
                        className="shop-don-detail-btn ghost shop-don-detail-nhan-tool"
                        title="In phiếu đóng gói"
                        onClick={() => {
                          try {
                            printPhieuDongGoi(don);
                          } catch {
                            setErr(
                              "Trình duyệt chặn cửa sổ in — cho phép popup rồi thử lại.",
                            );
                          }
                        }}
                      >
                        <Printer size={14} aria-hidden />
                        Phiếu
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
                    <span>Họ tên</span>
                    <strong>{don.muaHoTen}</strong>
                    <button
                      type="button"
                      className="shop-don-detail-copy-one"
                      aria-label="Copy họ tên"
                      onClick={() =>
                        void copyText(don.muaHoTen ?? "", "Đã copy họ tên")
                      }
                    >
                      <Copy size={12} aria-hidden />
                    </button>
                  </p>
                ) : null}
                {don.muaSoDienThoai ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>SĐT</span>
                    <a href={`tel:${don.muaSoDienThoai.replace(/\s+/g, "")}`}>
                      {don.muaSoDienThoai}
                    </a>
                    <button
                      type="button"
                      className="shop-don-detail-copy-one"
                      aria-label="Copy số điện thoại"
                      onClick={() =>
                        void copyText(
                          don.muaSoDienThoai ?? "",
                          "Đã copy SĐT",
                        )
                      }
                    >
                      <Copy size={12} aria-hidden />
                    </button>
                  </p>
                ) : null}
                {don.muaDiaChi ? (
                  <p className="shop-don-detail-nhan-line">
                    <span>Địa chỉ</span>
                    <strong>{don.muaDiaChi}</strong>
                    <button
                      type="button"
                      className="shop-don-detail-copy-one"
                      aria-label="Copy địa chỉ"
                      onClick={() =>
                        void copyText(don.muaDiaChi ?? "", "Đã copy địa chỉ")
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
                        Thông tin đơn vận chuyển
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
                        Theo dõi đơn hàng
                        <span className="shop-don-detail-vc-carrier">
                          {[don.vanChuyenDvvc, don.vanChuyenMa]
                            .filter(Boolean)
                            .join(" · ") || "Tra cứu"}
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
                            aria-label="Đơn vị vận chuyển"
                            onChange={(e) => setVcDvvcDraft(e.target.value)}
                          >
                            <option value="">Chọn ĐVVC</option>
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
                            placeholder="Mã vận đơn"
                            disabled={busy}
                            aria-label="Mã vận đơn"
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
                              Lưu
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
                                Xóa
                              </button>
                            ) : null}
                          </div>
                          {don.trangThai === "da_nhan_tien" ||
                          don.trangThai === "cho_lay_hang" ? (
                            <p className="shop-don-detail-huy-hint">
                              Lưu ĐVVC + mã sẽ chuyển đơn sang «Đang giao».
                            </p>
                          ) : null}
                        </form>
                      ) : don.vanChuyenMa || don.vanChuyenDvvc ? (
                        <>
                          {don.vanChuyenDvvc ? (
                            <p className="shop-don-detail-nhan-line">
                              <span>ĐVVC</span>
                              <strong>{don.vanChuyenDvvc}</strong>
                            </p>
                          ) : null}
                          {don.vanChuyenMa ? (
                            <p className="shop-don-detail-nhan-line">
                              <span>Mã</span>
                              <strong>{don.vanChuyenMa}</strong>
                            </p>
                          ) : null}
                        </>
                      ) : don.trangThai === "cho_xac_nhan" ? (
                        <p className="shop-don-detail-huy-hint">
                          Xác nhận đơn trước khi nhập mã vận chuyển.
                        </p>
                      ) : null
                    ) : null}
                  </div>
              );
            })()}

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
                      ? "Xác nhận đã nhận tiền"
                      : "Đã giao / nhận hàng"}
                  </button>
                ) : null}

                {don.trangThai === "da_nhan_tien" && role === "seller" ? (
                  <button
                    type="button"
                    className="shop-don-detail-btn primary"
                    disabled={busy}
                    onClick={() => void patch("hoan_thanh")}
                  >
                    Hoàn thành
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
                      Hoàn thành
                    </button>
                    <button
                      type="button"
                      className="shop-don-detail-btn danger"
                      disabled={busy}
                      onClick={() => void patch("hoan_tra")}
                    >
                      Hoàn trả
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
                      Hoàn thành
                    </button>
                    <button
                      type="button"
                      className="shop-don-detail-btn danger"
                      disabled={busy}
                      onClick={() => void patch("hoan_tra")}
                    >
                      Hoàn trả
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
                    Hoàn thành
                  </button>
                ) : null}

                {(onOpenChat && (role === "seller" || role === "buyer")) ||
                (don.trangThai === "cho_xac_nhan" && role === "seller") ? (
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
                        Chat người mua
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
                    {confirmBlock ? (
                      <div className="shop-don-detail-confirm-block">
                        <span className="shop-don-detail-confirm-block-text">
                          Chặn người mua này? Họ sẽ không thể mua hàng từ shop của bạn.
                        </span>
                        <div className="shop-don-detail-confirm-block-actions">
                          <button
                            type="button"
                            className="shop-don-detail-btn danger"
                            disabled={busy}
                            onClick={() => void blockBuyer()}
                          >
                            <Ban size={14} strokeWidth={2} aria-hidden />
                            Xác nhận chặn
                          </button>
                          <button
                            type="button"
                            className="shop-don-detail-btn ghost"
                            disabled={busy}
                            onClick={() => setConfirmBlock(false)}
                          >
                            Huỷ
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
                            Bỏ chặn
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="shop-don-detail-btn ghost"
                            disabled={busy || !hasReported}
                            title={
                              !hasReported
                                ? "Hãy báo cáo người mua trước khi chặn"
                                : undefined
                            }
                            onClick={() => setConfirmBlock(true)}
                          >
                            <Ban size={14} strokeWidth={2} aria-hidden />
                            Chặn
                          </button>
                        )}
                        <button
                          type="button"
                          className="shop-don-detail-btn ghost"
                          onClick={() => setReportOpen(true)}
                        >
                          <Flag size={14} strokeWidth={2} aria-hidden />
                          Báo cáo{hasReported ? " ✓" : ""}
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
          onSubmitted={() => setHasReported(true)}
        />
      ) : null}
    </div>,
    document.body,
  );
}

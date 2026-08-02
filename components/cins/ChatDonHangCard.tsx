"use client";

import { Check, Copy, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { ShopDonDetailModal } from "@/components/shop/ShopDonDetailModal";
import type { ChatContextCard } from "@/lib/chat/types";
import type { ShopDonHang } from "@/lib/shop/types";
import {
  buildTheoDoiUrl,
  detectDvvcTuLink,
  extractMaTuTheoDoiUrl,
  safeHttpUrl,
} from "@/lib/shop/van-chuyen";

type ParsedDon = {
  ma: string;
  loaiThanhToan: string | null;
  trangThai: string | null;
  tong: string | null;
  items: string[];
  ghiChu: string | null;
  theoDoi: string | null;
  maVanDon: string | null;
  dvvc: string | null;
};

const LOAI_THANH_TOAN = new Set([
  "Thanh toán sau",
  "Thanh toán luôn",
  "Đã thanh toán",
]);

function parseDonHangCard(card: ChatContextCard): ParsedDon {
  const maMatch = card.tieuDe.match(/^Đơn\s+(.+)$/i);
  const ma = maMatch?.[1]?.trim() || card.tieuDe.trim() || "—";
  const lines = (card.moTa ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let loaiThanhToan: string | null = null;
  let trangThai: string | null = null;
  let tong: string | null = null;
  let ghiChu: string | null = null;
  let theoDoi: string | null = null;
  let maVanDon: string | null = null;
  let dvvc: string | null = null;
  const items: string[] = [];

  for (const line of lines) {
    if (LOAI_THANH_TOAN.has(line)) {
      loaiThanhToan = line === "Thanh toán luôn" ? "Đã thanh toán" : line;
      continue;
    }
    const ttMatch = line.match(/^Tình trạng:\s*(.+)$/i);
    if (ttMatch) {
      trangThai = ttMatch[1]!.trim();
      continue;
    }
    /* Legacy: dòng trạng thái shop đứng riêng (trước khi có prefix). */
    if (
      line === "Chờ xác nhận" ||
      line === "Đã nhận tiền" ||
      line === "Đã nhận tiền / đang soạn" ||
      line === "Chờ lấy hàng" ||
      line === "Đang giao đơn" ||
      line === "Đang giao" ||
      line === "Thanh toán khi nhận hàng" ||
      line === "Đã giao tại sự kiện" ||
      line === "Hoàn thành" ||
      line === "Hoàn trả" ||
      line === "Đã hủy" ||
      line === "Nháp"
    ) {
      trangThai = line;
      continue;
    }
    if (/^Tổng:\s*/i.test(line)) {
      tong = line.replace(/^Tổng:\s*/i, "").trim();
      continue;
    }
    if (/^Ghi chú:\s*/i.test(line)) {
      const note = line.replace(/^Ghi chú:\s*/i, "").trim();
      ghiChu = note || null;
      continue;
    }
    if (/^Theo dõi:\s*/i.test(line)) {
      const url = line.replace(/^Theo dõi:\s*/i, "").trim();
      theoDoi = safeHttpUrl(url);
      continue;
    }
    const maVdMatch = line.match(/^Mã vận đơn:\s*(.+)$/i);
    if (maVdMatch) {
      const rest = maVdMatch[1]!.trim();
      const withDvvc = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (withDvvc) {
        maVanDon = withDvvc[1]!.trim() || null;
        dvvc = withDvvc[2]!.trim() || null;
      } else {
        maVanDon = rest || null;
      }
      continue;
    }
    /* Lý do hủy + cảnh báo hoàn tiền đã hiện ở thông báo cập nhật phía trên. */
    if (
      /^Lý do hủy:\s*/i.test(line) ||
      line.startsWith("Nền tảng không giữ tiền")
    ) {
      continue;
    }
    items.push(line.replace(/^•\s*/, "").replace(/\s*\(Mặc định\)/g, ""));
  }

  if (!maVanDon && theoDoi) {
    maVanDon = extractMaTuTheoDoiUrl(theoDoi);
  }
  /* Slug trang (vd. tra-cuu-hanh-trinh-don) — không phải mã; thử lại từ URL. */
  if (maVanDon && !/\d/.test(maVanDon)) {
    maVanDon = theoDoi ? extractMaTuTheoDoiUrl(theoDoi) : null;
  }
  if (!dvvc && theoDoi) {
    dvvc = detectDvvcTuLink(theoDoi);
  }

  return {
    ma,
    loaiThanhToan,
    trangThai,
    tong,
    items,
    ghiChu,
    theoDoi,
    maVanDon,
    dvvc,
  };
}

type Props = {
  card: ChatContextCard;
  tone?: "me" | "them";
};

export function ChatDonHangCard({ card, tone = "them" }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const parsed = parseDonHangCard(card);
  const {
    ma,
    loaiThanhToan,
    trangThai,
    tong,
    items,
    ghiChu,
  } = parsed;
  const donId = card.id?.trim() || null;
  /** Snapshot chat có thể cũ / suy mã từ URL sai — ưu tiên mã từ DB đơn. */
  const [liveVc, setLiveVc] = useState<{
    ma: string | null;
    dvvc: string | null;
    theoDoi: string | null;
  } | null>(null);

  useEffect(() => {
    if (!donId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/shop/don/${donId}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { don?: ShopDonHang };
        const don = json.don;
        if (!don || cancelled) return;
        const maLive = don.vanChuyenMa?.trim() || null;
        const dvvcLive = don.vanChuyenDvvc?.trim() || null;
        const theoDoiLive =
          buildTheoDoiUrl(dvvcLive, maLive) ||
          safeHttpUrl(don.vanChuyenLink) ||
          null;
        setLiveVc({ ma: maLive, dvvc: dvvcLive, theoDoi: theoDoiLive });
      } catch {
        /* giữ snapshot card */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [donId]);

  const maVanDon = liveVc?.ma ?? parsed.maVanDon;
  const dvvc = liveVc?.dvvc ?? parsed.dvvc;
  const theoDoi = liveVc?.theoDoi ?? parsed.theoDoi;
  const visibleItems = items.slice(0, 3);
  const moreCount = Math.max(0, items.length - visibleItems.length);
  const isPayLater = loaiThanhToan === "Thanh toán sau";
  const isPaid =
    loaiThanhToan === "Đã thanh toán" || loaiThanhToan === "Thanh toán luôn";
  const badgeLabel = isPaid
    ? "Đã thanh toán"
    : loaiThanhToan === "Thanh toán sau"
      ? "Thanh toán sau"
      : loaiThanhToan;
  const bienLaiUrl = card.anh?.trim() || null;
  const statusDone =
    trangThai === "Đã nhận tiền" ||
    trangThai === "Đã nhận tiền / đang soạn" ||
    trangThai === "Thanh toán khi nhận hàng" ||
    trangThai === "Đã giao tại sự kiện" ||
    trangThai === "Đang giao đơn" ||
    trangThai === "Đang giao" ||
    trangThai === "Chờ lấy hàng";
  const statusPending = trangThai === "Chờ xác nhận";
  const statusCanceled = trangThai === "Đã hủy";
  const showTrack = !statusCanceled && Boolean(theoDoi || maVanDon);

  const className = [
    "cins-chat-don-card",
    tone === "me" ? "is-me" : "",
    /* Hủy là trạng thái cuối — không gắn is-paid lên card (badge vẫn hiện Đã thanh toán).
       Tránh hover `.is-paid` đè `.is-canceled` → nhấp nháy xanh/đỏ khi scroll. */
    isPaid && !statusCanceled ? "is-paid" : "",
    isPayLater && !statusCanceled ? "is-later" : "",
    statusCanceled ? "is-canceled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  async function copyMaVanDon() {
    if (!maVanDon) return;
    try {
      await navigator.clipboard.writeText(maVanDon);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="cins-chat-don-card-shell">
        <button
          type="button"
          className={className}
          onClick={() => {
            if (donId) setDetailOpen(true);
          }}
        >
          <span className="cins-chat-don-card-top">
            <span className="cins-chat-don-card-icon" aria-hidden>
              <ShoppingBag size={14} strokeWidth={2.2} />
            </span>
            <span className="cins-chat-don-card-head">
              <span className="cins-chat-don-card-label">Đơn hàng</span>
              {badgeLabel ? (
                <span
                  className={`cins-chat-don-card-badge${isPayLater ? " is-later" : ""}${isPaid ? " is-paid" : !isPayLater ? " is-now" : ""}`}
                >
                  {badgeLabel}
                </span>
              ) : null}
            </span>
          </span>

          <span className="cins-chat-don-card-ma">{ma}</span>

          {trangThai ? (
            <span
              className={`cins-chat-don-card-status${statusDone ? " is-done" : ""}${statusPending ? " is-pending" : ""}${statusCanceled ? " is-canceled" : ""}`}
            >
              {trangThai}
            </span>
          ) : null}

          {tong ? (
            <span className="cins-chat-don-card-tong">
              <span className="cins-chat-don-card-tong-label">Tổng</span>
              <strong>{tong}</strong>
            </span>
          ) : null}

          {visibleItems.length > 0 ? (
            <span className="cins-chat-don-card-mid">
              <span className="cins-chat-don-card-items">
                {visibleItems.map((item) => (
                  <span key={item} className="cins-chat-don-card-item">
                    {item}
                  </span>
                ))}
                {moreCount > 0 ? (
                  <span className="cins-chat-don-card-more">
                    +{moreCount} mặt hàng nữa
                  </span>
                ) : null}
              </span>
            </span>
          ) : null}

          {ghiChu ? (
            <span className="cins-chat-don-card-note">
              <span className="cins-chat-don-card-note-label">Lời nhắn</span>
              <span className="cins-chat-don-card-note-text">{ghiChu}</span>
            </span>
          ) : null}

          <span className="cins-chat-don-card-cta">Xem chi tiết đơn</span>
        </button>

        {showTrack ? (
          <div className="cins-chat-don-card-track-bar">
            {maVanDon ? (
              <div className="cins-chat-don-card-ma-vd">
                <span className="cins-chat-don-card-ma-vd-meta">
                  <span className="cins-chat-don-card-ma-vd-label">
                    {dvvc ? `${dvvc} · Mã` : "Mã vận đơn"}
                  </span>
                  <strong className="cins-chat-don-card-ma-vd-code">
                    {maVanDon}
                  </strong>
                </span>
                <button
                  type="button"
                  className={`cins-chat-don-card-ma-vd-copy${copied ? " is-copied" : ""}`}
                  aria-label={copied ? "Đã copy mã vận đơn" : "Copy mã vận đơn"}
                  title={copied ? "Đã copy" : "Copy mã"}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyMaVanDon();
                  }}
                >
                  {copied ? (
                    <Check size={15} strokeWidth={2.4} aria-hidden />
                  ) : (
                    <Copy size={15} strokeWidth={2.2} aria-hidden />
                  )}
                </button>
              </div>
            ) : null}
            {theoDoi ? (
              <a
                href={theoDoi}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="cins-chat-don-card-track"
                onClick={(e) => e.stopPropagation()}
              >
                <Truck size={14} strokeWidth={2.2} aria-hidden />
                Theo dõi đơn hàng
              </a>
            ) : null}
          </div>
        ) : null}

        {bienLaiUrl ? (
          <div className="cins-chat-don-card-bill">
            <button
              type="button"
              className="cins-chat-don-card-bill-toggle"
              aria-expanded={billOpen}
              onClick={() => setBillOpen((v) => !v)}
            >
              {billOpen ? "Ẩn biên lai" : "Xem biên lai"}
            </button>
            {billOpen ? (
              <a
                href={bienLaiUrl}
                target="_blank"
                rel="noreferrer"
                className="cins-chat-don-card-bill-link"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bienLaiUrl}
                  alt="Biên lai chuyển khoản"
                  className="cins-chat-don-card-bill-img"
                />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <ShopDonDetailModal
        donId={donId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        viewerRole="auto"
      />
    </>
  );
}

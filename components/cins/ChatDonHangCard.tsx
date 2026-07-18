"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";

import { ShopDonDetailModal } from "@/components/shop/ShopDonDetailModal";
import type { ChatContextCard } from "@/lib/chat/types";

type ParsedDon = {
  ma: string;
  loaiThanhToan: string | null;
  trangThai: string | null;
  tong: string | null;
  items: string[];
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
      line === "Đã giao tại sự kiện" ||
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
    items.push(line.replace(/^•\s*/, "").replace(/\s*\(Mặc định\)/g, ""));
  }

  return { ma, loaiThanhToan, trangThai, tong, items };
}

type Props = {
  card: ChatContextCard;
  tone?: "me" | "them";
};

export function ChatDonHangCard({ card, tone = "them" }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { ma, loaiThanhToan, trangThai, tong, items } = parseDonHangCard(card);
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
  const donId = card.id?.trim() || null;
  const statusDone =
    trangThai === "Đã nhận tiền" || trangThai === "Đã giao tại sự kiện";
  const statusPending = trangThai === "Chờ xác nhận";

  const className = [
    "cins-chat-don-card",
    tone === "me" ? "is-me" : "",
    isPaid ? "is-paid" : "",
    isPayLater ? "is-later" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
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
            className={`cins-chat-don-card-status${statusDone ? " is-done" : ""}${statusPending ? " is-pending" : ""}`}
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

        <span className="cins-chat-don-card-cta">Xem chi tiết đơn</span>
      </button>

      <ShopDonDetailModal
        donId={donId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        viewerRole="auto"
      />
    </>
  );
}

"use client";

import { GraduationCap } from "lucide-react";
import { useState } from "react";

import type { ChatContextCard } from "@/lib/chat/types";

type Parsed = {
  ma: string;
  trangThai: string | null;
  tong: string | null;
  soNgay: string | null;
  items: string[];
  nganHang: string | null;
  soTk: string | null;
  chuTk: string | null;
};

function parseDonHocPhiCard(card: ChatContextCard): Parsed {
  const maMatch = card.tieuDe.match(/^Học phí\s+(.+)$/i);
  const ma = maMatch?.[1]?.trim() || card.tieuDe.trim() || "—";
  const lines = (card.moTa ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let trangThai: string | null = null;
  let tong: string | null = null;
  let soNgay: string | null = null;
  let nganHang: string | null = null;
  let soTk: string | null = null;
  let chuTk: string | null = null;
  const items: string[] = [];

  for (const line of lines) {
    const tt = line.match(/^Tình trạng:\s*(.+)$/i);
    if (tt) {
      trangThai = tt[1]!.trim();
      continue;
    }
    if (/^Tổng:\s*/i.test(line)) {
      tong = line.replace(/^Tổng:\s*/i, "").trim();
      continue;
    }
    if (/\d+\s*ngày học/i.test(line)) {
      soNgay = line;
      continue;
    }
    if (/^NH:\s*/i.test(line)) {
      nganHang = line.replace(/^NH:\s*/i, "").trim();
      continue;
    }
    if (/^STK:\s*/i.test(line)) {
      soTk = line.replace(/^STK:\s*/i, "").trim();
      continue;
    }
    if (/^Chủ TK:\s*/i.test(line)) {
      chuTk = line.replace(/^Chủ TK:\s*/i, "").trim();
      continue;
    }
    if (/^Lớp:\s*/i.test(line)) {
      items.push(line);
      continue;
    }
    items.push(line);
  }

  return { ma, trangThai, tong, soNgay, items, nganHang, soTk, chuTk };
}

type Props = {
  card: ChatContextCard;
  tone?: "me" | "them";
  /**
   * Chỉ staff có quyền đối soát học phí (`hoc-phi-doi-soat` = sua) mới thấy
   * và bấm «Xác nhận đã nhận tiền». Học viên / viewer khác chỉ xem QR.
   */
  canConfirmPaid?: boolean;
};

export function ChatDonHocPhiCard({
  card,
  tone = "them",
  canConfirmPaid = false,
}: Props) {
  const parsed = parseDonHocPhiCard(card);
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [qrOpen, setQrOpen] = useState(true);
  const pending = !confirmedLocal && parsed.trangThai === "Chờ thanh toán";
  const paid = confirmedLocal || parsed.trangThai === "Đã nhận tiền";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrUrl = pending ? card.anh?.trim() || null : null;

  async function confirmPaid() {
    if (!canConfirmPaid || !card.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/hoc-phi/${card.id}/xac-nhan`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xác nhận thất bại.");
      setConfirmedLocal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi xác nhận.");
    } finally {
      setBusy(false);
    }
  }

  const className = [
    "cins-chat-don-card",
    tone === "me" ? "is-me" : "",
    paid ? "is-paid" : "",
    pending ? "is-later" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cins-chat-don-card-shell">
      <div className={className}>
        <span className="cins-chat-don-card-top">
          <span className="cins-chat-don-card-icon" aria-hidden>
            <GraduationCap size={14} strokeWidth={2.2} />
          </span>
          <span className="cins-chat-don-card-head">
            <span className="cins-chat-don-card-label">Học phí</span>
            <span
              className={`cins-chat-don-card-badge${paid ? " is-paid" : pending ? " is-later" : " is-now"}`}
            >
              {paid ? "Đã nhận" : pending ? "Chờ TT" : "Đơn HP"}
            </span>
          </span>
        </span>

        <span className="cins-chat-don-card-ma">{parsed.ma}</span>

          {parsed.trangThai || paid ? (
          <span
            className={`cins-chat-don-card-status${paid ? " is-done" : ""}${pending ? " is-pending" : ""}`}
          >
            {paid ? "Đã nhận tiền" : parsed.trangThai}
          </span>
        ) : null}

        {parsed.tong ? (
          <span className="cins-chat-don-card-tong">
            <span className="cins-chat-don-card-tong-label">Tổng</span>
            <strong>{parsed.tong}</strong>
          </span>
        ) : null}

        {parsed.soNgay || parsed.items.length > 0 ? (
          <span className="cins-chat-don-card-mid">
            <span className="cins-chat-don-card-items">
              {parsed.soNgay ? (
                <span className="cins-chat-don-card-item">{parsed.soNgay}</span>
              ) : null}
              {parsed.items.slice(0, 3).map((item) => (
                <span key={item} className="cins-chat-don-card-item">
                  {item}
                </span>
              ))}
            </span>
          </span>
        ) : null}

        {pending && (parsed.soTk || parsed.nganHang) ? (
          <span className="cins-chat-don-card-note">
            <span className="cins-chat-don-card-note-label">Chuyển khoản</span>
            <span className="cins-chat-don-card-note-text">
              {[parsed.nganHang, parsed.soTk, parsed.chuTk]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        ) : null}

        {qrUrl ? (
          <div className="cins-chat-don-card-bill">
            <button
              type="button"
              className="cins-chat-don-card-bill-toggle"
              aria-expanded={qrOpen}
              onClick={() => setQrOpen((v) => !v)}
            >
              {qrOpen ? "Ẩn VietQR" : "Hiện VietQR"}
            </button>
            {qrOpen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt={`VietQR ${parsed.ma}`}
                className="cins-chat-don-card-bill-img"
              />
            ) : null}
          </div>
        ) : null}

        {pending && canConfirmPaid ? (
          <button
            type="button"
            className="cins-chat-don-card-cta"
            disabled={busy}
            onClick={() => void confirmPaid()}
          >
            {busy ? "Đang xác nhận…" : "Xác nhận đã nhận tiền"}
          </button>
        ) : (
          <span className="cins-chat-don-card-cta">
            {paid
              ? "Đã cộng ngày học"
              : pending
                ? "Chờ cơ sở xác nhận"
                : "Đơn học phí"}
          </span>
        )}
        {error ? (
          <span className="cins-chat-don-card-note-text" style={{ color: "#b91c1c" }}>
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

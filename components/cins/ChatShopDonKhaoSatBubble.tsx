"use client";

import { Check, Package, PackageOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ShopDonDetailModal } from "@/components/shop/ShopDonDetailModal";
import type { ChatShopDonKhaoSatNotice } from "@/lib/chat/types";
import type { ShopDonHang } from "@/lib/shop/types";

const OPEN_TT = new Set([
  "da_nhan_tien",
  "cho_lay_hang",
  "dang_giao",
  "da_giao_tai_su_kien",
]);

type Props = {
  notice: ChatShopDonKhaoSatNotice;
  fallbackBody?: string;
};

export function ChatShopDonKhaoSatBubble({ notice, fallbackBody }: Props) {
  const [donId, setDonId] = useState(notice.donId || "");
  const [don, setDon] = useState<ShopDonHang | null>(null);
  const [canKhaoSat, setCanKhaoSat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const maDon = notice.maDon || don?.maDon || null;

  const loadDon = useCallback(async (id: string) => {
    const res = await fetch(`/api/shop/orders/${id}`, { credentials: "include" });
    const json = (await res.json().catch(() => null)) as {
      don?: ShopDonHang;
      dongDon?: { canKhaoSat?: boolean };
      error?: string;
    } | null;
    if (!res.ok || !json?.don) {
      setErr(json?.error ?? "Không tải được đơn.");
      return null;
    }
    setDon(json.don);
    setCanKhaoSat(Boolean(json.dongDon?.canKhaoSat));
    setErr(null);
    return json.don;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (notice.donId) {
          if (!cancelled) {
            setDonId(notice.donId);
            await loadDon(notice.donId);
          }
          return;
        }
        if (!notice.maDon) return;
        const res = await fetch("/api/shop/orders?role=buyer", {
          credentials: "include",
        });
        const json = (await res.json().catch(() => null)) as {
          items?: ShopDonHang[];
        } | null;
        const hit = (json?.items ?? []).find(
          (d) => d.maDon?.toUpperCase() === notice.maDon?.toUpperCase(),
        );
        if (!hit) {
          if (!cancelled) setErr("Không tìm thấy đơn — mở lịch sử mua hàng.");
          return;
        }
        if (!cancelled) {
          setDonId(hit.id);
          await loadDon(hit.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notice.donId, notice.maDon, loadDon]);

  async function patch(
    action: "buyer_da_nhan" | "buyer_chua_nhan",
  ): Promise<void> {
    if (!donId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/orders/${donId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: ShopDonHang;
        ketQua?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không cập nhật được.");
        return;
      }
      if (json?.don) setDon(json.don);
      if (action === "buyer_da_nhan") {
        setFlash("Đã xác nhận nhận hàng — cảm ơn bạn!");
      } else if (json?.ketQua === "mo_khieu_nai") {
        setFlash("Đã chuyển admin xử lý — không phải cáo buộc tự động.");
      } else {
        setFlash("Đã ghi nhận chưa nhận — sẽ hỏi lại sau vài ngày.");
      }
      if (json?.don) await loadDon(donId);
    } finally {
      setBusy(false);
    }
  }

  const showActions =
    Boolean(donId) &&
    don &&
    OPEN_TT.has(don.trangThai) &&
    !don.hoanThanhLuc &&
    !flash;

  return (
    <div className="cins-chat-shop-khao-sat">
      <p className="cins-chat-shop-khao-sat-text">
        {fallbackBody?.trim() ||
          `Bạn đã nhận hàng đơn ${maDon ?? "này"} chưa?`}
      </p>
      {maDon ? (
        <span className="cins-chat-shop-khao-sat-ma">Mã {maDon}</span>
      ) : null}
      {loading ? (
        <p className="cins-chat-shop-khao-sat-note">Đang tải đơn…</p>
      ) : null}
      {err ? (
        <p className="cins-chat-shop-khao-sat-err" role="alert">
          {err}
        </p>
      ) : null}
      {flash ? (
        <p className="cins-chat-shop-khao-sat-flash" role="status">
          {flash}
        </p>
      ) : null}
      {showActions ? (
        <div className="cins-chat-shop-khao-sat-actions">
          <button
            type="button"
            className="cins-chat-shop-khao-sat-btn is-primary"
            disabled={busy}
            onClick={() => void patch("buyer_da_nhan")}
          >
            <Check size={15} strokeWidth={2.4} aria-hidden />
            Đã nhận hàng
          </button>
          {canKhaoSat ? (
            <button
              type="button"
              className="cins-chat-shop-khao-sat-btn is-ghost"
              disabled={busy}
              onClick={() => void patch("buyer_chua_nhan")}
            >
              Chưa nhận
            </button>
          ) : null}
          <button
            type="button"
            className="cins-chat-shop-khao-sat-btn is-ghost"
            disabled={busy || !donId}
            onClick={() => setDetailOpen(true)}
          >
            <PackageOpen size={15} strokeWidth={2.2} aria-hidden />
            Mở đơn
          </button>
        </div>
      ) : donId && !showActions && !loading && !flash ? (
        <div className="cins-chat-shop-khao-sat-actions">
          <button
            type="button"
            className="cins-chat-shop-khao-sat-btn is-ghost"
            onClick={() => setDetailOpen(true)}
          >
            <Package size={15} strokeWidth={2.2} aria-hidden />
            Xem đơn
          </button>
        </div>
      ) : null}
      {donId ? (
        <ShopDonDetailModal
          donId={donId}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          viewerRole="auto"
          onDonChange={(next) => setDon(next)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export type ShopPhiGateLite = {
  trangThai: "hoat_dong" | "canh_bao" | "khoa_nhan_don";
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  tuKhaiTamMo?: boolean;
  dichVuId: string | null;
  sellerId: string;
};

/** Định dạng YYYY-MM-DD → DD/MM/YYYY. */
export function fmtPhiYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

/** Định dạng số → "1.000₫". */
export function fmtPhiVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

/** Link trang thanh toán phí nền tảng cho shop. */
export function phiThanhToanHref(gate: ShopPhiGateLite): string {
  const dvParam = gate.dichVuId ?? gate.sellerId;
  return `/account/billing?dv=${encodeURIComponent(dvParam)}`;
}

/**
 * Đọc trạng thái gate phí nền tảng shop từ `/api/shop/fees/gate`.
 * Trả `null` khi chưa tải hoặc lỗi (không chặn UI).
 */
export function useShopPhiGate(): ShopPhiGateLite | null {
  const [gate, setGate] = useState<ShopPhiGateLite | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/shop/fees/gate", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const json = (await res.json()) as ShopPhiGateLite;
        if (!cancelled) setGate(json);
      } catch {
        /* bỏ qua — không chặn UI */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return gate;
}

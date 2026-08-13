"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { BillingJourneyPin } from "@/lib/billing/types";

type Props = {
  /** Server prop từ JourneyTimelineSection; null = chưa biết / không nợ. */
  initialPin?: BillingJourneyPin | null;
  /** Khi không có initialPin: fetch hub (owner đang xem Journey của mình). */
  fetchIfNeeded?: boolean;
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function fmtHan(ymd: string | null): string | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function pinFromHubJson(json: {
  tongNoVnd?: number;
  hanTraGanNhat?: string | null;
  hoaDon?: Array<{ conNoVnd?: number }>;
  theoDichVu?: Array<{ soKyNo?: number }>;
}): BillingJourneyPin | null {
  const tong = Number(json.tongNoVnd) || 0;
  if (tong <= 0) return null;
  const soHoaDonNo =
    (json.hoaDon ?? []).filter((h) => (h.conNoVnd ?? 0) > 0).length ||
    (json.theoDichVu ?? []).reduce((s, d) => s + (d.soKyNo ?? 0), 0);
  return {
    tongNoVnd: tong,
    soHoaDonNo,
    hanTraGanNhat: json.hanTraGanNhat ?? null,
  };
}

/**
 * Ghim đầu Journey — chỉ render khi còn nợ phí (owner).
 * Link → hub thanh toán.
 */
export function JourneyBillingPinBanner({
  initialPin = null,
  fetchIfNeeded = false,
}: Props) {
  const [pin, setPin] = useState<BillingJourneyPin | null>(initialPin);

  useEffect(() => {
    setPin(initialPin ?? null);
  }, [initialPin]);

  useEffect(() => {
    if (!fetchIfNeeded || initialPin != null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/billing", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as Parameters<typeof pinFromHubJson>[0];
        if (!cancelled) setPin(pinFromHubJson(json));
      } catch {
        /* im lặng — không chặn Journey */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchIfNeeded, initialPin]);

  if (!pin || pin.tongNoVnd <= 0) return null;

  const han = fmtHan(pin.hanTraGanNhat);
  const soKy =
    pin.soHoaDonNo > 0
      ? `${pin.soHoaDonNo} hoá đơn chưa trả`
      : "Còn nợ phí nền tảng";

  return (
    <aside className="j-billing-pin" aria-label="Nhắc nợ phí CINs">
      <div className="j-billing-pin-body">
        <p className="j-billing-pin-title">Còn nợ phí CINs</p>
        <p className="j-billing-pin-meta">
          <strong>{fmtVnd(pin.tongNoVnd)} VND</strong>
          <span aria-hidden> · </span>
          {soKy}
          {han ? (
            <>
              <span aria-hidden> · </span>
              hạn {han}
            </>
          ) : null}
        </p>
      </div>
      <Link href="/account/billing" className="j-billing-pin-cta">
        Thanh toán
      </Link>
    </aside>
  );
}

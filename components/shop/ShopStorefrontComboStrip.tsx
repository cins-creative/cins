"use client";

import { Tag } from "lucide-react";
import { useEffect, useState } from "react";

type ComboPublic = {
  id: string;
  ten: string;
  loaiGiam: "phan_tram" | "so_tien";
  giaTri: number;
  giamToiDa: number | null;
  apDungLap: boolean;
};

function formatGiam(c: ComboPublic): string {
  if (c.loaiGiam === "phan_tram") {
    const base = `−${c.giaTri}%`;
    if (c.giamToiDa != null && c.giamToiDa > 0) {
      return `${base} (tối đa ${c.giamToiDa.toLocaleString("vi-VN")}₫)`;
    }
    return base;
  }
  return `−${c.giaTri.toLocaleString("vi-VN")}₫`;
}

type Props = {
  sellerId: string;
};

/**
 * Strip combo đang chạy trên mặt tiền shop — GET /api/shop/combo/cong-khai.
 */
export function ShopStorefrontComboStrip({ sellerId }: Props) {
  const [items, setItems] = useState<ComboPublic[]>([]);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/shop/combo/cong-khai?sellerId=${encodeURIComponent(sellerId)}`,
          { signal: ac.signal, credentials: "same-origin" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { items?: ComboPublic[] };
        if (!cancelled && Array.isArray(json.items)) {
          setItems(json.items.slice(0, 8));
        }
      } catch {
        /* ignore abort / network */
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [sellerId]);

  if (items.length === 0) return null;

  return (
    <section
      className="j-shop-sf-combo-strip"
      aria-label="Combo đang áp dụng"
    >
      <p className="j-shop-sf-combo-strip-kicker">
        <Tag size={14} strokeWidth={2.25} aria-hidden />
        Combo &amp; giảm giá
      </p>
      <ul className="j-shop-sf-combo-strip-list">
        {items.map((c) => (
          <li key={c.id} className="j-shop-sf-combo-chip">
            <span className="j-shop-sf-combo-chip-ten">{c.ten}</span>
            <span className="j-shop-sf-combo-chip-giam">{formatGiam(c)}</span>
            {c.apDungLap ? (
              <span className="j-shop-sf-combo-chip-lap">áp nhiều lần</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

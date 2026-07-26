"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchBanHangClientStatus } from "@/lib/shop/client-fetch-cache";

import { ShopDashTabs } from "./ShopDashTabs";
import { ShopXinQuayPanel } from "./ShopXinQuayPanel";
import "./shop-dashboard.css";

export function ShopSuKienClient() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const bh = await fetchBanHangClientStatus();
      setEnabled(bh.enabled);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="shop-dash">
        <ShopDashTabs active="su-kien" />
        <div className="shop-dash-loading" aria-busy="true">
          <Loader2 size={20} className="shop-spin" aria-hidden />
          Đang tải…
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="shop-dash">
        <h1>Sự kiện</h1>
        <p>
          Chức năng bán hàng đang tắt. Bật trong{" "}
          <strong>Cài đặt tài khoản → Bán hàng</strong>, hoặc{" "}
          <Link href="/">về trang chủ</Link> rồi mở menu tài khoản.
        </p>
      </div>
    );
  }

  return (
    <div className="shop-dash">
      <ShopDashTabs active="su-kien" />
      {err ? <p className="shop-dash-err">{err}</p> : null}
      <ShopXinQuayPanel />
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
  type ShopLoaiDon,
} from "@/lib/shop/types";

import { ShopDashTabs } from "./ShopDashTabs";
import { ShopDonDetailModal } from "./ShopDonDetailModal";
import "./shop-dashboard.css";

const LOAI_DON_SHORT: Record<ShopLoaiDon, string> = {
  mua_ngay: "Đã thanh toán",
  dat_truoc_nhan_su_kien: "Thanh toán sau",
};

function formatDonTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function tongSoLuong(d: ShopDonHang): number {
  return d.dong.reduce((sum, line) => sum + line.soLuong, 0);
}

export function ShopDonClient() {
  const { openChat } = useCinsChat();
  const [items, setItems] = useState<ShopDonHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/don?role=seller", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopDonHang[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải đơn.");
        return;
      }
      setItems(json?.items ?? []);
    } catch {
      setErr("Không tải đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="shop-dash-loading">
        <Loader2 className="shop-spin" size={20} /> Đang tải…
      </div>
    );
  }

  return (
    <div className="shop-dash">
      <ShopDashTabs active="don" />

      {err ? <p className="shop-dash-err">{err}</p> : null}

      {items.length === 0 ? (
        <p className="shop-dash-hint">Chưa có đơn nào.</p>
      ) : (
        <div className="shop-grid-wrap">
          <table className="shop-grid shop-don-sheet">
            <thead>
              <tr>
                <th scope="col" className="shop-don-col-ma">
                  Mã đơn
                </th>
                <th scope="col" className="shop-don-col-tt">
                  Tình trạng
                </th>
                <th scope="col" className="shop-don-col-mua">
                  Người mua
                </th>
                <th scope="col" className="shop-don-col-time">
                  Thời gian
                </th>
                <th scope="col" className="shop-don-col-loai">
                  Loại
                </th>
                <th scope="col" className="shop-don-col-sp">
                  SP
                </th>
                <th scope="col" className="shop-don-col-tong">
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr
                  key={d.id}
                  className={`shop-grid-row shop-don-sheet-row${
                    d.loaiDon === "mua_ngay" ? " is-paid" : ""
                  }`}
                  tabIndex={0}
                  onClick={() => setSelectedId(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(d.id);
                    }
                  }}
                >
                  <td className="shop-don-col-ma">
                    <span className="shop-dash-ma">
                      {d.maDon ?? "—"}
                    </span>
                  </td>
                  <td className="shop-don-col-tt">
                    <span className={`shop-status shop-status--${d.trangThai}`}>
                      {SHOP_TRANG_THAI_DON_LABEL[d.trangThai]}
                    </span>
                  </td>
                  <td className="shop-don-col-mua">
                    {d.muaTen?.trim() || "—"}
                  </td>
                  <td className="shop-don-col-time">{formatDonTime(d.taoLuc)}</td>
                  <td className="shop-don-col-loai">{LOAI_DON_SHORT[d.loaiDon]}</td>
                  <td className="shop-don-col-sp">{tongSoLuong(d)}</td>
                  <td className="shop-don-col-tong">
                    {d.tongTien.toLocaleString("vi-VN")} {d.tienTe}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ShopDonDetailModal
        donId={selectedId}
        open={selectedId != null}
        onClose={() => setSelectedId(null)}
        viewerRole="seller"
        onDonChange={(don) => {
          setItems((prev) =>
            prev.map((it) => (it.id === don.id ? { ...it, ...don } : it)),
          );
        }}
        onOpenChat={(userId) => {
          void openChat({ targetUserId: userId });
        }}
      />
    </div>
  );
}

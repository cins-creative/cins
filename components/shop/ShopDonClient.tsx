"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  SHOP_LOAI_DON_LABEL,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
} from "@/lib/shop/types";

import { ShopDashTabs } from "./ShopDashTabs";
import "./shop-dashboard.css";

export function ShopDonClient() {
  const { openChat } = useCinsChat();
  const [items, setItems] = useState<ShopDonHang[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function patchDon(
    id: string,
    action: "da_nhan_tien" | "da_giao_tai_su_kien" | "huy",
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/shop/don/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không cập nhật được.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

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
        <ul className="shop-dash-list">
          {items.map((d) => (
            <li key={d.id} className="shop-dash-item shop-dash-item--col">
              <div className="shop-dash-don-top">
                <strong>
                  {d.muaTen ?? "Người mua"} ·{" "}
                  {SHOP_LOAI_DON_LABEL[d.loaiDon]}
                </strong>
                <span className={`shop-status shop-status--${d.trangThai}`}>
                  {SHOP_TRANG_THAI_DON_LABEL[d.trangThai]}
                </span>
              </div>
              <ul className="shop-dash-dong">
                {d.dong.map((line) => (
                  <li key={line.id}>
                    {line.tenSnapshot}
                    {line.nhanSnapshot ? ` (${line.nhanSnapshot})` : ""} ×
                    {line.soLuong} —{" "}
                    {(line.giaDonVi * line.soLuong).toLocaleString("vi-VN")}{" "}
                    {d.tienTe}
                  </li>
                ))}
              </ul>
              <div className="shop-dash-don-foot">
                <strong>
                  Tổng {d.tongTien.toLocaleString("vi-VN")} {d.tienTe}
                </strong>
                <div className="shop-dash-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void openChat({ targetUserId: d.idNguoiMua })
                    }
                  >
                    Chat
                  </button>
                  {d.trangThai === "cho_xac_nhan" ? (
                    <>
                      {d.loaiDon === "mua_ngay" ? (
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => void patchDon(d.id, "da_nhan_tien")}
                        >
                          Đã nhận tiền
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() =>
                            void patchDon(d.id, "da_giao_tai_su_kien")
                          }
                        >
                          Đã giao tại sự kiện
                        </button>
                      )}
                      <button
                        type="button"
                        className="shop-dash-danger"
                        disabled={busyId === d.id}
                        onClick={() => void patchDon(d.id, "huy")}
                      >
                        Hủy
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

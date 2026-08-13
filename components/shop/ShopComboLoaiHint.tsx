"use client";

import Link from "next/link";
import { Check, Package, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GIO_CHUNG_CHANGED_EVENT } from "@/components/shop/ShopGioChungButton";
import {
  comboDieuKienHref,
  COMBO_ACTIVE_STORAGE_PREFIX,
} from "@/lib/shop/combo-storefront";
import { tinhComboTienDo } from "@/lib/shop/uu-dai";
import type { ShopCombo, ShopGioChung, ShopLoaiGiam } from "@/lib/shop/types";

type Props = {
  ownerSlug: string;
  sellerId: string;
  shopName?: string | null;
  comboId: string | null;
};

function mapComboFromApi(
  c: {
    id: string;
    ten: string;
    moTa: string | null;
    loaiGiam: ShopLoaiGiam;
    giaTri: number;
    giamToiDa: number | null;
    apDungLap: boolean;
    dieuKien: Array<{
      id: string;
      phamVi: ShopCombo["dieuKien"][number]["phamVi"];
      idNhom: string | null;
      idSanPham: string | null;
      idBienThe: string | null;
      soLuong: number;
      nhan: string | null;
      anhUrl: string | null;
    }>;
  },
  sellerId: string,
): ShopCombo {
  return {
    id: c.id,
    idNguoiDung: sellerId,
    ten: c.ten,
    moTa: c.moTa,
    loaiGiam: c.loaiGiam,
    giaTri: c.giaTri,
    giamToiDa: c.giamToiDa,
    apDungLap: c.apDungLap,
    batDau: null,
    ketThuc: null,
    kichHoat: true,
    thuTu: 0,
    taoLuc: "",
    dieuKienLoi: false,
    dieuKien: c.dieuKien.map((dk) => ({
      id: dk.id,
      idCombo: c.id,
      phamVi: dk.phamVi,
      idNhom: dk.idNhom,
      idSanPham: dk.idSanPham,
      idBienThe: dk.idBienThe,
      soLuong: dk.soLuong,
      nhan: dk.nhan,
      anhUrl: dk.anhUrl,
    })),
  };
}

/** Gợi ý hoàn thành combo trên trang loại hàng. */
export function ShopComboLoaiHint({
  ownerSlug,
  sellerId,
  shopName,
  comboId,
}: Props) {
  const [combo, setCombo] = useState<ShopCombo | null>(null);
  const [gioSellerDong, setGioSellerDong] = useState<
    ShopGioChung["nhom"][number]["dong"]
  >([]);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    const ac = new AbortController();

    const resolveComboId = (): string | null => {
      if (comboId) return comboId;
      if (typeof window === "undefined") return null;
      try {
        return sessionStorage.getItem(
          `${COMBO_ACTIVE_STORAGE_PREFIX}${sellerId}`,
        );
      } catch {
        return null;
      }
    };

    void (async () => {
      const activeId = resolveComboId();
      if (!activeId) return;
      try {
        const res = await fetch(
          `/api/shop/combos/public?sellerId=${encodeURIComponent(sellerId)}`,
          { signal: ac.signal, credentials: "same-origin" },
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          items?: Parameters<typeof mapComboFromApi>[0][];
        };
        const found = (json.items ?? []).find((c) => c.id === activeId);
        if (found && !cancelled) {
          setCombo(mapComboFromApi(found, sellerId));
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [sellerId, comboId]);

  const loadGio = () => {
    void fetch("/api/shop/shared-cart", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ShopGioChung | null) => {
        const nhom = json?.nhom.find((g) => g.idNguoiBan === sellerId);
        setGioSellerDong(nhom?.dong ?? []);
      })
      .catch(() => {
        setGioSellerDong([]);
      });
  };

  useEffect(() => {
    loadGio();
    const onChange = () => loadGio();
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChange);
  }, [sellerId]);

  const tienDo = useMemo(() => {
    if (!combo) return null;
    return tinhComboTienDo(gioSellerDong, combo);
  }, [combo, gioSellerDong]);

  if (!combo || !tienDo) return null;
  if (tienDo.khopDu) {
    return (
      <aside className="j-shop-combo-hint is-done" aria-live="polite">
        <Sparkles size={16} strokeWidth={2.2} aria-hidden />
        <div className="j-shop-combo-hint-body">
          <strong>Đủ combo «{combo.ten}»</strong>
          <p>Giảm giá sẽ áp khi thanh toán trong giỏ chờ mua.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="j-shop-combo-hint" aria-live="polite">
      <Package size={16} strokeWidth={2.2} aria-hidden />
      <div className="j-shop-combo-hint-body">
        <strong>Combo «{combo.ten}»</strong>
        <p>Thêm các món còn thiếu vào giỏ để được giảm:</p>
        <ul className="j-shop-combo-hint-list">
          {tienDo.dieuKien.map((d) => {
            const dk = combo.dieuKien.find((x) => x.id === d.id);
            const done = d.coDu >= d.can;
            const href =
              dk && !done
                ? comboDieuKienHref(dk, ownerSlug, shopName, combo.id)
                : null;
            return (
              <li
                key={d.id}
                className={`j-shop-combo-hint-item${done ? " is-done" : ""}`}
              >
                {done ? (
                  <Check size={14} strokeWidth={2.5} aria-hidden />
                ) : null}
                <span className="j-shop-combo-hint-item-label">
                  {d.nhan} ×{d.can}
                  {!done ? (
                    <span className="j-shop-combo-hint-item-missing">
                      {" "}
                      (còn {d.can - d.coDu})
                    </span>
                  ) : null}
                </span>
                {href ? (
                  <Link href={href} className="j-shop-combo-hint-link">
                    Chọn
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="j-shop-combo-hint-note">
          Món bạn vừa xem có thể là một phần của combo này.
        </p>
      </div>
    </aside>
  );
}

"use client";

import { ShoppingCart } from "lucide-react";

import {
  ModuleCard,
  ModuleEmpty,
} from "@/components/cins/home-adaptive/ModuleCard";
import { GIO_CHUNG_OPEN_EVENT } from "@/components/shop/ShopGioChungButton";
import {
  formatGioHangGia,
  type GioHangHomeItem,
} from "@/lib/cins/home-adaptive/gio-hang-types";

function openGioChung() {
  window.dispatchEvent(new Event(GIO_CHUNG_OPEN_EVENT));
}

export function GioHangList({ items }: { items: GioHangHomeItem[] }) {
  return (
    <div className="ha-gio-list">
      {items.map((it) => {
        const gia = formatGioHangGia(it.giaHienThi);
        return (
          <button
            key={it.idBienThe}
            type="button"
            className="ha-gio-row"
            onClick={openGioChung}
          >
            <span className="ha-gio-av" aria-hidden>
              {it.anhUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.anhUrl} alt="" loading="lazy" />
              ) : (
                <span className="ha-gio-av-fallback">
                  {it.tenSanPham.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <span className="ha-gio-body">
              <span className="ha-gio-title">{it.tenSanPham}</span>
              <span className="ha-gio-sub">
                {[it.nhanBienThe, it.tenCuaHang, `×${it.soLuong}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            {gia ? <span className="ha-gio-gia">{gia}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function GioHangPanel({
  items,
  tongSoDong,
}: {
  items: GioHangHomeItem[];
  tongSoDong: number;
}) {
  if (items.length === 0) {
    return (
      <ModuleCard
        icon={ShoppingCart}
        moduleId="gio_hang_cua_ban"
        title="Giỏ hàng của bạn"
        className="ha-card--gio"
      >
        <ModuleEmpty>Giỏ còn trống — thêm hàng từ shop bạn bè.</ModuleEmpty>
        <div className="ha-gio-foot">
          <button
            type="button"
            className="ha-gio-cta"
            onClick={openGioChung}
          >
            Mở giỏ hàng
          </button>
        </div>
      </ModuleCard>
    );
  }

  return (
    <ModuleCard
      icon={ShoppingCart}
      moduleId="gio_hang_cua_ban"
      title="Giỏ hàng của bạn"
      badge={tongSoDong > 0 ? String(tongSoDong) : undefined}
      className="ha-card--gio"
    >
      <GioHangList items={items} />
      <div className="ha-gio-foot">
        <button type="button" className="ha-gio-cta" onClick={openGioChung}>
          Xem giỏ hàng
        </button>
      </div>
    </ModuleCard>
  );
}

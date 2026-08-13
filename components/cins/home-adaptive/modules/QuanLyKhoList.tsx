import Link from "next/link";

import type { QuanLyKhoItem } from "@/lib/cins/home-adaptive/quan-ly-kho-types";

function khoTonLabel(item: QuanLyKhoItem): string {
  if (item.mucDo === "het") return "Hết hàng";
  return `Còn ${item.soLuongTon}`;
}

/** Danh sách tồn kho — dùng module thật + preview overlay. */
export function QuanLyKhoList({ items }: { items: QuanLyKhoItem[] }) {
  return (
    <div className="ha-kho-list">
      {items.map((it) => (
        <Link
          key={it.bienTheId}
          href="/seller/inventory"
          className={`ha-kho-row ha-kho-row--${it.mucDo}`}
          prefetch={false}
        >
          <span className="ha-kho-av" aria-hidden>
            {it.anhUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.anhUrl} alt="" loading="lazy" />
            ) : (
              <span className="ha-kho-av-fallback">
                {it.tenSanPham.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <span className="ha-kho-body">
            <span className="ha-kho-title">{it.tenSanPham}</span>
            <span className="ha-kho-sub">{it.nhan}</span>
          </span>
          <span className="ha-kho-ton">{khoTonLabel(it)}</span>
        </Link>
      ))}
    </div>
  );
}

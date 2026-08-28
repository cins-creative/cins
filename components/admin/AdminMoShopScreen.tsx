"use client";

import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { AdminMoShopGoDialog } from "@/components/admin/AdminMoShopGoDialog";
import { adminGoShopDangKyMo } from "@/app/admin/mo-shop/actions";
import {
  SHOP_DANG_KY_MO_KENH_LABEL,
  SHOP_DANG_KY_MO_TRANG_THAI,
  SHOP_DANG_KY_MO_TRANG_THAI_LABEL,
  type ShopDangKyMoTrangThai,
} from "@/lib/shop/dang-ky-mo-constants";
import type { ShopDangKyMoAdminItem } from "@/lib/shop/dang-ky-mo-types";
import { webHref } from "@/lib/cins/manage-site";

type Props = { items: ShopDangKyMoAdminItem[] };
type Filter = ShopDangKyMoTrangThai | "tat_ca";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function leadLabel(ten: string): string {
  const t = ten.trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

export function AdminMoShopScreen({ items }: Props) {
  const [filter, setFilter] = useState<Filter>("tat_ca");
  const [goneIds, setGoneIds] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [goTarget, setGoTarget] = useState<ShopDangKyMoAdminItem | null>(null);
  const [goError, setGoError] = useState<string | null>(null);

  const visible = useMemo(
    () => items.filter((it) => !goneIds.has(it.id)),
    [items, goneIds],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { tat_ca: visible.length };
    for (const t of SHOP_DANG_KY_MO_TRANG_THAI) map[t] = 0;
    for (const it of visible) {
      map[it.trangThai] = (map[it.trangThai] ?? 0) + 1;
    }
    return map;
  }, [visible]);

  const rows = useMemo(() => {
    if (filter === "tat_ca") return visible;
    return visible.filter((it) => it.trangThai === filter);
  }, [visible, filter]);

  function askGo(it: ShopDangKyMoAdminItem) {
    if (pending) return;
    setGoError(null);
    setGoTarget(it);
  }

  function confirmGo() {
    if (!goTarget || pending) return;
    const it = goTarget;
    setPendingId(it.id);
    startTransition(async () => {
      const res = await adminGoShopDangKyMo(it.id);
      setPendingId(null);
      if (!res.ok) {
        setGoError(res.message);
        return;
      }
      setGoTarget(null);
      setGoneIds((prev) => {
        const next = new Set(prev);
        next.add(it.id);
        return next;
      });
    });
  }

  return (
    <div className="mo-shop-admin">
      <header className="mo-shop-admin-head">
        <div>
          <h1 className="mo-shop-admin-title">Lead mở shop</h1>
          <p className="mo-shop-admin-sub">
            Đăng ký từ form CINs dựng shop hộ · bảng{" "}
            <code>shop_dang_ky_mo</code>
          </p>
        </div>
        <div className="mo-shop-admin-head-actions">
          <Link href="/admin/mo-shop/form" className="mo-shop-admin-btn">
            Form nhập
          </Link>
          <Link
            href={webHref("/open-shop")}
            target="_blank"
            rel="noopener noreferrer"
            className="mo-shop-admin-btn mo-shop-admin-btn--ghost"
          >
            Form public
            <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mo-shop-admin-filters" role="tablist" aria-label="Lọc trạng thái">
        <button
          type="button"
          className={`mo-shop-admin-filter${filter === "tat_ca" ? " is-active" : ""}`}
          onClick={() => setFilter("tat_ca")}
        >
          Tất cả
          <span className="mo-shop-admin-filter-count">{counts.tat_ca}</span>
        </button>
        {SHOP_DANG_KY_MO_TRANG_THAI.map((t) => (
          <button
            key={t}
            type="button"
            className={`mo-shop-admin-filter${filter === t ? " is-active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {SHOP_DANG_KY_MO_TRANG_THAI_LABEL[t]}
            <span className="mo-shop-admin-filter-count">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mo-shop-admin-empty">
          <Store size={28} aria-hidden />
          <p>Chưa có lead nào{filter !== "tat_ca" ? " ở trạng thái này" : ""}.</p>
          <Link href="/admin/mo-shop/form" className="mo-shop-admin-btn">
            Điền form nhập
          </Link>
        </div>
      ) : (
        <ul className="mo-shop-admin-list">
          {rows.map((it) => (
            <li key={it.id} className="mo-shop-admin-item">
              <article className={`mo-shop-admin-card status-${it.trangThai}`}>
                <Link
                  href={`/admin/mo-shop/${it.id}`}
                  className="mo-shop-admin-card-main"
                >
                  <div className="mo-shop-admin-card-top">
                    <strong className="mo-shop-admin-card-title">{it.tenShop}</strong>
                    <span className={`mo-shop-admin-badge status-${it.trangThai}`}>
                      {SHOP_DANG_KY_MO_TRANG_THAI_LABEL[it.trangThai]}
                    </span>
                  </div>
                  <div className="mo-shop-admin-card-meta">
                    <span>
                      {SHOP_DANG_KY_MO_KENH_LABEL[it.kenhLienHe]} ·{" "}
                      {it.lienHeGiaTri}
                    </span>
                    <span>{it.email}</span>
                    <span>{fmtDate(it.taoLuc)}</span>
                  </div>
                  {it.tenLienHe ? (
                    <p className="mo-shop-admin-card-note">Gọi: {it.tenLienHe}</p>
                  ) : null}
                </Link>
                <div className="mo-shop-admin-card-actions">
                  <button
                    type="button"
                    className="mo-shop-admin-btn mo-shop-admin-btn--ghost mo-shop-admin-btn--danger"
                    disabled={pending && pendingId === it.id}
                    onClick={() => askGo(it)}
                  >
                    {pending && pendingId === it.id ? "Đang gỡ…" : "Gỡ"}
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <AdminMoShopGoDialog
        open={goTarget != null}
        tenShop={goTarget ? leadLabel(goTarget.tenShop) : ""}
        confirming={pending && pendingId === goTarget?.id}
        error={goError}
        onClose={() => {
          if (pending) return;
          setGoTarget(null);
          setGoError(null);
        }}
        onConfirm={confirmGo}
      />
    </div>
  );
}

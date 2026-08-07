"use client";

import Link from "next/link";
import { TicketPercent } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ShopVoucherCard } from "@/components/shop/ShopVoucherCard";
import { shopPublicHref, shopSlugFromTen } from "@/lib/shop/cua-hang-href";
import type {
  ShopVoucher,
  ShopVoucherLyDoHet,
} from "@/lib/shop/types";

type CongKhaiItem = ShopVoucher & {
  daLuu: boolean;
  tenCuaHang: string | null;
  sellerSlug: string | null;
};

type ViItem = ShopVoucher & {
  conHieuLuc: boolean;
  lyDoHetHieuLuc: ShopVoucherLyDoHet | null;
  tenCuaHang: string | null;
  sellerSlug: string | null;
};

type Tab = "san" | "vi";

/**
 * Khu «Săn voucher» + ví trên /cua-hang.
 */
export function CuaHangSanVoucher() {
  const [tab, setTab] = useState<Tab>("san");
  const [san, setSan] = useState<CongKhaiItem[]>([]);
  const [vi, setVi] = useState<ViItem[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSan = useCallback(async () => {
    const res = await fetch("/api/shop/voucher/cong-khai", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { items?: CongKhaiItem[] };
    setSan(json.items ?? []);
  }, []);

  const loadVi = useCallback(async () => {
    const res = await fetch("/api/shop/voucher/vi", { cache: "no-store" });
    if (res.status === 401) {
      setLoggedIn(false);
      setVi([]);
      return;
    }
    setLoggedIn(true);
    if (!res.ok) return;
    const json = (await res.json()) as { items?: ViItem[] };
    setVi(json.items ?? []);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([loadSan(), loadVi()]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadSan, loadVi]);

  async function luu(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/shop/voucher/vi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idVoucher: id }),
      });
      if (res.status === 401) {
        window.location.href = "/login?next=/cua-hang";
        return;
      }
      if (!res.ok) return;
      setSan((prev) =>
        prev.map((v) => (v.id === id ? { ...v, daLuu: true } : v)),
      );
      await loadVi();
    } finally {
      setBusyId(null);
    }
  }

  function shopHref(v: { sellerSlug: string | null; tenCuaHang: string | null }) {
    if (!v.sellerSlug) return "/cua-hang";
    return shopPublicHref(
      v.sellerSlug,
      shopSlugFromTen(v.tenCuaHang, v.sellerSlug),
    );
  }

  const list = tab === "san" ? san : vi;
  const empty =
    !loading &&
    list.length === 0 &&
    (tab === "san" || loggedIn);

  return (
    <section className="ch-san-voucher" aria-label="Săn voucher">
      <div className="ch-san-voucher-head">
        <h2 className="ch-san-voucher-title">
          <TicketPercent size={20} strokeWidth={2.2} aria-hidden />
          Săn voucher
        </h2>
        <div className="ch-san-voucher-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "san"}
            className={`ch-san-voucher-tab${tab === "san" ? " is-active" : ""}`}
            onClick={() => setTab("san")}
          >
            Đang chạy
          </button>
          {loggedIn ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "vi"}
              className={`ch-san-voucher-tab${tab === "vi" ? " is-active" : ""}`}
              onClick={() => setTab("vi")}
            >
              Voucher của tôi
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="ch-san-voucher-muted">Đang tải…</p>
      ) : empty ? (
        <p className="ch-san-voucher-muted">
          {tab === "vi"
            ? "Chưa lưu voucher nào. Nhặt mã ở mục Đang chạy."
            : "Chưa có voucher công khai."}
        </p>
      ) : (
        <div className="ch-san-voucher-rail">
          {(tab === "san" ? san : vi).map((v) => {
            const conHieuLuc =
              tab === "vi" ? (v as ViItem).conHieuLuc !== false : true;
            const lyDo =
              tab === "vi"
                ? ((v as ViItem).lyDoHetHieuLuc as ViItem["lyDoHetHieuLuc"])
                : null;
            return (
              <div key={v.id} className="ch-san-voucher-item">
                <ShopVoucherCard
                  ma={v.ma}
                  ten={v.ten}
                  loaiGiam={v.loaiGiam}
                  giaTri={v.giaTri}
                  designKieu={v.designKieu}
                  designMauNen={v.designMauNen}
                  designMauChu={v.designMauChu}
                  designNhan={v.designNhan}
                  designAnhUrl={v.designAnhUrl}
                  donToiThieu={v.donToiThieu}
                  soLuongTong={v.soLuongTong}
                  soLuongDaDung={v.soLuongDaDung}
                  ketThuc={v.ketThuc}
                  tenCuaHang={v.tenCuaHang}
                  conHieuLuc={conHieuLuc}
                  lyDoHetHieuLuc={lyDo}
                  daLuu={"daLuu" in v ? v.daLuu : true}
                  onCopy={() => {
                    void navigator.clipboard?.writeText(v.ma);
                  }}
                  actions={
                    <>
                      {tab === "san" && !v.daLuu ? (
                        <button
                          type="button"
                          className="ch-san-voucher-btn"
                          disabled={busyId === v.id}
                          onClick={() => void luu(v.id)}
                        >
                          {busyId === v.id ? "…" : "Lưu"}
                        </button>
                      ) : null}
                      {conHieuLuc && v.sellerSlug ? (
                        <Link
                          href={shopHref(v)}
                          className="ch-san-voucher-btn is-primary"
                        >
                          Dùng ngay
                        </Link>
                      ) : null}
                    </>
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { TicketPercent, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { ShopVoucherCard } from "@/components/shop/ShopVoucherCard";
import { shopPublicHref, shopSlugFromTen } from "@/lib/shop/cua-hang-href";
import type {
  ShopVoucherCongKhaiItem,
  ShopVoucherViItem,
} from "@/lib/shop/types";

import "@/components/shop/shop-dashboard.css";

type CongKhaiItem = ShopVoucherCongKhaiItem;

type ViItem = ShopVoucherViItem;

type Tab = "san" | "vi";

/**
 * Khu «Săn voucher» + ví trên /cua-hang — nút CTA mở modal listing.
 */
export function CuaHangSanVoucher() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
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

  /** Mở modal / quay lại tab → refetch để «Còn lại» sát DB (lưu ≠ giữ chỗ). */
  useEffect(() => {
    if (!open) return;
    void loadSan();
    if (loggedIn) void loadVi();
  }, [open, loadSan, loadVi, loggedIn]);

  useEffect(() => {
    if (!open || tab !== "san") return;
    const id = window.setInterval(() => {
      void loadSan();
    }, 30_000);
    return () => clearInterval(id);
  }, [open, tab, loadSan]);

  useEffect(() => {
    if (!open) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      void loadSan();
      if (loggedIn) void loadVi();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [open, loadSan, loadVi, loggedIn]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
      await Promise.all([loadSan(), loadVi()]);
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

  const triggerLabel = loading
    ? "Đang tải voucher"
    : san.length > 0
      ? `Shop Voucher, ${san.length} mã đang chạy`
      : "Shop Voucher";

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="shop-kho-nhom-backdrop ch-san-voucher-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="shop-kho-nhom-dialog ch-san-voucher-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(ev) => ev.stopPropagation()}
            >
              <header className="shop-kho-nhom-dialog-head ch-san-voucher-modal-head">
                <h3 id={titleId} className="ch-san-voucher-modal-title">
                  <TicketPercent size={20} strokeWidth={2.2} aria-hidden />
                  Săn voucher
                </h3>
                <div className="ch-san-voucher-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "san"}
                    className={`ch-san-voucher-tab${tab === "san" ? " is-active" : ""}`}
                    onClick={() => setTab("san")}
                  >
                    Toàn bộ voucher
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
                <button
                  type="button"
                  className="shop-kho-nhom-dialog-close"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} aria-hidden />
                </button>
              </header>

              <div className="ch-san-voucher-modal-body">
                {loading ? (
                  <p className="ch-san-voucher-muted">Đang tải…</p>
                ) : empty ? (
                  <p className="ch-san-voucher-muted">
                    {tab === "vi"
                      ? "Chưa lưu voucher nào. Nhặt mã ở mục Toàn bộ voucher."
                      : "Chưa có voucher công khai."}
                  </p>
                ) : (
                  <div className="ch-san-voucher-grid">
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
                            soLuongDaLuu={
                              "soLuongDaLuu" in v ? v.soLuongDaLuu : undefined
                            }
                            ketThuc={v.ketThuc}
                            tenCuaHang={v.tenCuaHang}
                            shopAvatarUrl={v.shopAvatarUrl}
                            shopBannerUrl={v.shopBannerUrl}
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
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const fab =
    typeof document !== "undefined"
      ? createPortal(
          <div className="ch-san-voucher-fab">
            <button
              type="button"
              className="ch-san-voucher-trigger"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={triggerLabel}
              title={
                !loading && san.length > 0
                  ? `${san.length} mã đang chạy`
                  : "Shop Voucher"
              }
              onClick={() => setOpen(true)}
            >
              <span className="ch-san-voucher-trigger-shimmer" aria-hidden />
              <span className="ch-san-voucher-trigger-ring" aria-hidden />
              <span className="ch-san-voucher-trigger-icon" aria-hidden>
                <TicketPercent size={32} strokeWidth={2.15} />
              </span>
              <span className="ch-san-voucher-trigger-label">Shop Voucher</span>
              {!loading && san.length > 0 ? (
                <span className="ch-san-voucher-trigger-count" aria-hidden>
                  {san.length}
                </span>
              ) : null}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {fab}
      {modal}
    </>
  );
}

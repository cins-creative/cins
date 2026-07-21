"use client";

import {
  ClipboardList,
  ExternalLink,
  Loader2,
  Package,
  Store,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  SHOP_LOAI_DON_LABEL,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
} from "@/lib/shop/types";
import { useShopReadyGate } from "@/lib/shop/use-shop-ready-gate";

import "./shop-topbar.css";

function formatBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function ShopTopbarButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<ShopDonHang[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    shopReady,
    shopSetupHref,
    loading: readyLoading,
  } = useShopReadyGate();

  const pending = items.filter((d) => d.trangThai === "cho_xac_nhan");
  const pendingCount = pending.length;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/don?role=seller", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopDonHang[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải đơn.");
        return;
      }
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch {
      setErr("Không tải đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPortalReady(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 10,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let removeListeners: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function isInside(target: EventTarget | null): boolean {
        if (!(target instanceof Node)) return false;
        if (triggerRef.current?.contains(target)) return true;
        if (menuRef.current?.contains(target)) return true;
        return false;
      }
      function onDocPointerDown(event: PointerEvent) {
        if (isInside(event.target)) return;
        setOpen(false);
      }
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
      }
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKey);
      removeListeners = () => {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKey);
      };
    }, 0);
    return () => {
      window.clearTimeout(timer);
      removeListeners?.();
    };
  }, [open]);

  async function patchDon(
    id: string,
    action: "da_nhan_tien" | "da_giao_tai_su_kien",
  ) {
    setBusyId(id);
    setErr(null);
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

  const ariaLabel =
    pendingCount > 0
      ? `Bán hàng, ${pendingCount} đơn chờ xác nhận`
      : "Bán hàng — kho và đơn";

  const preview = pending.slice(0, 6);

  const menuPanel =
    open && menuStyle && portalReady
      ? createPortal(
          <div
            ref={menuRef}
            className="shop-topbar-menu is-portal"
            style={{ top: menuStyle.top, right: menuStyle.right }}
            role="dialog"
            aria-label="Quản lý bán hàng"
          >
            <div className="shop-topbar-menu-head">
              <div className="shop-topbar-menu-head-text">
                <strong>Bán hàng</strong>
                <span>
                  {readyLoading || loading
                    ? "Đang cập nhật…"
                    : shopReady
                      ? "Kho hàng · đơn hàng"
                      : "Cần thiết lập Shop trước"}
                </span>
              </div>
              {shopReady ? (
                <a
                  href="/ban-hang/don"
                  target="_blank"
                  rel="noreferrer"
                  className="shop-topbar-ext"
                  aria-label="Mở quản lý đơn hàng tab mới"
                  title="Mở quản lý đơn hàng"
                  onClick={() => setOpen(false)}
                >
                  <ExternalLink size={15} strokeWidth={2} aria-hidden />
                </a>
              ) : null}
            </div>

            {!shopReady ? (
              <div className="shop-topbar-shortcuts">
                <div className="shop-topbar-shortcut">
                  <Link
                    href={shopSetupHref || "/ban-hang/cua-hang"}
                    className="shop-topbar-shortcut-main"
                    onClick={() => setOpen(false)}
                  >
                    <Store size={16} strokeWidth={2} aria-hidden />
                    Thiết lập Shop
                  </Link>
                </div>
              </div>
            ) : (
              <div className="shop-topbar-shortcuts">
                <div className="shop-topbar-shortcut">
                  <Link
                    href="/ban-hang/kho"
                    className="shop-topbar-shortcut-main"
                    onClick={() => setOpen(false)}
                  >
                    <Package size={16} strokeWidth={2} aria-hidden />
                    Kho hàng
                  </Link>
                  <a
                    href="/ban-hang/kho"
                    target="_blank"
                    rel="noreferrer"
                    className="shop-topbar-shortcut-ext"
                    aria-label="Mở kho hàng tab mới"
                    title="Mở tab mới"
                    onClick={() => setOpen(false)}
                  >
                    <ExternalLink size={14} strokeWidth={2} aria-hidden />
                  </a>
                </div>
                <div className="shop-topbar-shortcut">
                  <Link
                    href="/ban-hang/don"
                    className="shop-topbar-shortcut-main"
                    onClick={() => setOpen(false)}
                  >
                    <ClipboardList size={16} strokeWidth={2} aria-hidden />
                    Đơn hàng
                  </Link>
                  <a
                    href="/ban-hang/don"
                    target="_blank"
                    rel="noreferrer"
                    className="shop-topbar-shortcut-ext"
                    aria-label="Mở đơn hàng tab mới"
                    title="Mở tab mới"
                    onClick={() => setOpen(false)}
                  >
                    <ExternalLink size={14} strokeWidth={2} aria-hidden />
                  </a>
                </div>
              </div>
            )}

            {shopReady ? (
              <>
                <div className="shop-topbar-section-label">
                  Đơn chờ xác nhận
                  {pendingCount > 0 ? (
                    <span className="shop-topbar-section-count">
                      {pendingCount}
                    </span>
                  ) : null}
                </div>

                {err ? <p className="shop-topbar-err">{err}</p> : null}

                {loading && items.length === 0 ? (
                  <p className="shop-topbar-empty">
                    <Loader2
                      size={14}
                      className="shop-topbar-spin"
                      aria-hidden
                    />
                    Đang tải…
                  </p>
                ) : preview.length === 0 ? (
                  <p className="shop-topbar-empty">Không có đơn chờ.</p>
                ) : (
                  <ul className="shop-topbar-list">
                    {preview.map((d) => {
                      const ma = d.maDon?.trim() || d.id.slice(0, 8);
                      const first = d.dong[0];
                      const more = Math.max(0, d.dong.length - 1);
                      const summary = first
                        ? `${first.tenSnapshot}${more > 0 ? ` +${more}` : ""}`
                        : "—";
                      return (
                        <li key={d.id} className="shop-topbar-don">
                          <div className="shop-topbar-don-main">
                            <span className="shop-topbar-don-ma">{ma}</span>
                            <span className="shop-topbar-don-meta">
                              {d.muaTen ?? "Người mua"} · {summary}
                            </span>
                            <span className="shop-topbar-don-sub">
                              {SHOP_LOAI_DON_LABEL[d.loaiDon]} ·{" "}
                              {SHOP_TRANG_THAI_DON_LABEL[d.trangThai]}
                            </span>
                          </div>
                          <div className="shop-topbar-don-side">
                            <strong>
                              {d.tongTien.toLocaleString("vi-VN")} {d.tienTe}
                            </strong>
                            {d.loaiDon === "mua_ngay" ? (
                              <button
                                type="button"
                                className="shop-topbar-don-btn"
                                disabled={busyId === d.id}
                                onClick={() =>
                                  void patchDon(d.id, "da_nhan_tien")
                                }
                              >
                                Đã nhận tiền
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="shop-topbar-don-btn"
                                disabled={busyId === d.id}
                                onClick={() =>
                                  void patchDon(d.id, "da_giao_tai_su_kien")
                                }
                              >
                                Đã giao
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              <p className="shop-topbar-empty">
                Thêm tài khoản nhận tiền trong Shop rồi mới quản lý kho / đơn.
              </p>
            )}

            <Link
              href="/ban-hang/don"
              className="shop-topbar-footer"
              onClick={() => setOpen(false)}
            >
              Xem tất cả đơn
            </Link>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shop-topbar">
      <button
        ref={triggerRef}
        type="button"
        className={`shop-topbar-trigger${pendingCount > 0 ? " has-pending" : ""}${open ? " is-open" : ""}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Store size={18} strokeWidth={1.9} aria-hidden />
        {pendingCount > 0 ? (
          <span className="shop-topbar-count" aria-hidden>
            {formatBadge(pendingCount)}
          </span>
        ) : null}
      </button>
      {menuPanel}
    </div>
  );
}

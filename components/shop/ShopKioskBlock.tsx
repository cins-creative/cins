"use client";

import {
  ChevronUp,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import type { ShopGio, ShopLoaiDon, ShopPostHangItem } from "@/lib/shop/types";

import "./shop-kiosk-block.css";

type Props = {
  milestoneId: string;
  sellerUserId: string | null | undefined;
  viewerProfileId?: string | null;
};

type Tab = "hang" | "gio";

type PreviewState = {
  src: string;
  name: string;
};

export function ShopKioskBlock({
  milestoneId,
  sellerUserId,
  viewerProfileId,
}: Props) {
  const { openChat } = useCinsChat();
  const [items, setItems] = useState<ShopPostHangItem[]>([]);
  const [gio, setGio] = useState<ShopGio | null>(null);
  const [tab, setTab] = useState<Tab>("hang");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loaiDon, setLoaiDon] = useState<ShopLoaiDon>("mua_ngay");
  const [ghiChu, setGhiChu] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [filterLoai, setFilterLoai] = useState<string>("all");

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setPreview(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [preview]);

  const isOwner =
    Boolean(viewerProfileId) &&
    Boolean(sellerUserId) &&
    viewerProfileId === sellerUserId;

  const loadHang = useCallback(async () => {
    try {
      const res = await fetch(`/api/milestone/${milestoneId}/shop-hang`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopPostHangItem[];
      } | null;
      setItems(json?.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [milestoneId]);

  const loadGio = useCallback(async () => {
    if (!viewerProfileId || isOwner) return;
    try {
      const res = await fetch(
        `/api/shop/gio?cotMocId=${encodeURIComponent(milestoneId)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGio;
      } | null;
      if (json?.gio) setGio(json.gio);
    } catch {
      /* ignore */
    }
  }, [milestoneId, viewerProfileId, isOwner]);

  useEffect(() => {
    void loadHang();
  }, [loadHang]);

  useEffect(() => {
    void loadGio();
  }, [loadGio]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const t = it.phanLoai?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const hasUncategorized = useMemo(
    () => items.some((it) => !it.phanLoai?.trim()),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (filterLoai === "all") return items;
    if (filterLoai === "__none__") {
      return items.filter((it) => !it.phanLoai?.trim());
    }
    return items.filter((it) => it.phanLoai?.trim() === filterLoai);
  }, [items, filterLoai]);

  if (loading) return null;
  if (items.length === 0) return null;

  async function patchQty(idBienThe: string, soLuong: number) {
    if (!viewerProfileId) {
      setErr("Đăng nhập để thêm vào giỏ.");
      return;
    }
    if (isOwner) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/gio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotMocId: milestoneId,
          idBienThe,
          soLuong,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGio;
        error?: string;
      } | null;
      if (!res.ok || !json?.gio) {
        setErr(json?.error ?? "Không cập nhật giỏ.");
        return;
      }
      setGio(json.gio);
    } finally {
      setBusy(false);
    }
  }

  function qtyInCart(idBienThe: string): number {
    return gio?.dong.find((d) => d.idBienThe === idBienThe)?.soLuong ?? 0;
  }

  async function submitOrder() {
    if (!viewerProfileId || !sellerUserId || !gio?.dong.length) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/don", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotMocId: milestoneId,
          loaiDon,
          ghiChu: ghiChu.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: { id: string };
        chatContext?: {
          loai: string;
          id: string;
          tieuDe: string;
          moTa?: string;
          href?: string;
        };
        error?: string;
      } | null;
      if (!res.ok || !json?.don || !json.chatContext) {
        setErr(json?.error ?? "Không tạo đơn.");
        return;
      }
      setGio({
        id: null,
        idCotMoc: milestoneId,
        dong: [],
        tongTien: 0,
        tienTe: gio.tienTe,
      });
      await openChat({
        targetUserId: sellerUserId,
        nguCanh: {
          loai: json.chatContext.loai,
          id: json.chatContext.id,
          tieuDe: json.chatContext.tieuDe,
          moTa: json.chatContext.moTa ?? null,
          href: json.chatContext.href ?? null,
        },
      });
    } finally {
      setBusy(false);
    }
  }

  async function messageSeller() {
    if (!sellerUserId) return;
    await openChat({ targetUserId: sellerUserId });
  }

  const cartCount = gio?.dong.length ?? 0;
  const tickerHalf = (() => {
    if (items.length === 0) return items;
    const half: typeof items = [];
    while (half.length < Math.max(8, items.length)) {
      half.push(...items);
    }
    return half;
  })();
  const tickerItems = [...tickerHalf, ...tickerHalf];

  const previewPortal =
    portalReady && preview
      ? createPortal(
          <div
            className="shop-kiosk-preview"
            role="dialog"
            aria-modal="true"
            aria-label={preview.name || "Ảnh sản phẩm"}
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="shop-kiosk-preview-close"
              aria-label="Đóng"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
              }}
            >
              <X size={20} strokeWidth={2} aria-hidden />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt={preview.name}
              className="shop-kiosk-preview-img"
              onClick={(e) => e.stopPropagation()}
            />
            {preview.name ? (
              <p className="shop-kiosk-preview-caption">{preview.name}</p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  if (!expanded) {
    return (
      <>
        <div
          className="shop-kiosk shop-kiosk--ticker"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="shop-kiosk-ticker-hit"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-label={`Hàng bán · ${items.length} sản phẩm${cartCount ? ` · ${cartCount} trong giỏ` : ""}`}
          >
            <span className="shop-kiosk-ticker is-scroll" aria-hidden>
              <span className="shop-kiosk-ticker-track">
                {tickerItems.map((it, i) =>
                  it.anhUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${it.id}-${i}`}
                      src={it.anhUrl}
                      alt=""
                      className="shop-kiosk-ticker-thumb"
                    />
                  ) : (
                    <span
                      key={`${it.id}-${i}`}
                      className="shop-kiosk-ticker-thumb shop-kiosk-ticker-thumb--empty"
                    />
                  ),
                )}
              </span>
            </span>
            <span className="shop-kiosk-ticker-label">
              <ShoppingBag strokeWidth={1.8} aria-hidden />
              {cartCount > 0 ? (
                <span className="shop-kiosk-badge">{cartCount}</span>
              ) : null}
            </span>
          </button>
        </div>
        {previewPortal}
      </>
    );
  }

  return (
    <>
      <div
        className="shop-kiosk"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="shop-kiosk-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "hang"}
            className={`shop-kiosk-tab${tab === "hang" ? " is-active" : ""}`}
            onClick={() => setTab("hang")}
          >
            <ShoppingBag size={14} strokeWidth={1.8} aria-hidden />
            Hàng bán
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "gio"}
            className={`shop-kiosk-tab${tab === "gio" ? " is-active" : ""}`}
            onClick={() => setTab("gio")}
            disabled={isOwner}
          >
            Giỏ hàng của bạn
            {cartCount > 0 ? (
              <span className="shop-kiosk-badge">{cartCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className="shop-kiosk-tab shop-kiosk-tab--msg"
            onClick={() => void messageSeller()}
            disabled={!sellerUserId || isOwner}
          >
            <MessageCircle size={14} strokeWidth={1.8} aria-hidden />
            Nhắn người bán
          </button>
          <button
            type="button"
            className="shop-kiosk-collapse"
            onClick={() => setExpanded(false)}
            aria-label="Thu gọn hàng bán"
            title="Thu gọn"
          >
            <ChevronUp size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {err ? <p className="shop-kiosk-err">{err}</p> : null}

        {tab === "hang" ? (
          <>
            {categoryOptions.length > 0 || hasUncategorized ? (
              <div
                className="shop-kiosk-filters"
                role="tablist"
                aria-label="Lọc theo loại hàng"
              >
                <button
                  type="button"
                  className={`shop-kiosk-filter${filterLoai === "all" ? " is-active" : ""}`}
                  onClick={() => setFilterLoai("all")}
                >
                  Tất cả
                </button>
                {categoryOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`shop-kiosk-filter${filterLoai === c ? " is-active" : ""}`}
                    onClick={() => setFilterLoai(c)}
                  >
                    {c}
                  </button>
                ))}
                {hasUncategorized ? (
                  <button
                    type="button"
                    className={`shop-kiosk-filter${filterLoai === "__none__" ? " is-active" : ""}`}
                    onClick={() => setFilterLoai("__none__")}
                  >
                    Chưa phân loại
                  </button>
                ) : null}
              </div>
            ) : null}
            {filteredItems.length === 0 ? (
              <p className="shop-kiosk-empty">Không có hàng thuộc loại này.</p>
            ) : (
              <ul className="shop-kiosk-list">
                {filteredItems.map((it) => {
                  const qty = qtyInCart(it.idBienThe);
                  return (
                    <li key={it.id} className="shop-kiosk-item">
                      {it.anhUrl ? (
                        <button
                          type="button"
                          className="shop-kiosk-thumb-btn"
                          onClick={() =>
                            setPreview({
                              src: it.anhUrl!,
                              name: it.tenSanPham,
                            })
                          }
                          aria-label={`Xem ảnh ${it.tenSanPham}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.anhUrl}
                            alt=""
                            className="shop-kiosk-thumb"
                          />
                        </button>
                      ) : (
                        <div className="shop-kiosk-thumb shop-kiosk-thumb--empty" />
                      )}
                      <div className="shop-kiosk-meta">
                        <div className="shop-kiosk-name">
                          {it.tenSanPham}
                          {it.nhanBienThe !== "Mặc định" ? (
                            <span className="shop-kiosk-variant">
                              {" "}
                              · {it.nhanBienThe}
                            </span>
                          ) : null}
                        </div>
                        {it.phanLoai ? (
                          <div className="shop-kiosk-loai">{it.phanLoai}</div>
                        ) : null}
                        <div className="shop-kiosk-price">
                          {it.giaHienThi.toLocaleString("vi-VN")} {it.tienTe}
                        </div>
                        <div className="shop-kiosk-stock">
                          {it.hetHang || it.soLuongTon < 0
                            ? "Đợi restock"
                            : `Còn ${it.soLuongTon}`}
                        </div>
                      </div>
                      {!isOwner ? (
                        <div className="shop-kiosk-qty">
                          <button
                            type="button"
                            aria-label="Bớt"
                            disabled={busy || qty <= 0}
                            onClick={() => void patchQty(it.idBienThe, qty - 1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            aria-label="Thêm"
                            disabled={busy || !viewerProfileId}
                            onClick={() => void patchQty(it.idBienThe, qty + 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <div className="shop-kiosk-cart">
            {!gio?.dong.length ? (
              <p className="shop-kiosk-empty">Giỏ trống.</p>
            ) : (
              <>
                <ul className="shop-kiosk-list">
                  {gio.dong.map((d) => (
                    <li key={d.idBienThe} className="shop-kiosk-item">
                      <div className="shop-kiosk-meta">
                        <div className="shop-kiosk-name">
                          {d.tenSanPham} ×{d.soLuong}
                        </div>
                        <div className="shop-kiosk-price">
                          {(d.giaHienThi * d.soLuong).toLocaleString("vi-VN")}{" "}
                          {d.tienTe}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="shop-kiosk-total">
                  Tổng: {gio.tongTien.toLocaleString("vi-VN")} {gio.tienTe}
                </p>
                <label className="shop-kiosk-field">
                  Loại đơn
                  <select
                    value={loaiDon}
                    onChange={(e) => setLoaiDon(e.target.value as ShopLoaiDon)}
                  >
                    <option value="mua_ngay">
                      Mua ngay (thanh toán ngoài CINs)
                    </option>
                    <option value="dat_truoc_nhan_su_kien">
                      Đặt trước — nhận tại sự kiện
                    </option>
                  </select>
                </label>
                <label className="shop-kiosk-field">
                  Ghi chú
                  <textarea
                    rows={2}
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder="VD: nhận tại quầy B12 ngày 2…"
                  />
                </label>
                <p className="shop-kiosk-disclaimer">
                  CINs không trung gian tiền. Hai bên tự thỏa thuận thanh toán.
                </p>
                <button
                  type="button"
                  className="shop-kiosk-submit"
                  disabled={busy}
                  onClick={() => void submitOrder()}
                >
                  {busy ? (
                    <Loader2 size={16} className="shop-spin" />
                  ) : (
                    "Gửi đơn cho người bán"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {previewPortal}
    </>
  );
}

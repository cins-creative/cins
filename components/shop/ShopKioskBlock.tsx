"use client";

import {
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { GIO_CHUNG_CHANGED_EVENT } from "@/components/shop/ShopGioChungButton";
import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import type { ShopGioChung, ShopPostHangItem } from "@/lib/shop/types";

import "./shop-kiosk-block.css";

type Props = {
  /** Post-kiosk. */
  milestoneId?: string;
  /** Storefront shop (slug fetch qua `sellerSlug`). */
  cuaHangId?: string;
  sellerUserId: string | null | undefined;
  viewerProfileId?: string | null;
  sellerAvatarUrl?: string | null;
  sellerName?: string | null;
  sellerSlug?: string | null;
  /** Catalog sẵn — bỏ fetch post-hang / mat-hang. */
  hangItems?: ShopPostHangItem[];
};

type PreviewState = {
  src: string;
  name: string;
};

/** Debounce sync giỏ — gộp nhiều lần bấm ± thành 1 PATCH. */
const QTY_SYNC_MS = 200;

function canIncreaseLineQty(soLuongTon: number, currentQty: number): boolean {
  return currentQty < Math.max(0, soLuongTon);
}

export function ShopKioskBlock({
  milestoneId,
  cuaHangId,
  sellerUserId,
  viewerProfileId,
  sellerAvatarUrl = null,
  sellerName = null,
  sellerSlug = null,
  hangItems,
}: Props) {
  const isShopCart = Boolean(cuaHangId?.trim());
  const postId = milestoneId?.trim() || "";
  const { openChat } = useCinsChat();

  const sellerLabel =
    sellerName?.trim() ||
    (sellerSlug?.trim() ? `@${sellerSlug.trim()}` : null) ||
    "CINs Shop";

  const [items, setItems] = useState<ShopPostHangItem[]>(hangItems ?? []);
  const [loading, setLoading] = useState(!hangItems);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** idBienThe → số lượng trong giỏ chung (chỉ hàng của seller này). */
  const [qtyByBt, setQtyByBt] = useState<Map<string, number>>(new Map());

  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** idBienThe → số lượng chờ sync (sau debounce). */
  const pendingQtyRef = useRef(new Map<string, number>());
  const syncTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  /** Tăng mỗi lần đổi qty — bỏ qua PATCH response cũ. */
  const qtyEpochRef = useRef(new Map<string, number>());

  const tickerScrollRef = useRef<HTMLDivElement>(null);
  const tickerTrackRef = useRef<HTMLDivElement>(null);
  const tickerDragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    active: boolean;
  } | null>(null);
  const tickerSuppressClickRef = useRef(false);
  const [tickerDragging, setTickerDragging] = useState(false);

  /** Bật vòng lặp vô tận khi dải hàng tràn khung → nhân 3 bản để cuộn liền mạch. */
  const [tickerLoop, setTickerLoop] = useState(false);
  const tickerLoopRef = useRef(false);
  tickerLoopRef.current = tickerLoop;
  /** Bề rộng 1 bản danh sách (track = 3 bản khi loop). */
  const tickerSetWidthRef = useRef(0);
  const TICKER_COPIES = 3;

  /**
   * Đo dải hàng: nếu 1 bản tràn khung → bật loop (nhân 3 bản, neo bản giữa);
   * nếu vừa khung → canh giữa, tắt loop. Đủ nội dung mới cho cuộn vô tận.
   */
  const measureTicker = useCallback(() => {
    const el = tickerScrollRef.current;
    const track = tickerTrackRef.current;
    if (!el || !track) return;

    if (tickerLoopRef.current) {
      const oneSet = track.scrollWidth / TICKER_COPIES;
      tickerSetWidthRef.current = oneSet;
      /* Hàng bị gỡ bớt → không còn tràn → về chế độ canh giữa. */
      if (oneSet <= el.clientWidth + 4) {
        setTickerLoop(false);
        return;
      }
      if (el.scrollLeft < oneSet || el.scrollLeft >= oneSet * 2) {
        el.scrollLeft = oneSet;
      }
      return;
    }

    const setWidth = track.scrollWidth;
    if (setWidth > el.clientWidth + 4) {
      setTickerLoop(true);
      return;
    }
    /* Ít hàng → canh giữa để 2 mép crop, gợi ý kéo được. */
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, []);

  /** Cuộn qua mép bản giữa → dời scrollLeft đúng 1 bản (liền mạch vì trùng nội dung). */
  const normalizeTickerLoop = useCallback(() => {
    const el = tickerScrollRef.current;
    const oneSet = tickerSetWidthRef.current;
    if (!el || !tickerLoopRef.current || oneSet <= 0) return;
    if (el.scrollLeft >= oneSet * 2) {
      el.scrollLeft -= oneSet;
      const drag = tickerDragRef.current;
      if (drag) drag.startScroll -= oneSet;
    } else if (el.scrollLeft < oneSet) {
      el.scrollLeft += oneSet;
      const drag = tickerDragRef.current;
      if (drag) drag.startScroll += oneSet;
    }
  }, []);

  const onTickerPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      /* Touch: cuộn ngang tự nhiên của trình duyệt. Chuột: kéo bằng JS. */
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return;
      const el = tickerScrollRef.current;
      if (!el) return;
      tickerDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startScroll: el.scrollLeft,
        active: false,
      };
    },
    [],
  );

  const onTickerPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = tickerDragRef.current;
      const el = tickerScrollRef.current;
      if (!drag || drag.pointerId !== e.pointerId || !el) return;
      const dx = e.clientX - drag.startX;

      if (!drag.active) {
        if (Math.abs(dx) < 3) return;
        drag.active = true;
        setTickerDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      el.scrollLeft = drag.startScroll - dx;
      normalizeTickerLoop();
      e.preventDefault();
    },
    [normalizeTickerLoop],
  );

  const finishTickerDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = tickerDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      tickerDragRef.current = null;
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (drag.active) tickerSuppressClickRef.current = true;
      setTickerDragging(false);
    },
    [],
  );

  const onTickerLostPointerCapture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = tickerDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      finishTickerDrag(e);
    },
    [finishTickerDrag],
  );

  const onTickerClickCapture = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!tickerSuppressClickRef.current) return;
      tickerSuppressClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const isOwner =
    Boolean(viewerProfileId) &&
    Boolean(sellerUserId) &&
    viewerProfileId === sellerUserId;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!preview && !catalogOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (preview) {
        setPreview(null);
        return;
      }
      setCatalogOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [preview, catalogOpen]);

  const loadHang = useCallback(async () => {
    if (hangItems) {
      setItems(hangItems);
      setLoading(false);
      return;
    }
    if (isShopCart) {
      if (!sellerSlug?.trim()) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/shop/cua-hang/mat-hang?slug=${encodeURIComponent(sellerSlug.trim())}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          items?: Array<{
            sanPhamId: string;
            idBienThe: string | null;
            hangId: string | null;
            tenSanPham: string;
            nhanBienThe: string | null;
            phanLoai: string | null;
            phanLoai2: string | null;
            anhUrl: string | null;
            soLuongTon: number;
            soLuongBan: number;
            giaHienThi: number | null;
            tienTe: string;
            hetHang: boolean;
          }>;
        } | null;
        const mapped: ShopPostHangItem[] = [];
        for (const [idx, it] of (json?.items ?? []).entries()) {
          if (!it.idBienThe || it.giaHienThi == null) continue;
          mapped.push({
            id: it.hangId ?? it.idBienThe,
            idBienThe: it.idBienThe,
            idSanPham: it.sanPhamId,
            tenSanPham: it.tenSanPham,
            nhanBienThe: it.nhanBienThe ?? "Mặc định",
            phanLoai: it.phanLoai,
            phanLoai2: it.phanLoai2,
            anhUrl: it.anhUrl,
            soLuongTon: it.soLuongTon,
            soLuongBan: it.soLuongBan,
            giaHienThi: it.giaHienThi,
            tienTe: it.tienTe,
            idBangGia: null,
            thuTu: idx,
            hetHang: it.hetHang,
          });
        }
        setItems(mapped);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const res = await fetch(`/api/milestone/${postId}/shop-hang`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopPostHangItem[];
        banHangEnabled?: boolean;
      } | null;
      setItems(json?.banHangEnabled === false ? [] : (json?.items ?? []));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hangItems, isShopCart, sellerSlug, postId]);

  /** Đọc giỏ chung, lọc số lượng theo seller này. */
  const loadGio = useCallback(async () => {
    if (!viewerProfileId || isOwner || !sellerUserId) return;
    try {
      const res = await fetch("/api/shop/gio-chung", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
      } | null;
      if (!res.ok || !json?.gio) return;
      const map = new Map<string, number>();
      const nhom = json.gio.nhom.find((n) => n.idNguoiBan === sellerUserId);
      for (const d of nhom?.dong ?? []) map.set(d.idBienThe, d.soLuong);
      setQtyByBt(map);
    } catch {
      /* ignore */
    }
  }, [viewerProfileId, isOwner, sellerUserId]);

  useEffect(() => {
    void loadHang();
  }, [loadHang]);

  useEffect(() => {
    void loadGio();
  }, [loadGio]);

  /* Đồng bộ khi giỏ chung đổi từ nơi khác (panel topbar, storefront…). */
  useEffect(() => {
    const onChanged = () => void loadGio();
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
  }, [loadGio]);

  /* Cài đặt tắt/bật bán hàng → refetch (API ẩn hàng khi seller tắt). */
  useEffect(() => {
    const onBanHangChanged = () => void loadHang();
    window.addEventListener("cins:ban-hang-changed", onBanHangChanged);
    return () =>
      window.removeEventListener("cins:ban-hang-changed", onBanHangChanged);
  }, [loadHang]);

  /* Gắn / gỡ sản phẩm trên bài → refetch card bán hàng. */
  useEffect(() => {
    if (isShopCart) return;
    const onShopHangChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ milestoneId?: string }>).detail;
      if (detail?.milestoneId && detail.milestoneId !== postId) return;
      setLoading(true);
      void loadHang();
    };
    window.addEventListener("cins:shop-hang-changed", onShopHangChanged);
    return () =>
      window.removeEventListener("cins:shop-hang-changed", onShopHangChanged);
  }, [loadHang, isShopCart, postId]);

  useEffect(() => {
    if (hangItems) {
      setItems(hangItems);
      setLoading(false);
    }
  }, [hangItems]);

  /* Đo lại dải hàng mỗi khi danh sách đổi hoặc bật/tắt loop. */
  useLayoutEffect(() => {
    measureTicker();
  }, [items, tickerLoop, measureTicker]);

  /* Khung đổi kích thước (resize / layout) → đo lại để bật/tắt loop cho đúng. */
  useEffect(() => {
    const el = tickerScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureTicker());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureTicker]);

  /* Dọn timer debounce khi unmount. */
  useEffect(() => {
    const timers = syncTimersRef.current;
    const pending = pendingQtyRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      pending.clear();
    };
  }, []);

  /** Gửi PATCH số lượng cuối cùng cho biến thể (đã debounce). */
  const flushQtySync = useCallback(
    async (idBienThe: string) => {
      const soLuong = pendingQtyRef.current.get(idBienThe);
      if (soLuong === undefined) return;
      pendingQtyRef.current.delete(idBienThe);
      const epoch = qtyEpochRef.current.get(idBienThe) ?? 0;
      try {
        const res = await fetch("/api/shop/gio-chung", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idBienThe, soLuong }),
        });
        const json = (await res.json().catch(() => null)) as {
          gio?: ShopGioChung;
          error?: string;
        } | null;
        /* Có lần bấm mới hơn — bỏ response cũ. */
        if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
        if (!res.ok || !json?.gio) {
          setErr(json?.error ?? "Không cập nhật giỏ.");
          await loadGio();
          return;
        }
        const map = new Map<string, number>();
        const nhom = json.gio.nhom.find((n) => n.idNguoiBan === sellerUserId);
        for (const d of nhom?.dong ?? []) map.set(d.idBienThe, d.soLuong);
        /* Giữ giá trị đang chờ sync (buyer bấm tiếp trong lúc chờ). */
        for (const [bt, q] of pendingQtyRef.current) {
          if (q <= 0) map.delete(bt);
          else map.set(bt, q);
        }
        setQtyByBt(map);
        window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
      } catch {
        if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
        setErr("Không cập nhật giỏ.");
        await loadGio();
      }
    },
    [sellerUserId, loadGio],
  );

  const patchQty = useCallback(
    (idBienThe: string, soLuong: number) => {
      if (!viewerProfileId) {
        setErr("Đăng nhập để thêm vào giỏ.");
        return;
      }
      if (isOwner) return;
      const item = itemsRef.current.find((it) => it.idBienThe === idBienThe);
      const cap = item ? Math.max(0, item.soLuongTon) : Math.max(0, soLuong);
      const qty = Math.min(Math.max(0, Math.trunc(soLuong)), cap);
      if (item && soLuong > qty && item.soLuongTon > 0) {
        setErr(`Chỉ còn ${item.soLuongTon} trong kho.`);
      } else if (item && item.soLuongTon <= 0 && soLuong > 0) {
        setErr("Hết hàng — không thêm vào giỏ được.");
      } else {
        setErr(null);
      }
      qtyEpochRef.current.set(
        idBienThe,
        (qtyEpochRef.current.get(idBienThe) ?? 0) + 1,
      );
      /* Phản hồi tức thì — không chờ mạng. */
      setQtyByBt((prev) => {
        const next = new Map(prev);
        if (qty <= 0) next.delete(idBienThe);
        else next.set(idBienThe, qty);
        return next;
      });
      pendingQtyRef.current.set(idBienThe, qty);
      const prevTimer = syncTimersRef.current.get(idBienThe);
      if (prevTimer) clearTimeout(prevTimer);
      syncTimersRef.current.set(
        idBienThe,
        setTimeout(() => {
          syncTimersRef.current.delete(idBienThe);
          void flushQtySync(idBienThe);
        }, QTY_SYNC_MS),
      );
    },
    [viewerProfileId, isOwner, flushQtySync],
  );

  const messageSeller = useCallback(async () => {
    if (!sellerUserId) return;
    await openChat({ targetUserId: sellerUserId });
  }, [sellerUserId, openChat]);

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

  const itemsByGroup = useMemo(() => {
    const map = new Map<string, ShopPostHangItem[]>();
    for (const it of items) {
      const key = it.phanLoai?.trim() || "Chưa phân loại";
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    const keys: string[] = [...categoryOptions];
    if (hasUncategorized && !keys.includes("Chưa phân loại")) {
      keys.push("Chưa phân loại");
    }
    for (const k of map.keys()) {
      if (!keys.includes(k)) keys.push(k);
    }
    return keys
      .map((loai) => ({ loai, items: map.get(loai) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [items, categoryOptions, hasUncategorized]);

  const cartCount = useMemo(() => {
    let n = 0;
    for (const it of items) {
      if (qtyByBt.get(it.idBienThe)) n += 1;
    }
    return n;
  }, [items, qtyByBt]);

  if (loading) return null;
  if (items.length === 0) return null;

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

  const catalogPortal =
    portalReady && catalogOpen
      ? createPortal(
          <div
            className="shop-kiosk-catalog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-kiosk-catalog-title"
            onClick={(e) => {
              e.stopPropagation();
              setCatalogOpen(false);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              className="shop-kiosk-catalog-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="shop-kiosk-catalog-hdr">
                <div>
                  {sellerSlug?.trim() ? (
                    <Link
                      href={shopPublicHref(
                        sellerSlug.trim(),
                        shopSlugFromTen(sellerLabel, sellerSlug.trim()),
                      )}
                      className="shop-kiosk-catalog-kicker shop-kiosk-catalog-kicker-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Store size={13} strokeWidth={2} aria-hidden />
                      Shop {sellerLabel}
                    </Link>
                  ) : (
                    <p className="shop-kiosk-catalog-kicker">
                      <Store size={13} strokeWidth={2} aria-hidden />
                      Shop {sellerLabel}
                    </p>
                  )}
                  <h3 id="shop-kiosk-catalog-title">Hàng bán</h3>
                </div>
                <div className="shop-kiosk-catalog-hdr-actions">
                  <button
                    type="button"
                    className="shop-kiosk-catalog-msg-btn"
                    onClick={() => void messageSeller()}
                    disabled={!sellerUserId || isOwner}
                    aria-label="Nhắn người bán"
                  >
                    <MessageCircle size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="shop-kiosk-catalog-close"
                    aria-label="Đóng"
                    onClick={() => setCatalogOpen(false)}
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </header>

              {err ? <p className="shop-kiosk-catalog-err">{err}</p> : null}

              <div className="shop-kiosk-catalog-body">
                {itemsByGroup.length === 0 ? (
                  <p className="shop-kiosk-empty">Chưa có hàng bán.</p>
                ) : (
                  itemsByGroup.map((group) => (
                    <section
                      key={group.loai}
                      className="shop-kiosk-catalog-group"
                    >
                      <h4 className="shop-kiosk-catalog-group-title">
                        {group.loai}
                        <span>{group.items.length}</span>
                      </h4>
                      <ul className="shop-kiosk-catalog-grid">
                        {group.items.map((it) => {
                          const qty = qtyByBt.get(it.idBienThe) ?? 0;
                          const outOfStock =
                            it.hetHang || it.soLuongTon <= 0;
                          const showLowStock =
                            !outOfStock &&
                            Number.isFinite(it.soLuongTon) &&
                            it.soLuongTon > 0 &&
                            it.soLuongTon < 5;
                          const canIncrease =
                            Boolean(viewerProfileId) &&
                            !outOfStock &&
                            canIncreaseLineQty(it.soLuongTon, qty);
                          const canAddFirst =
                            Boolean(viewerProfileId) &&
                            !outOfStock &&
                            canIncreaseLineQty(it.soLuongTon, 0);
                          const lowStockBadge = showLowStock ? (
                            <span className="shop-kiosk-catalog-low-stock">
                              SL:{it.soLuongTon}
                            </span>
                          ) : null;
                          return (
                            <li
                              key={it.id}
                              className="shop-kiosk-catalog-card"
                            >
                              {it.anhUrl ? (
                                <button
                                  type="button"
                                  className="shop-kiosk-catalog-thumb-btn"
                                  onClick={() =>
                                    setPreview({
                                      src: it.anhUrl!,
                                      name: it.tenSanPham,
                                    })
                                  }
                                  aria-label={`Xem ảnh ${it.tenSanPham}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={it.anhUrl} alt="" loading="lazy" />
                                  {lowStockBadge}
                                </button>
                              ) : (
                                <div className="shop-kiosk-catalog-thumb is-empty">
                                  {lowStockBadge}
                                </div>
                              )}
                              <div className="shop-kiosk-catalog-card-body">
                                <div className="shop-kiosk-catalog-card-name">
                                  {it.tenSanPham}
                                  {it.nhanBienThe !== "Mặc định" ? (
                                    <span> · {it.nhanBienThe}</span>
                                  ) : null}
                                </div>
                                <div className="shop-kiosk-catalog-card-foot">
                                  <strong>
                                    {it.giaHienThi.toLocaleString("vi-VN")}{" "}
                                    {it.tienTe}
                                  </strong>
                                </div>
                                {!isOwner ? (
                                  <div className="shop-kiosk-catalog-action">
                                    <span className="shop-kiosk-catalog-stock">
                                      Bán: {it.soLuongBan}
                                    </span>
                                    {qty > 0 ? (
                                      <div className="shop-kiosk-qty shop-kiosk-catalog-qty">
                                        <button
                                          type="button"
                                          aria-label="Bớt"
                                          onClick={() =>
                                            void patchQty(it.idBienThe, qty - 1)
                                          }
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <span>{qty}</span>
                                        <button
                                          type="button"
                                          aria-label="Thêm"
                                          disabled={!canIncrease}
                                          title={
                                            !canIncrease && !outOfStock
                                              ? `Tối đa ${it.soLuongTon} (tồn kho)`
                                              : outOfStock
                                                ? "Hết hàng"
                                                : undefined
                                          }
                                          onClick={() =>
                                            void patchQty(it.idBienThe, qty + 1)
                                          }
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="shop-kiosk-catalog-add"
                                        disabled={!canAddFirst}
                                        aria-label="Thêm vào giỏ chờ mua"
                                        title={
                                          !viewerProfileId
                                            ? "Đăng nhập để thêm vào giỏ"
                                            : outOfStock
                                              ? "Hết hàng"
                                              : "Thêm vào giỏ"
                                        }
                                        onClick={() => {
                                          if (!viewerProfileId) {
                                            setErr(
                                              "Đăng nhập để thêm vào giỏ.",
                                            );
                                            return;
                                          }
                                          void patchQty(it.idBienThe, 1);
                                        }}
                                      >
                                        <Plus
                                          size={14}
                                          strokeWidth={2.4}
                                          aria-hidden
                                        />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="shop-kiosk-catalog-action">
                                    <span className="shop-kiosk-catalog-stock">
                                      Bán: {it.soLuongBan}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className="shop-kiosk shop-kiosk--ticker"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          className="shop-kiosk-ticker-hit"
          role="group"
          aria-label={`Hàng bán · ${items.length} sản phẩm`}
        >
          <div
            ref={tickerScrollRef}
            className={`shop-kiosk-ticker${tickerDragging ? " is-dragging" : ""}`}
            onPointerDown={onTickerPointerDown}
            onPointerMove={onTickerPointerMove}
            onPointerUp={finishTickerDrag}
            onPointerCancel={finishTickerDrag}
            onLostPointerCapture={onTickerLostPointerCapture}
            onClickCapture={onTickerClickCapture}
            onScroll={normalizeTickerLoop}
          >
            <div ref={tickerTrackRef} className="shop-kiosk-ticker-track">
              {Array.from({ length: tickerLoop ? TICKER_COPIES : 1 }).flatMap(
                (_, copy) =>
                  items.map((it, i) => {
                    /* Bản nhân đôi (copy > 0) ẩn với trợ năng, khỏi lặp tab/đọc. */
                    const dup = copy > 0;
                    const key = `${it.id}-${copy}-${i}`;
                    return it.anhUrl ? (
                      <button
                        key={key}
                        type="button"
                        className="shop-kiosk-ticker-thumb-btn"
                        tabIndex={dup ? -1 : undefined}
                        aria-hidden={dup || undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreview({ src: it.anhUrl!, name: it.tenSanPham });
                        }}
                        aria-label={`Xem ảnh ${it.tenSanPham}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.anhUrl}
                          alt=""
                          className="shop-kiosk-ticker-thumb"
                          draggable={false}
                        />
                      </button>
                    ) : (
                      <span
                        key={key}
                        className="shop-kiosk-ticker-thumb shop-kiosk-ticker-thumb--empty"
                        aria-hidden
                      />
                    );
                  }),
              )}
            </div>
          </div>
          <button
            type="button"
            className="shop-kiosk-ticker-label"
            onClick={(e) => {
              e.stopPropagation();
              setCatalogOpen(true);
            }}
            aria-expanded={catalogOpen}
            aria-label={`Mở hàng bán · ${items.length} sản phẩm${cartCount ? ` · ${cartCount} trong giỏ` : ""}`}
          >
            <ShoppingBag strokeWidth={1.8} aria-hidden />
            {cartCount > 0 ? (
              <span className="shop-kiosk-badge">{cartCount}</span>
            ) : null}
          </button>
        </div>
      </div>
      {previewPortal}
      {catalogPortal}
    </>
  );
}

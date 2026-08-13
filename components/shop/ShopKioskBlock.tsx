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
import { ShopCatalogThumbPlaceholder } from "@/components/shop/ShopCatalogThumbPlaceholder";
import {
  GIO_CHUNG_CHANGED_EVENT,
  notifyGioChungAdded,
} from "@/components/shop/ShopGioChungButton";
import { parseShopThumbFit } from "@/lib/shop/anh-thumb-fit";
import {
  resolveLiveThumbFit,
  useShopThumbFitLive,
} from "@/lib/shop/use-shop-thumb-fit-live";
import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import type { ShopGioChung, ShopPostHangItem } from "@/lib/shop/types";
import {
  trackLotManHinh,
  trackShopThemGio,
  trackTuongTac,
} from "@/lib/social/track-su-kien";

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
  /** Compose preview — chỉ xem ticker, không giỏ / không gọi API. */
  previewOnly?: boolean;
};

type PreviewState = {
  src: string;
  name: string;
};

/** Debounce sync giỏ — gộp nhiều lần bấm ± thành 1 PATCH. */
const QTY_SYNC_MS = 200;
/** Tạm dừng sau cuộn user (touch/wheel) trước khi ticker chạy lại. */
const TICKER_RESUME_MS = 1200;
/** Sau thả kéo: tốc độ 0 → cruise, cubic ease-out. */
const TICKER_RESUME_EASE_MS = 1500;
/** Clamp dt rAF — tab vừa hồi tỉnh không nhảy một phát. */
const TICKER_DT_MAX_MS = 64;
const TICKER_SPEED_DEFAULT = 28;
/** Tối thiểu 3 bản để neo giữa [oneSet, 2·oneSet). */
const TICKER_COPIES_MIN = 3;
/** Trần bản nhân — 1 thumb hẹp + viewport rộng vẫn đủ cuộn. */
const TICKER_COPIES_MAX = 24;

function canIncreaseLineQty(soLuongTon: number, currentQty: number): boolean {
  return currentQty < Math.max(0, soLuongTon);
}

/** Cubic ease-out — rời 0 nhanh (chạy ngay) rồi tiệm cận cruise. */
function tickerResumeEase(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const inv = 1 - x;
  return 1 - inv * inv * inv;
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
  previewOnly = false,
}: Props) {
  const isShopCart = Boolean(cuaHangId?.trim()) && !previewOnly;
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
  const thumbFitLive = useShopThumbFitLive();

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
  const catalogBodyRef = useRef<HTMLDivElement>(null);
  const tickerDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScroll: number;
    active: boolean;
  } | null>(null);
  const tickerSuppressClickRef = useRef(false);
  const [tickerDragging, setTickerDragging] = useState(false);

  /** Vòng lặp vô tận — bật khi có ≥1 hàng, kể cả ít mẫu vừa khung. */
  const [tickerLoop, setTickerLoop] = useState(false);
  const tickerLoopRef = useRef(false);
  tickerLoopRef.current = tickerLoop;
  /**
   * Số bản nhân trên track. Cần đủ dài để maxScroll ≥ 2·oneSet
   * (cửa sổ wrap [oneSet, 2·oneSet)); 2–3 thumb hẹp hơn viewport → >3 bản.
   */
  const [tickerCopies, setTickerCopies] = useState(TICKER_COPIES_MIN);
  const tickerCopiesRef = useRef(TICKER_COPIES_MIN);
  tickerCopiesRef.current = tickerCopies;
  /** Bề rộng 1 bản danh sách (khoảng cách tới đầu bản kế). */
  const tickerSetWidthRef = useRef(0);

  /** Vị trí dải hàng (px) — transform subpixel, không dùng scrollLeft. */
  const tickerPosRef = useRef(0);
  /** Lý do tạm giữ ticker; rỗng → chạy. */
  const tickerHoldReasonsRef = useRef(new Set<string>());
  const tickerRafRef = useRef<number | null>(null);
  const tickerLastTsRef = useRef<number | null>(null);
  const tickerSpeedRef = useRef(TICKER_SPEED_DEFAULT);
  /** Timestamp rAF lúc bắt đầu ease sau thả kéo; null = cruise. */
  const tickerEaseStartRef = useRef<number | null>(null);
  const tickerReducedMotionRef = useRef(false);
  /** Hẹn giờ gỡ từng lý do drag / user-scroll. */
  const tickerResumeTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  /** Ghi vị trí lên transform (compositor) — cùng hệ với drag / rAF. */
  const writeTickerPos = useCallback((pos: number) => {
    tickerPosRef.current = pos;
    const track = tickerTrackRef.current;
    if (track) {
      track.style.transform = `translate3d(${-pos}px, 0, 0)`;
    }
  }, []);

  const scheduleTickerHoldClear = useCallback((reason: string) => {
    const timers = tickerResumeTimersRef.current;
    const prev = timers.get(reason);
    if (prev) clearTimeout(prev);
    timers.set(
      reason,
      setTimeout(() => {
        timers.delete(reason);
        tickerHoldReasonsRef.current.delete(reason);
      }, TICKER_RESUME_MS),
    );
  }, []);

  /**
   * Đo dải hàng + bật loop vô tận khi có ≥1 sản phẩm.
   * Nhân đủ bản để maxScroll ≥ 2·oneSet (2 mẫu hẹp hơn khung vẫn cuộn được).
   */
  const measureTicker = useCallback(() => {
    const el = tickerScrollRef.current;
    const track = tickerTrackRef.current;
    if (!el || !track) return;

    const n = itemsRef.current.length;
    if (n === 0) {
      if (tickerLoopRef.current) setTickerLoop(false);
      if (tickerCopiesRef.current !== TICKER_COPIES_MIN) {
        setTickerCopies(TICKER_COPIES_MIN);
      }
      tickerSetWidthRef.current = 0;
      writeTickerPos(0);
      return;
    }

    /* Chưa nhân bản → bật loop rồi đo lại ở lần render sau. */
    if (!tickerLoopRef.current) {
      setTickerLoop(true);
      return;
    }

    const copies = tickerCopiesRef.current;
    /* Chu kỳ thật = offset đầu bản 1 (gồm gap giữa các bản). */
    const nextCopyEl = track.children[n] as HTMLElement | undefined;
    const oneSet =
      nextCopyEl && copies >= 2
        ? nextCopyEl.offsetLeft
        : track.scrollWidth / Math.max(1, copies);
    if (!(oneSet > 0)) return;

    /*
     * Cần cuộn được tới gần 2·oneSet rồi wrap:
     * copies·oneSet - clientWidth ≥ 2·oneSet  →  copies ≥ 2 + clientWidth/oneSet
     */
    const needed = Math.min(
      TICKER_COPIES_MAX,
      Math.max(
        TICKER_COPIES_MIN,
        Math.ceil(2 + el.clientWidth / oneSet) + 1,
      ),
    );
    if (needed !== copies) {
      setTickerCopies(needed);
      return;
    }

    tickerSetWidthRef.current = oneSet;
    if (
      tickerPosRef.current < oneSet ||
      tickerPosRef.current >= oneSet * 2
    ) {
      writeTickerPos(oneSet);
    }
  }, [writeTickerPos]);

  /** Qua mép bản giữa → dời transform đúng 1 bản (liền mạch vì trùng nội dung). */
  const normalizeTickerLoop = useCallback(() => {
    const oneSet = tickerSetWidthRef.current;
    if (!tickerLoopRef.current || oneSet <= 0) return;
    const pos = tickerPosRef.current;
    if (pos >= oneSet * 2) {
      writeTickerPos(pos - oneSet);
      const drag = tickerDragRef.current;
      if (drag) drag.startScroll -= oneSet;
    } else if (pos < oneSet) {
      writeTickerPos(pos + oneSet);
      const drag = tickerDragRef.current;
      if (drag) drag.startScroll += oneSet;
    }
  }, [writeTickerPos]);

  const abortTickerDragHold = useCallback(() => {
    const resumeTimer = tickerResumeTimersRef.current.get("drag");
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      tickerResumeTimersRef.current.delete("drag");
    }
    tickerHoldReasonsRef.current.delete("drag");
    tickerEaseStartRef.current = 0;
  }, []);

  const onTickerPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      /* Dừng ticker ngay từ lúc nhấn — không đợi ngưỡng 3px. */
      const resumeTimer = tickerResumeTimersRef.current.get("drag");
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        tickerResumeTimersRef.current.delete("drag");
      }
      tickerEaseStartRef.current = null;
      tickerHoldReasonsRef.current.add("drag");
      tickerDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startScroll: tickerPosRef.current,
        active: false,
      };
    },
    [],
  );

  const onTickerPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = tickerDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (!drag.active) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        /* Touch/pen vuốt dọc → trả lại trang, đừng khóa ticker. */
        if (e.pointerType !== "mouse" && Math.abs(dy) >= Math.abs(dx)) {
          tickerDragRef.current = null;
          abortTickerDragHold();
          return;
        }
        if (Math.abs(dx) < 3) return;
        drag.active = true;
        setTickerDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      writeTickerPos(drag.startScroll - dx);
      normalizeTickerLoop();
      e.preventDefault();
    },
    [abortTickerDragHold, normalizeTickerLoop, writeTickerPos],
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
      /* Thả → chạy lại ngay; tốc độ ease 0 → cruise trong 1.5s. */
      const resumeTimer = tickerResumeTimersRef.current.get("drag");
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        tickerResumeTimersRef.current.delete("drag");
      }
      tickerHoldReasonsRef.current.delete("drag");
      tickerEaseStartRef.current = 0;
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
  const cartLocked = previewOnly || isOwner;

  useEffect(() => {
    if (!catalogOpen || isOwner || previewOnly) return;
    for (const it of itemsRef.current) {
      if (!it.idSanPham) continue;
      trackTuongTac({
        loaiDoiTuong: "shop_san_pham",
        idDoiTuong: it.idSanPham,
        hanhVi: "mo_catalog",
        nguon: "shop",
      });
    }
  }, [catalogOpen, isOwner, previewOnly]);

  useEffect(() => {
    if (!preview || isOwner || previewOnly) return;
    const it = itemsRef.current.find((x) => x.anhUrl === preview.src);
    if (!it?.idSanPham) return;
    trackTuongTac({
      loaiDoiTuong: "shop_san_pham",
      idDoiTuong: it.idSanPham,
      hanhVi: "phong_to_anh",
      nguon: "shop",
    });
  }, [preview, isOwner, previewOnly]);

  useEffect(() => {
    if (isOwner || previewOnly) return;
    const root = tickerTrackRef.current;
    const ioRoot = tickerScrollRef.current;
    if (!root || typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.shopTrackSp;
          if (id) trackLotManHinh(id, "shop");
        }
      },
      { root: ioRoot, threshold: 0.15 },
    );
    root.querySelectorAll("[data-shop-track-sp]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items, tickerCopies, isOwner, previewOnly]);

  useEffect(() => {
    if (!catalogOpen || isOwner || previewOnly) return;
    const root = catalogBodyRef.current;
    if (!root || typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.shopTrackSp;
          if (id) trackLotManHinh(id, "shop");
        }
      },
      { threshold: 0.2 },
    );
    root.querySelectorAll("[data-shop-track-sp]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [catalogOpen, items, isOwner, previewOnly]);

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
            anhThumbFit?: string | null;
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
            anhThumbFit: parseShopThumbFit(it.anhThumbFit),
            anhThumbFit: it.anhThumbFit,
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
    if (previewOnly || !viewerProfileId || isOwner || !sellerUserId) return;
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
  }, [previewOnly, viewerProfileId, isOwner, sellerUserId]);

  useEffect(() => {
    void loadHang();
  }, [loadHang]);

  useEffect(() => {
    if (previewOnly) return;
    void loadGio();
  }, [loadGio, previewOnly]);

  /* Đồng bộ khi giỏ chung đổi từ nơi khác (panel topbar, storefront…). */
  useEffect(() => {
    if (previewOnly) return;
    const onChanged = () => void loadGio();
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
  }, [loadGio, previewOnly]);

  /* Cài đặt tắt/bật bán hàng → refetch (API ẩn hàng khi seller tắt). */
  useEffect(() => {
    if (previewOnly) return;
    const onBanHangChanged = () => void loadHang();
    window.addEventListener("cins:ban-hang-changed", onBanHangChanged);
    return () =>
      window.removeEventListener("cins:ban-hang-changed", onBanHangChanged);
  }, [loadHang, previewOnly]);

  /* Gắn / gỡ sản phẩm trên bài → refetch card bán hàng. */
  useEffect(() => {
    if (previewOnly || isShopCart) return;
    const onShopHangChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ milestoneId?: string }>).detail;
      if (detail?.milestoneId && detail.milestoneId !== postId) return;
      setLoading(true);
      void loadHang();
    };
    window.addEventListener("cins:shop-hang-changed", onShopHangChanged);
    return () =>
      window.removeEventListener("cins:shop-hang-changed", onShopHangChanged);
  }, [loadHang, isShopCart, postId, previewOnly]);

  useEffect(() => {
    if (hangItems) {
      setItems(hangItems);
      setLoading(false);
    }
  }, [hangItems]);

  /* Đo lại dải hàng mỗi khi danh sách / số bản nhân / loop đổi. */
  useLayoutEffect(() => {
    measureTicker();
  }, [items, tickerLoop, tickerCopies, measureTicker]);

  /* Khung / dải hàng đổi size (resize, ảnh load) → đo lại số bản nhân. */
  useEffect(() => {
    const el = tickerScrollRef.current;
    const track = tickerTrackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureTicker());
    ro.observe(el);
    if (track) ro.observe(track);
    return () => ro.disconnect();
  }, [items, measureTicker, tickerCopies, tickerLoop]);

  /* Modal mở → tạm giữ ticker; đóng → gỡ. */
  useEffect(() => {
    if (preview !== null || catalogOpen) {
      tickerHoldReasonsRef.current.add("modal");
    } else {
      tickerHoldReasonsRef.current.delete("modal");
    }
  }, [preview, catalogOpen]);

  /*
   * Tự trôi bằng rAF + translate3d (cùng hệ với drag) — chỉ khi loop.
   * Không dùng scrollLeft: integer ~28px/s ≈ 24fps, và bắn scroll event tắt tooltip.
   */
  useEffect(() => {
    if (!tickerLoop) {
      if (tickerRafRef.current != null) {
        cancelAnimationFrame(tickerRafRef.current);
        tickerRafRef.current = null;
      }
      tickerLastTsRef.current = null;
      return;
    }

    const el = tickerScrollRef.current;
    const track = tickerTrackRef.current;
    if (!el) return;

    const root =
      el.closest(".shop-kiosk--ticker") ?? (el.parentElement as Element | null);
    if (root) {
      const raw = getComputedStyle(root)
        .getPropertyValue("--shop-kiosk-ticker-speed")
        .trim();
      const parsed = Number.parseFloat(raw);
      tickerSpeedRef.current =
        Number.isFinite(parsed) && parsed > 0 ? parsed : TICKER_SPEED_DEFAULT;
    }

    writeTickerPos(tickerPosRef.current);

    const resumeTimers = tickerResumeTimersRef.current;
    const holdReasons = tickerHoldReasonsRef.current;

    const stopRaf = () => {
      if (tickerRafRef.current != null) {
        cancelAnimationFrame(tickerRafRef.current);
        tickerRafRef.current = null;
      }
      tickerLastTsRef.current = null;
      if (track) track.style.willChange = "";
    };

    const tick = (ts: number) => {
      tickerRafRef.current = requestAnimationFrame(tick);
      const last = tickerLastTsRef.current;
      tickerLastTsRef.current = ts;
      if (last == null) return;
      /* Có lý do giữ → bỏ qua cộng vị trí, vẫn cập nhật timestamp. */
      if (holdReasons.size > 0) return;

      let dt = ts - last;
      if (dt > TICKER_DT_MAX_MS) dt = TICKER_DT_MAX_MS;
      if (dt <= 0) return;

      let speed = tickerSpeedRef.current;
      let easeStart = tickerEaseStartRef.current;
      if (easeStart != null) {
        if (easeStart === 0) {
          tickerEaseStartRef.current = ts;
          easeStart = ts;
        }
        const u = (ts - easeStart) / TICKER_RESUME_EASE_MS;
        if (u >= 1) {
          tickerEaseStartRef.current = null;
        } else {
          speed *= tickerResumeEase(u);
        }
      }

      let pos = tickerPosRef.current + speed * (dt / 1000);
      const oneSet = tickerSetWidthRef.current;
      if (oneSet > 0 && pos >= oneSet * 2) {
        pos -= oneSet;
      }
      writeTickerPos(pos);
    };

    const startRaf = () => {
      if (tickerReducedMotionRef.current) return;
      if (holdReasons.has("offscreen")) return;
      if (tickerRafRef.current != null) return;
      tickerLastTsRef.current = null;
      if (track) track.style.willChange = "transform";
      tickerRafRef.current = requestAnimationFrame(tick);
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      tickerReducedMotionRef.current = mq.matches;
      if (mq.matches) {
        stopRaf();
      } else {
        startRaf();
      }
    };
    syncReducedMotion();
    mq.addEventListener("change", syncReducedMotion);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        holdReasons.add("hidden");
      } else {
        holdReasons.delete("hidden");
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || e.deltaX === 0) return;
      e.preventDefault();
      holdReasons.add("user-scroll");
      scheduleTickerHoldClear("user-scroll");
      tickerEaseStartRef.current = null;
      let pos = tickerPosRef.current + e.deltaX;
      const oneSet = tickerSetWidthRef.current;
      if (oneSet > 0) {
        while (pos >= oneSet * 2) pos -= oneSet;
        while (pos < oneSet) pos += oneSet;
      }
      writeTickerPos(pos);
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          if (entry.isIntersecting) {
            holdReasons.delete("offscreen");
            startRaf();
          } else {
            /* Ra khỏi viewport → huỷ hẳn rAF (feed Journey có nhiều kiosk). */
            holdReasons.add("offscreen");
            stopRaf();
          }
        },
        { threshold: 0, rootMargin: "80px 0px" },
      );
      io.observe(el);
    } else {
      startRaf();
    }

    return () => {
      stopRaf();
      mq.removeEventListener("change", syncReducedMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("wheel", onWheel);
      io?.disconnect();
      for (const t of resumeTimers.values()) clearTimeout(t);
      resumeTimers.clear();
      /* Giữ "modal" — effect preview/catalog quản lý; gỡ các lý do của vòng rAF. */
      holdReasons.delete("offscreen");
      holdReasons.delete("hidden");
      holdReasons.delete("drag");
      holdReasons.delete("user-scroll");
    };
  }, [scheduleTickerHoldClear, tickerLoop, writeTickerPos]);

  /* Dọn timer debounce khi unmount. */
  useEffect(() => {
    const timers = syncTimersRef.current;
    const pending = pendingQtyRef.current;
    const resumeTimers = tickerResumeTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      pending.clear();
      for (const t of resumeTimers.values()) clearTimeout(t);
      resumeTimers.clear();
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
      if (previewOnly) return;
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
      let shouldNotify = false;
      setQtyByBt((prev) => {
        const prevQty = prev.get(idBienThe) ?? 0;
        shouldNotify = qty > prevQty;
        const next = new Map(prev);
        if (qty <= 0) next.delete(idBienThe);
        else next.set(idBienThe, qty);
        return next;
      });
      if (shouldNotify) {
        notifyGioChungAdded();
        if (item?.idSanPham) trackShopThemGio(item.idSanPham);
      }
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
    [previewOnly, viewerProfileId, isOwner, flushQtySync],
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

              <div ref={catalogBodyRef} className="shop-kiosk-catalog-body">
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
                          const fit = resolveLiveThumbFit(
                            thumbFitLive,
                            it.idSanPham,
                            it.anhThumbFit,
                          );
                          return (
                            <li
                              key={it.id}
                              className="shop-kiosk-catalog-card"
                              data-shop-track-sp={it.idSanPham}
                            >
                              {it.anhUrl ? (
                                <button
                                  type="button"
                                  className="shop-kiosk-catalog-thumb-btn"
                                  data-shop-thumb-fit={fit}
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
                                  <ShopCatalogThumbPlaceholder
                                    seed={it.tenSanPham}
                                  />
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
                                {!cartLocked ? (
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
                                      {previewOnly
                                        ? `Tồn: ${it.soLuongTon}`
                                        : `Bán: ${it.soLuongBan}`}
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
            data-cins-auto-scroll=""
            onPointerDown={onTickerPointerDown}
            onPointerMove={onTickerPointerMove}
            onPointerUp={finishTickerDrag}
            onPointerCancel={finishTickerDrag}
            onLostPointerCapture={onTickerLostPointerCapture}
            onClickCapture={onTickerClickCapture}
          >
            <div ref={tickerTrackRef} className="shop-kiosk-ticker-track">
              {Array.from({
                length: tickerLoop ? tickerCopies : 1,
              }).flatMap((_, copy) =>
                items.map((it, i) => {
                  /* Bản nhân đôi (copy > 0) ẩn với trợ năng, khỏi lặp tab/đọc. */
                  const dup = copy > 0;
                  const key = `${it.id}-${copy}-${i}`;
                  const fit = resolveLiveThumbFit(
                    thumbFitLive,
                    it.idSanPham,
                    it.anhThumbFit,
                  );
                  return it.anhUrl ? (
                    <button
                      key={key}
                      type="button"
                      className="shop-kiosk-ticker-thumb-btn"
                      data-shop-track-sp={dup ? undefined : it.idSanPham}
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
                        data-shop-thumb-fit={fit}
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

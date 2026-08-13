"use client";

import Link from "next/link";
import { TicketPercent, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

const TICKER_RESUME_MS = 1200;
const TICKER_RESUME_EASE_MS = 1500;
const TICKER_DT_MAX_MS = 64;
const TICKER_SPEED_DEFAULT = 28;
const TICKER_COPIES_MIN = 3;
const TICKER_COPIES_MAX = 24;

function formatGiamChip(loaiGiam: CongKhaiItem["loaiGiam"], giaTri: number): string {
  if (loaiGiam === "phan_tram") return `Giảm ${giaTri}%`;
  return `Giảm ${giaTri.toLocaleString("vi-VN")}₫`;
}

function tickerResumeEase(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const inv = 1 - x;
  return 1 - inv * inv * inv;
}

function SanVoucherChip({
  v,
  dup,
  onOpen,
}: {
  v: CongKhaiItem;
  dup: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="ch-san-voucher-chip"
      tabIndex={dup ? -1 : 0}
      aria-hidden={dup || undefined}
      draggable={false}
      onClick={onOpen}
    >
      <span className="ch-san-voucher-chip-stub" aria-hidden>
        <TicketPercent size={15} strokeWidth={2.25} />
      </span>
      <span className="ch-san-voucher-chip-giam">
        {formatGiamChip(v.loaiGiam, v.giaTri)}
      </span>
      <span className="ch-san-voucher-chip-meta">
        <span className="ch-san-voucher-chip-shop">
          {v.tenCuaHang?.trim() || "Shop"}
        </span>
        <span className="ch-san-voucher-chip-ma">{v.ma}</span>
      </span>
    </button>
  );
}

/**
 * Khu «Săn voucher» trên /cua-hang — ticker lặp + modal đầy đủ.
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
  const tickerScrollRef = useRef<HTMLDivElement>(null);
  const tickerTrackRef = useRef<HTMLDivElement>(null);
  const sanRef = useRef(san);
  sanRef.current = san;
  const tickerDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScroll: number;
    active: boolean;
  } | null>(null);
  const tickerSuppressClickRef = useRef(false);
  const [tickerDragging, setTickerDragging] = useState(false);
  const [tickerLoop, setTickerLoop] = useState(true);
  const tickerLoopRef = useRef(true);
  tickerLoopRef.current = tickerLoop;
  const [tickerCopies, setTickerCopies] = useState(TICKER_COPIES_MIN);
  const tickerCopiesRef = useRef(TICKER_COPIES_MIN);
  tickerCopiesRef.current = tickerCopies;
  const tickerSetWidthRef = useRef(0);
  const tickerPosRef = useRef(0);
  const tickerHoldReasonsRef = useRef(new Set<string>());
  const tickerRafRef = useRef<number | null>(null);
  const tickerLastTsRef = useRef<number | null>(null);
  const tickerSpeedRef = useRef(TICKER_SPEED_DEFAULT);
  const tickerEaseStartRef = useRef<number | null>(null);
  const tickerReducedMotionRef = useRef(false);
  const tickerResumeTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  const writeTickerPos = useCallback((pos: number) => {
    tickerPosRef.current = pos;
    const track = tickerTrackRef.current;
    if (track) track.style.transform = `translate3d(${-pos}px, 0, 0)`;
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

  const measureTicker = useCallback(() => {
    const el = tickerScrollRef.current;
    const track = tickerTrackRef.current;
    if (!el || !track) return;
    const n = sanRef.current.length;
    if (n === 0) {
      if (tickerLoopRef.current) setTickerLoop(false);
      if (tickerCopiesRef.current !== TICKER_COPIES_MIN) {
        setTickerCopies(TICKER_COPIES_MIN);
      }
      tickerSetWidthRef.current = 0;
      writeTickerPos(0);
      return;
    }
    if (!tickerLoopRef.current) {
      setTickerLoop(true);
      return;
    }
    const copies = tickerCopiesRef.current;
    const nextCopyEl = track.children[n] as HTMLElement | undefined;
    const oneSet =
      nextCopyEl && copies >= 2
        ? nextCopyEl.offsetLeft
        : track.scrollWidth / Math.max(1, copies);
    if (!(oneSet > 0)) return;
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
    if (tickerPosRef.current < oneSet || tickerPosRef.current >= oneSet * 2) {
      writeTickerPos(oneSet);
    }
  }, [writeTickerPos]);

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

  const loadSan = useCallback(async () => {
    const res = await fetch("/api/shop/vouchers/public", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { items?: CongKhaiItem[] };
    setSan(json.items ?? []);
  }, []);

  const loadVi = useCallback(async () => {
    const res = await fetch("/api/shop/vouchers/wallet", { cache: "no-store" });
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
      const res = await fetch("/api/shop/vouchers/wallet", {
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
    if (!v.sellerSlug) return "/shopping";
    return shopPublicHref(
      v.sellerSlug,
      shopSlugFromTen(v.tenCuaHang, v.sellerSlug),
    );
  }

  useLayoutEffect(() => {
    if (loading) return;
    measureTicker();
  }, [loading, san, tickerLoop, tickerCopies, measureTicker]);

  useEffect(() => {
    if (loading) return;
    const el = tickerScrollRef.current;
    const track = tickerTrackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureTicker());
    ro.observe(el);
    if (track) ro.observe(track);
    return () => ro.disconnect();
  }, [loading, san, measureTicker, tickerCopies, tickerLoop]);

  useEffect(() => {
    if (open) tickerHoldReasonsRef.current.add("modal");
    else tickerHoldReasonsRef.current.delete("modal");
  }, [open]);

  useEffect(() => {
    if (loading || !tickerLoop || san.length === 0) {
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

    const root = el.closest(".ch-san-voucher-rail");
    if (root) {
      const raw = getComputedStyle(root)
        .getPropertyValue("--ch-san-voucher-ticker-speed")
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
        if (u >= 1) tickerEaseStartRef.current = null;
        else speed *= tickerResumeEase(u);
      }
      let pos = tickerPosRef.current + speed * (dt / 1000);
      const oneSet = tickerSetWidthRef.current;
      if (oneSet > 0 && pos >= oneSet * 2) pos -= oneSet;
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
      if (mq.matches) stopRaf();
      else startRaf();
    };
    syncReducedMotion();
    mq.addEventListener("change", syncReducedMotion);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") holdReasons.add("hidden");
      else holdReasons.delete("hidden");
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
      holdReasons.delete("offscreen");
      holdReasons.delete("hidden");
      holdReasons.delete("drag");
      holdReasons.delete("user-scroll");
    };
  }, [loading, san.length, scheduleTickerHoldClear, tickerLoop, writeTickerPos]);

  useEffect(() => {
    const resumeTimers = tickerResumeTimersRef.current;
    return () => {
      for (const t of resumeTimers.values()) clearTimeout(t);
      resumeTimers.clear();
    };
  }, []);

  const list = tab === "san" ? san : vi;
  const empty =
    !loading &&
    list.length === 0 &&
    (tab === "san" || loggedIn);

  const railLabel = loading
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

  const showRail = loading || san.length > 0;
  const openAll = useCallback(() => setOpen(true), []);

  return (
    <>
      {showRail ? (
        <div className="ch-san-voucher-rail" aria-label={railLabel}>
          <div
            ref={tickerScrollRef}
            className={`ch-san-voucher-rail-scroll${tickerDragging ? " is-dragging" : ""}`}
            onPointerDown={onTickerPointerDown}
            onPointerMove={onTickerPointerMove}
            onPointerUp={finishTickerDrag}
            onPointerCancel={finishTickerDrag}
            onLostPointerCapture={onTickerLostPointerCapture}
            onClickCapture={onTickerClickCapture}
          >
            {loading ? (
              Array.from({ length: 4 }, (_, i) => (
                <span
                  key={i}
                  className="ch-san-voucher-chip is-skeleton"
                  aria-hidden
                />
              ))
            ) : (
              <div ref={tickerTrackRef} className="ch-san-voucher-rail-track">
                {Array.from({ length: tickerCopies }).flatMap((_, copy) =>
                  san.map((v, i) => (
                    <SanVoucherChip
                      key={`${v.id}-${copy}-${i}`}
                      v={v}
                      dup={copy > 0}
                      onOpen={openAll}
                    />
                  )),
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="ch-san-voucher-rail-all"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Xem tất cả voucher
          </button>
        </div>
      ) : null}
      {modal}
    </>
  );
}

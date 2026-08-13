"use client";

import { useEffect, useRef } from "react";

import type {
  LoaiDoiTuongSuKien,
  NguonSuKien,
  SuKienInput,
} from "@/lib/social/su-kien-constants";
import { isUuid } from "@/lib/social/su-kien-constants";

const ENDPOINT = "/api/social/su-kien";
const PHIEN_KEY = "cins-phien-id";
const FLUSH_DELAY_MS = 4000;

let defaultNguon: NguonSuKien | null = null;
let cachedPhien: string | null = null;

/** Nguồn mặc định theo trang (BeMatPageTracker). */
export function setDefaultNguonSuKien(nguon: NguonSuKien | null): void {
  defaultNguon = nguon;
}

function resolveNguon(nguon?: NguonSuKien | null): NguonSuKien | null {
  return nguon ?? defaultNguon;
}
let queue: SuKienInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

/** ID phiên/khách ổn định trong trình duyệt (không PII; server sẽ hash). */
export function getClientPhienId(): string | null {
  return getPhienId();
}

function getPhienId(): string | null {
  if (typeof window === "undefined") return null;
  if (cachedPhien) return cachedPhien;
  try {
    let v = window.localStorage.getItem(PHIEN_KEY);
    if (!v) {
      v =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(PHIEN_KEY, v);
    }
    cachedPhien = v;
    return v;
  } catch {
    return null;
  }
}

function flush(useBeacon = false) {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue;
  queue = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const payload = JSON.stringify({ events, phien_id: getPhienId() });
  try {
    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
  } catch {
    /* fallback xuống fetch */
  }
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function bindFlushListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const onHide = () => flush(true);
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}

function scheduleFlush() {
  bindFlushListeners();
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush(false);
  }, FLUSH_DELAY_MS);
}

/** Đẩy 1 event vào hàng đợi (gộp, flush sau ~4s hoặc khi rời trang). */
export function trackSuKien(ev: SuKienInput): void {
  if (typeof window === "undefined") return;
  queue.push(ev);
  scheduleFlush();
}

/** Flush ngay (vd ngay sau 1 click quan trọng). */
export function flushSuKienNow(): void {
  flush(true);
}

/* Dedup impression theo phiên + sessionStorage 10 phút (chống reload). */
const seenImpression = new Set<string>();
const IMPRESSION_TTL_MS = 10 * 60 * 1000;
const IMPRESSION_STORE_KEY = "cins-imp-seen";

function impressionStoreRead(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(IMPRESSION_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function impressionSeen(key: string): boolean {
  if (seenImpression.has(key)) return true;
  const ts = impressionStoreRead()[key];
  if (typeof ts === "number" && Date.now() - ts < IMPRESSION_TTL_MS) {
    seenImpression.add(key);
    return true;
  }
  return false;
}

function impressionMark(key: string): void {
  seenImpression.add(key);
  if (typeof window === "undefined") return;
  try {
    const store = impressionStoreRead();
    const now = Date.now();
    store[key] = now;
    for (const [k, ts] of Object.entries(store)) {
      if (now - ts >= IMPRESSION_TTL_MS) delete store[k];
    }
    window.sessionStorage.setItem(IMPRESSION_STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export type ImpressionArgs = {
  loaiDoiTuong: LoaiDoiTuongSuKien;
  idDoiTuong: string;
  nguon?: NguonSuKien;
};

export function trackImpression(args: ImpressionArgs): void {
  const key = `${args.loaiDoiTuong}:${args.idDoiTuong}:${args.nguon ?? ""}`;
  if (impressionSeen(key)) return;
  impressionMark(key);
  trackSuKien({
    loai_su_kien: "hien_thi",
    loai_doi_tuong: args.loaiDoiTuong,
    id_doi_tuong: args.idDoiTuong,
    nguon: resolveNguon(args.nguon),
  });
}

/**
 * Hook: bắn 'hien_thi' khi phần tử lọt vào viewport ≥50% trong ≥600ms.
 * `enabled=false` (vd nội dung của chính mình) → không đo.
 */
export function useImpressionTracker(
  ref: React.RefObject<HTMLElement | null>,
  args: ImpressionArgs,
  enabled: boolean,
): void {
  const idDoiTuong = args.idDoiTuong;
  const loaiDoiTuong = args.loaiDoiTuong;
  const nguon = args.nguon;
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const key = `${loaiDoiTuong}:${idDoiTuong}:${nguon ?? ""}`;
    if (impressionSeen(key)) return;

    let dwell: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (dwell) continue;
            dwell = setTimeout(() => {
              trackImpression({ loaiDoiTuong, idDoiTuong, nguon });
              observer.disconnect();
            }, 600);
          } else if (dwell) {
            clearTimeout(dwell);
            dwell = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      if (dwell) clearTimeout(dwell);
      observer.disconnect();
    };
  }, [ref, idDoiTuong, loaiDoiTuong, nguon, enabled]);
}

const seenLotManHinh = new Set<string>();
const seenTuongTacOnce = new Set<string>();

const HANH_VI_DEDUP = new Set(["mo_catalog", "click_sidebar_hang"]);

export type ShopHanhVi =
  | "mo_catalog"
  | "click_sidebar_hang"
  | "phong_to_anh"
  | "them_gio";

export type TuongTacArgs = {
  loaiDoiTuong: LoaiDoiTuongSuKien;
  idDoiTuong: string;
  hanhVi: ShopHanhVi | string;
  nguon?: NguonSuKien;
};

/** Tương tác — `ngu_canh.hanh_vi` khớp rollup shop. */
export function trackTuongTac(args: TuongTacArgs): void {
  if (!isUuid(args.idDoiTuong)) return;
  if (HANH_VI_DEDUP.has(args.hanhVi)) {
    const key = `${args.loaiDoiTuong}:${args.idDoiTuong}:${args.hanhVi}`;
    if (seenTuongTacOnce.has(key)) return;
    seenTuongTacOnce.add(key);
  }
  trackSuKien({
    loai_su_kien: "tuong_tac",
    loai_doi_tuong: args.loaiDoiTuong,
    id_doi_tuong: args.idDoiTuong,
    nguon: resolveNguon(args.nguon),
    ngu_canh: { hanh_vi: args.hanhVi },
  });
}

export function trackLotManHinh(
  idSanPham: string,
  nguon?: NguonSuKien,
): void {
  if (!isUuid(idSanPham)) return;
  const key = `shop_san_pham:${idSanPham}`;
  if (seenLotManHinh.has(key)) return;
  seenLotManHinh.add(key);
  trackSuKien({
    loai_su_kien: "lot_man_hinh",
    loai_doi_tuong: "shop_san_pham",
    id_doi_tuong: idSanPham,
    nguon: resolveNguon(nguon ?? "shop"),
  });
}

export function trackShopThemGio(idSanPham: string, nguon?: NguonSuKien): void {
  trackTuongTac({
    loaiDoiTuong: "shop_san_pham",
    idDoiTuong: idSanPham,
    hanhVi: "them_gio",
    nguon: nguon ?? "shop",
  });
}

/**
 * Hook: bắn `lot_man_hinh` khi phần tử lọt viewport (ngưỡng thấp — thumb ticker).
 */
export function useLotManHinhTracker(
  ref: React.RefObject<HTMLElement | null>,
  idSanPham: string,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!isUuid(idSanPham)) return;
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const key = `shop_san_pham:${idSanPham}`;
    if (seenLotManHinh.has(key)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          trackLotManHinh(idSanPham, "shop");
          observer.disconnect();
          return;
        }
      },
      { threshold: [0, 0.15, 0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, idSanPham, enabled]);
}


"use client";

import { useEffect, useRef } from "react";

import type {
  LoaiDoiTuongSuKien,
  NguonSuKien,
  SuKienInput,
} from "@/lib/social/su-kien-constants";

const ENDPOINT = "/api/social/su-kien";
const PHIEN_KEY = "cins-phien-id";
const FLUSH_DELAY_MS = 4000;

let cachedPhien: string | null = null;
let queue: SuKienInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

/** ID phiên/khách ổn định trong trình duyệt (không PII; server sẽ hash). */
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

/* Dedup impression theo phiên — mỗi đối tượng chỉ tính tiếp cận 1 lần/phiên. */
const seenImpression = new Set<string>();

export type ImpressionArgs = {
  loaiDoiTuong: LoaiDoiTuongSuKien;
  idDoiTuong: string;
  nguon?: NguonSuKien;
};

export function trackImpression(args: ImpressionArgs): void {
  const key = `${args.loaiDoiTuong}:${args.idDoiTuong}`;
  if (seenImpression.has(key)) return;
  seenImpression.add(key);
  trackSuKien({
    loai_su_kien: "hien_thi",
    loai_doi_tuong: args.loaiDoiTuong,
    id_doi_tuong: args.idDoiTuong,
    nguon: args.nguon ?? null,
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
    const key = `${loaiDoiTuong}:${idDoiTuong}`;
    if (seenImpression.has(key)) return;

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

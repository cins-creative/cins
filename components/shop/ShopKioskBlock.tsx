"use client";

import {
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { getNameInitials } from "@/lib/journey/profile";
import { copyShareCardImage } from "@/lib/journey/share-card-export";
import { buildShopMaDon } from "@/lib/shop/ma-don";
import { SHOP_BUYER_TRANSFER_DISCLAIMER } from "@/lib/shop/terms";
import type {
  ShopGio,
  ShopGioDong,
  ShopPostHangItem,
} from "@/lib/shop/types";
import { buildVietQrImageUrl } from "@/lib/shop/vietqr";

import "./shop-kiosk-block.css";

/** Timeout upload biên lai — tránh kẹt "Đang tải…" khi API/CF treo. */
const HOA_DON_UPLOAD_TIMEOUT_MS = 45_000;

function filterHoaDonExportNode(node: HTMLElement): boolean {
  if (node.classList?.contains("shop-kiosk-hoa-don-footer")) return false;
  if (node.classList?.contains("shop-kiosk-hoa-don-close")) return false;
  if (node.classList?.contains("shop-kiosk-hoa-don-back")) return false;
  if (node.classList?.contains("shop-kiosk-hoa-don-proof")) return false;
  if (node.classList?.contains("shop-kiosk-hoa-don-note-field")) return false;
  if (node.classList?.contains("shop-kiosk-pay-box")) return false;
  return true;
}

type Tab = "hang" | "gio";

type Props = {
  /** Post-kiosk — XOR với `cuaHangId`. */
  milestoneId?: string;
  /** Storefront shop — XOR với `milestoneId`. */
  cuaHangId?: string;
  sellerUserId: string | null | undefined;
  viewerProfileId?: string | null;
  /** Logo / avatar người bán — header hóa đơn. */
  sellerAvatarUrl?: string | null;
  /** Tên hiển thị người bán — thay kicker «CINs Shop». */
  sellerName?: string | null;
  sellerSlug?: string | null;
  /**
   * Chỉ portal catalog/giỏ (không ticker). Dùng trên `/{slug}/shop`.
   * Khi true: mở/đóng qua `open` + `onOpenChange`.
   */
  dialogOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tab lúc mở (dialogOnly). */
  initialTab?: Tab;
  /** Catalog sẵn — bỏ fetch post-hang / mat-hang. */
  hangItems?: ShopPostHangItem[];
};

type PreviewState = {
  src: string;
  name: string;
};

/** Debounce sync giỏ — gộp nhiều lần bấm ± thành 1 PATCH. */
const QTY_SYNC_MS = 180;

/** Trần số lượng = tồn kho; hết hàng → không thêm được. */
function qtyCapForLine(soLuongTon: number): number {
  return Math.max(0, soLuongTon);
}

function canIncreaseLineQty(soLuongTon: number, currentQty: number): boolean {
  return currentQty < qtyCapForLine(soLuongTon);
}

function clampQtyToStock(soLuong: number, soLuongTon: number): number {
  const qty = Math.max(0, Math.trunc(soLuong));
  return Math.min(qty, qtyCapForLine(soLuongTon));
}

function cartHasOutOfStock(dong: ShopGioDong[]): boolean {
  return dong.some((d) => d.soLuongTon <= 0);
}

function sortGioDongByCatalog(
  dong: ShopGioDong[],
  catalog: ShopPostHangItem[],
): ShopGioDong[] {
  const order = new Map(catalog.map((it, i) => [it.idBienThe, i]));
  return [...dong].sort((a, b) => {
    const ia = order.get(a.idBienThe);
    const ib = order.get(b.idBienThe);
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1;
    if (ib != null) return 1;
    return a.nhanBienThe.localeCompare(b.nhanBienThe, "vi");
  });
}

function applyLocalQty(
  prev: ShopGio | null,
  scope: Pick<ShopGio, "idCotMoc" | "idCuaHang">,
  item: ShopPostHangItem,
  soLuong: number,
  catalogItems: ShopPostHangItem[] = [],
): ShopGio {
  const qty = Math.max(0, Math.trunc(soLuong));
  const base: ShopGio = prev ?? {
    id: null,
    idCotMoc: scope.idCotMoc,
    idCuaHang: scope.idCuaHang,
    dong: [],
    tongTien: 0,
    tienTe: item.tienTe,
  };
  const dong: ShopGioDong[] = base.dong.filter(
    (d) => d.idBienThe !== item.idBienThe,
  );
  if (qty > 0) {
    dong.push({
      idBienThe: item.idBienThe,
      soLuong: qty,
      tenSanPham: item.tenSanPham,
      nhanBienThe: item.nhanBienThe,
      giaHienThi: item.giaHienThi,
      tienTe: item.tienTe,
      anhUrl: item.anhUrl,
      soLuongTon: item.soLuongTon,
    });
  }
  const dongSorted = sortGioDongByCatalog(
    dong,
    catalogItems.length > 0 ? catalogItems : [item],
  );
  const tongTien = dongSorted.reduce(
    (sum, d) => sum + d.giaHienThi * d.soLuong,
    0,
  );
  return {
    ...base,
    dong: dongSorted,
    tongTien,
    tienTe: dongSorted[0]?.tienTe ?? base.tienTe,
  };
}

function mergePendingOntoGio(
  server: ShopGio,
  scope: Pick<ShopGio, "idCotMoc" | "idCuaHang">,
  items: ShopPostHangItem[],
  pending: Map<string, number>,
): ShopGio {
  if (pending.size === 0) {
    return { ...server, dong: sortGioDongByCatalog(server.dong, items) };
  }
  let merged = server;
  for (const [idBienThe, soLuong] of pending) {
    const item = items.find((it) => it.idBienThe === idBienThe);
    if (!item) continue;
    merged = applyLocalQty(merged, scope, item, soLuong, items);
  }
  return merged;
}

export function ShopKioskBlock({
  milestoneId,
  cuaHangId,
  sellerUserId,
  viewerProfileId,
  sellerAvatarUrl = null,
  sellerName = null,
  sellerSlug = null,
  dialogOnly = false,
  open: openProp,
  onOpenChange,
  initialTab = "hang",
  hangItems,
}: Props) {
  const isShopCart = Boolean(cuaHangId?.trim());
  const postId = milestoneId?.trim() || "";
  const shopId = cuaHangId?.trim() || "";
  const cartScope = useMemo(
    (): Pick<ShopGio, "idCotMoc" | "idCuaHang"> =>
      isShopCart
        ? { idCotMoc: null, idCuaHang: shopId }
        : { idCotMoc: postId, idCuaHang: null },
    [isShopCart, shopId, postId],
  );
  const { openChat } = useCinsChat();
  const sellerLabel =
    sellerName?.trim() ||
    (sellerSlug?.trim() ? `@${sellerSlug.trim()}` : null) ||
    "CINs Shop";
  const sellerInitials = getNameInitials(
    sellerName,
    sellerSlug?.trim() || "C",
  );
  const [items, setItems] = useState<ShopPostHangItem[]>(hangItems ?? []);
  const [gio, setGio] = useState<ShopGio | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(!hangItems);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ghiChu, setGhiChu] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [catalogOpenInternal, setCatalogOpenInternal] = useState(
    dialogOnly ? Boolean(openProp) : false,
  );
  const catalogOpen =
    dialogOnly && openProp !== undefined ? openProp : catalogOpenInternal;
  const setCatalogOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const value =
        typeof next === "function" ? next(catalogOpen) : next;
      if (!(dialogOnly && openProp !== undefined)) {
        setCatalogOpenInternal(value);
      }
      onOpenChange?.(value);
    },
    [catalogOpen, dialogOnly, openProp, onOpenChange],
  );

  const [hoaDonOpen, setHoaDonOpen] = useState(false);
  const [hoaDonMa, setHoaDonMa] = useState<string | null>(null);
  const [buyerLabel, setBuyerLabel] = useState("BUYER");
  const [hoaDonCopied, setHoaDonCopied] = useState(false);
  const [hoaDonCopying, setHoaDonCopying] = useState(false);
  const [hoaDonAccepted, setHoaDonAccepted] = useState(false);
  const [hoaDonAnhUrl, setHoaDonAnhUrl] = useState<string | null>(null);
  const [hoaDonAnhId, setHoaDonAnhId] = useState<string | null>(null);
  const [hoaDonUploading, setHoaDonUploading] = useState(false);
  const [hoaDonUploadErr, setHoaDonUploadErr] = useState<string | null>(null);
  const [sellerPay, setSellerPay] = useState<{
    nganHang: string;
    soTaiKhoan: string;
    tenChuTaiKhoan: string;
    chinhSach: string | null;
  } | null>(null);
  const [sellerPayLoading, setSellerPayLoading] = useState(false);
  const [sellerPayErr, setSellerPayErr] = useState<string | null>(null);
  const hoaDonFileRef = useRef<HTMLInputElement>(null);
  const hoaDonPanelRef = useRef<HTMLDivElement>(null);
  const hoaDonLocalUrlRef = useRef<string | null>(null);
  /** idBienThe → số lượng chờ sync (sau debounce). */
  const pendingQtyRef = useRef(new Map<string, number>());
  const syncTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /** Tăng mỗi lần đổi qty — bỏ qua PATCH response cũ. */
  const qtyEpochRef = useRef(new Map<string, number>());
  const itemsRef = useRef(items);
  itemsRef.current = items;

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
      if (hoaDonOpen) {
        setHoaDonOpen(false);
        return;
      }
      setCatalogOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [preview, hoaDonOpen, catalogOpen]);

  /* Giỏ trống khi đang xác nhận → quay lại bước giỏ. */
  useEffect(() => {
    if (hoaDonOpen && !(gio?.dong.length)) {
      setHoaDonOpen(false);
    }
  }, [gio?.dong.length, hoaDonOpen]);

  /* Món hết tồn không giữ trong giỏ mua ngay. */
  useEffect(() => {
    if (!gio?.dong.length) return;
    if (!cartHasOutOfStock(gio.dong)) return;
    setHoaDonOpen(false);
    setErr("Có món hết hàng — hãy gỡ khỏi giỏ hoặc xóa giỏ.");
  }, [gio]);

  const isOwner =
    Boolean(viewerProfileId) &&
    Boolean(sellerUserId) &&
    viewerProfileId === sellerUserId;

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
      if (json?.banHangEnabled === false) {
        setItems([]);
      } else {
        setItems(json?.items ?? []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [hangItems, isShopCart, sellerSlug, postId]);

  const loadGio = useCallback(async () => {
    if (!viewerProfileId || isOwner) return;
    if (isShopCart ? !shopId : !postId) return;
    try {
      const qs = isShopCart
        ? `cuaHangId=${encodeURIComponent(shopId)}`
        : `cotMocId=${encodeURIComponent(postId)}`;
      const res = await fetch(`/api/shop/gio?${qs}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGio;
      } | null;
      if (json?.gio) {
        setGio(
          mergePendingOntoGio(
            json.gio,
            cartScope,
            itemsRef.current,
            pendingQtyRef.current,
          ),
        );
      }
    } catch {
      /* ignore */
    }
  }, [
    viewerProfileId,
    isOwner,
    isShopCart,
    shopId,
    postId,
    cartScope,
  ]);

  useEffect(() => {
    if (!viewerProfileId) {
      setBuyerLabel("BUYER");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          profile?: { tenHienThi?: string | null; slug?: string | null };
        } | null;
        if (cancelled) return;
        const ten = json?.profile?.tenHienThi?.trim();
        const slug = json?.profile?.slug?.trim();
        setBuyerLabel(ten || slug || "BUYER");
      } catch {
        if (!cancelled) setBuyerLabel("BUYER");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerProfileId]);

  useEffect(() => {
    void loadHang();
  }, [loadHang]);

  useEffect(() => {
    void loadGio();
  }, [loadGio]);

  /* Cài đặt tắt/bật bán hàng → refetch (API ẩn hàng khi seller tắt). */
  useEffect(() => {
    const onBanHangChanged = () => {
      void loadHang();
    };
    window.addEventListener("cins:ban-hang-changed", onBanHangChanged);
    return () => {
      window.removeEventListener("cins:ban-hang-changed", onBanHangChanged);
    };
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
    return () => {
      window.removeEventListener("cins:shop-hang-changed", onShopHangChanged);
    };
  }, [loadHang, isShopCart, postId]);

  useEffect(() => {
    if (hangItems) {
      setItems(hangItems);
      setLoading(false);
    }
  }, [hangItems]);

  useEffect(() => {
    if (dialogOnly && catalogOpen) {
      setTab(initialTab);
      void loadGio();
    }
  }, [dialogOnly, catalogOpen, initialTab, loadGio]);

  useEffect(() => {
    const timers = syncTimersRef.current;
    const pending = pendingQtyRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      pending.clear();
    };
  }, []);

  const flushQtySync = useCallback(
    async (idBienThe: string) => {
      const soLuong = pendingQtyRef.current.get(idBienThe);
      if (soLuong === undefined) return;
      pendingQtyRef.current.delete(idBienThe);
      const epoch = qtyEpochRef.current.get(idBienThe) ?? 0;

      try {
        const res = await fetch("/api/shop/gio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isShopCart ? { cuaHangId: shopId } : { cotMocId: postId }),
            idBienThe,
            soLuong,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          gio?: ShopGio;
          error?: string;
        } | null;

        /* Có lần bấm mới hơn — bỏ response cũ, không ghi đè UI. */
        if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;

        if (!res.ok || !json?.gio) {
          setErr(json?.error ?? "Không cập nhật giỏ.");
          await loadGio();
          return;
        }
        setGio(
          mergePendingOntoGio(
            json.gio,
            cartScope,
            itemsRef.current,
            pendingQtyRef.current,
          ),
        );
      } catch {
        if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
        setErr("Không cập nhật giỏ.");
        await loadGio();
      }
    },
    [isShopCart, shopId, postId, cartScope, loadGio],
  );

  const patchQty = useCallback(
    (idBienThe: string, soLuong: number) => {
      if (!viewerProfileId) {
        setErr("Đăng nhập để thêm vào giỏ.");
        return;
      }
      if (isOwner) return;

      const item = itemsRef.current.find((it) => it.idBienThe === idBienThe);
      if (!item) return;

      const qty = clampQtyToStock(soLuong, item.soLuongTon);
      if (soLuong > qty && item.soLuongTon > 0) {
        setErr(`Chỉ còn ${item.soLuongTon} trong kho.`);
      } else if (item.soLuongTon <= 0 && soLuong > 0) {
        setErr("Hết hàng — không thêm vào giỏ được.");
      } else {
        setErr(null);
      }
      qtyEpochRef.current.set(
        idBienThe,
        (qtyEpochRef.current.get(idBienThe) ?? 0) + 1,
      );
      /* Phản hồi tức thì — không chờ mạng. */
      setGio((prev) =>
        applyLocalQty(prev, cartScope, item, qty, itemsRef.current),
      );

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
    [viewerProfileId, isOwner, cartScope, flushQtySync],
  );

  const clearCart = useCallback(async () => {
    if (!viewerProfileId || isOwner) return;
    for (const t of syncTimersRef.current.values()) clearTimeout(t);
    syncTimersRef.current.clear();
    pendingQtyRef.current.clear();
    qtyEpochRef.current.clear();

    const tienTe = gio?.tienTe ?? itemsRef.current[0]?.tienTe ?? "VND";
    setGio({
      id: gio?.id ?? null,
      ...cartScope,
      dong: [],
      tongTien: 0,
      tienTe,
    });
    setHoaDonOpen(false);
    setGhiChu("");
    setErr(null);
    setTab("hang");
    setBusy(true);
    try {
      const qs = isShopCart
        ? `cuaHangId=${encodeURIComponent(shopId)}`
        : `cotMocId=${encodeURIComponent(postId)}`;
      const res = await fetch(`/api/shop/gio?${qs}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGio;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không xóa giỏ.");
        await loadGio();
        return;
      }
      if (json?.gio) setGio(json.gio);
    } catch {
      setErr("Không xóa giỏ.");
      await loadGio();
    } finally {
      setBusy(false);
    }
  }, [
    viewerProfileId,
    isOwner,
    gio?.id,
    gio?.tienTe,
    cartScope,
    isShopCart,
    shopId,
    postId,
    loadGio,
  ]);

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

  const qtyInCart = useCallback(
    (idBienThe: string): number =>
      gio?.dong.find((d) => d.idBienThe === idBienThe)?.soLuong ?? 0,
    [gio],
  );

  const openHoaDon = useCallback(() => {
    setHoaDonMa(buildShopMaDon(buyerLabel));
    setHoaDonAccepted(false);
    setHoaDonUploadErr(null);
    setHoaDonCopied(false);
    setHoaDonOpen(true);
    setSellerPayErr(null);
    if (!sellerUserId) {
      setSellerPay(null);
      return;
    }
    setSellerPayLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/shop/cua-hang/thanh-toan?sellerId=${encodeURIComponent(sellerUserId)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          payment?: {
            nganHang?: string;
            soTaiKhoan?: string;
            tenChuTaiKhoan?: string;
          } | null;
          shop?: { chinhSach?: string | null } | null;
          error?: string;
        } | null;
        if (!res.ok || !json?.payment) {
          setSellerPay(null);
          setSellerPayErr(
            json?.error ??
              "Người bán chưa thêm tài khoản nhận tiền — chưa gửi đơn được.",
          );
          return;
        }
        setSellerPay({
          nganHang: json.payment.nganHang ?? "",
          soTaiKhoan: json.payment.soTaiKhoan ?? "",
          tenChuTaiKhoan: json.payment.tenChuTaiKhoan ?? "",
          chinhSach: json.shop?.chinhSach ?? null,
        });
      } catch {
        setSellerPay(null);
        setSellerPayErr("Không tải được thông tin nhận tiền.");
      } finally {
        setSellerPayLoading(false);
      }
    })();
  }, [buyerLabel, sellerUserId]);

  const backToCartStep = useCallback(() => {
    setHoaDonOpen(false);
  }, []);

  const hoaDonBienLaiOk =
    Boolean(hoaDonAnhUrl) &&
    !hoaDonUploading &&
    !hoaDonAnhUrl?.startsWith("blob:");

  /** VietQR chỉ gắn STK — số tiền / nội dung CK hiện bên cạnh, không nhét vào ảnh. */
  const payQrUrl = useMemo(() => {
    if (!sellerPay) return null;
    return buildVietQrImageUrl({
      nganHang: sellerPay.nganHang,
      soTaiKhoan: sellerPay.soTaiKhoan,
    });
  }, [sellerPay]);

  const submitOrder = useCallback(async () => {
    if (!viewerProfileId) {
      setErr("Đăng nhập để gửi đơn.");
      return;
    }
    if (!sellerUserId) {
      setErr("Không tìm thấy người bán.");
      return;
    }
    if (!gio?.dong.length) {
      setErr("Giỏ hàng trống.");
      return;
    }
    if (cartHasOutOfStock(gio.dong)) {
      setErr("Có món hết hàng — hãy gỡ khỏi giỏ hoặc xóa giỏ.");
      return;
    }
    const over = gio.dong.find(
      (d) => d.soLuongTon > 0 && d.soLuong > d.soLuongTon,
    );
    if (over) {
      setErr(`${over.tenSanPham}: chỉ còn ${over.soLuongTon} trong kho.`);
      return;
    }
    if (!hoaDonAccepted) {
      setErr("Bạn cần xác nhận rủi ro chuyển khoản trước khi gửi đơn.");
      if (!hoaDonOpen) openHoaDon();
      return;
    }
    if (!hoaDonBienLaiOk) {
      setHoaDonUploadErr(
        hoaDonUploading
          ? "Đang tải hóa đơn — chờ xong rồi gửi đơn."
          : "Cần tải biên lai chuyển khoản trước khi gửi đơn.",
      );
      if (!hoaDonOpen) openHoaDon();
      return;
    }
    if (!sellerPay) {
      setErr(
        sellerPayErr ??
          "Người bán chưa thêm tài khoản nhận tiền — chưa gửi đơn được.",
      );
      if (!hoaDonOpen) openHoaDon();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      /* Flush mọi qty đang debounce trước khi tạo đơn. */
      for (const t of syncTimersRef.current.values()) clearTimeout(t);
      syncTimersRef.current.clear();
      const pendingIds = [...pendingQtyRef.current.keys()];
      await Promise.all(pendingIds.map((id) => flushQtySync(id)));

      const noteParts = [ghiChu.trim()];
      if (hoaDonAnhUrl) {
        noteParts.push(`Hóa đơn thanh toán: ${hoaDonAnhUrl}`);
      }
      const ghiChuGui = noteParts.filter(Boolean).join("\n") || null;
      const maDonGui = hoaDonMa ?? buildShopMaDon(buyerLabel);

      const res = await fetch("/api/shop/don", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isShopCart ? { cuaHangId: shopId } : { cotMocId: postId }),
          loaiDon: "mua_ngay",
          ghiChu: ghiChuGui,
          maDon: maDonGui,
          nguoiMuaChapNhanRuiRo: hoaDonAccepted,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        don?: { id: string; maDon?: string | null };
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
        ...cartScope,
        dong: [],
        tongTien: 0,
        tienTe: gio.tienTe,
      });
      setGhiChu("");
      const bienLaiUrl =
        hoaDonAnhUrl && !hoaDonAnhUrl.startsWith("blob:")
          ? hoaDonAnhUrl
          : null;
      const bienLaiId = hoaDonAnhId?.trim() || null;
      setHoaDonAnhUrl(null);
      setHoaDonAnhId(null);
      setHoaDonOpen(false);
      setHoaDonAccepted(false);
      setHoaDonMa(null);
      setCatalogOpen(false);
      setTab("hang");
      try {
        await openChat({
          targetUserId: sellerUserId,
          peerPreview: {
            name: sellerLabel,
            slug: sellerSlug ?? undefined,
            avatarUrl: sellerAvatarUrl ?? null,
            avatarInitial: sellerInitials,
          },
          nguCanh: {
            loai: json.chatContext.loai,
            id: json.chatContext.id,
            tieuDe: json.chatContext.tieuDe,
            moTa: json.chatContext.moTa ?? null,
            href: json.chatContext.href ?? null,
          },
          autoSendNguCanh: true,
          autoSendImageId: bienLaiId,
          autoSendImageUrl: bienLaiUrl,
        });
      } catch {
        setErr(
          "Đã tạo đơn nhưng chưa mở được chat — thử «Nhắn người bán».",
        );
      }
    } finally {
      setBusy(false);
    }
  }, [
    viewerProfileId,
    sellerUserId,
    sellerLabel,
    sellerSlug,
    sellerAvatarUrl,
    sellerInitials,
    gio,
    isShopCart,
    shopId,
    postId,
    cartScope,
    ghiChu,
    hoaDonAnhUrl,
    hoaDonAnhId,
    hoaDonAccepted,
    hoaDonBienLaiOk,
    hoaDonUploading,
    hoaDonMa,
    hoaDonOpen,
    buyerLabel,
    openHoaDon,
    flushQtySync,
    openChat,
    sellerPay,
    sellerPayErr,
  ]);

  const uploadHoaDonThanhToan = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!isAllowedUploadImageFile(file)) {
      setHoaDonUploadErr("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES) {
      setHoaDonUploadErr(cloudflareImageTooLargeError());
      return;
    }

    if (hoaDonLocalUrlRef.current) {
      URL.revokeObjectURL(hoaDonLocalUrlRef.current);
      hoaDonLocalUrlRef.current = null;
    }

    const localUrl = URL.createObjectURL(file);
    hoaDonLocalUrlRef.current = localUrl;
    setHoaDonAnhUrl(localUrl);
    setHoaDonAnhId(null);
    setHoaDonUploading(true);
    setHoaDonUploadErr(null);
    setErr(null);

    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), HOA_DON_UPLOAD_TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => null)) as {
        url?: string;
        imageId?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.url) {
        throw new Error(json?.error ?? "Không tải hóa đơn được.");
      }
      if (hoaDonLocalUrlRef.current) {
        URL.revokeObjectURL(hoaDonLocalUrlRef.current);
        hoaDonLocalUrlRef.current = null;
      }
      setHoaDonAnhUrl(json.url);
      setHoaDonAnhId(json.imageId?.trim() || null);
    } catch (e) {
      if (hoaDonLocalUrlRef.current) {
        URL.revokeObjectURL(hoaDonLocalUrlRef.current);
        hoaDonLocalUrlRef.current = null;
      }
      setHoaDonAnhUrl(null);
      setHoaDonAnhId(null);
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      setHoaDonUploadErr(
        aborted
          ? "Tải lên quá lâu — thử lại ảnh nhỏ hơn hoặc kiểm tra mạng."
          : e instanceof Error && e.message
            ? e.message
            : "Không tải hóa đơn được.",
      );
    } finally {
      window.clearTimeout(timer);
      setHoaDonUploading(false);
      if (hoaDonFileRef.current) hoaDonFileRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoaDonLocalUrlRef.current) {
        URL.revokeObjectURL(hoaDonLocalUrlRef.current);
        hoaDonLocalUrlRef.current = null;
      }
    };
  }, []);

  const copyHoaDonPanel = useCallback(async () => {
    const el = hoaDonPanelRef.current;
    if (!el || hoaDonCopying) return;
    setHoaDonCopying(true);
    setHoaDonUploadErr(null);
    try {
      const result = await copyShareCardImage(el, "cins-hoa-don.png", {
        filter: filterHoaDonExportNode,
        backgroundColor:
          getComputedStyle(el).backgroundColor || "#ffffff",
      });
      if (result === "failed") {
        setHoaDonUploadErr(
          "Không sao chép được ảnh hóa đơn. Thử chụp màn hình.",
        );
        return;
      }
      setHoaDonCopied(true);
      window.setTimeout(() => setHoaDonCopied(false), 2000);
    } finally {
      setHoaDonCopying(false);
    }
  }, [hoaDonCopying]);

  const messageSeller = useCallback(async () => {
    if (!sellerUserId) return;
    await openChat({ targetUserId: sellerUserId });
  }, [sellerUserId, openChat]);

  const openCatalog = useCallback(
    (nextTab: Tab = "hang") => {
      if (isOwner && nextTab === "gio") return;
      setTab(nextTab);
      setCatalogOpen(true);
    },
    [isOwner],
  );

  if (dialogOnly && !catalogOpen && !preview) return null;
  if (!dialogOnly) {
    if (loading) return null;
    if (items.length === 0) return null;
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

  const showCheckoutPanel =
    hoaDonOpen && Boolean(gio?.dong.length) && tab === "gio";

  const hoaDonPanel =
    showCheckoutPanel && gio ? (
            <div
              ref={hoaDonPanelRef}
              className="shop-kiosk-hoa-don-panel shop-kiosk-hoa-don-panel--embed"
              role="region"
              aria-labelledby="shop-kiosk-hoa-don-title"
            >
              <header className="shop-kiosk-hoa-don-hdr">
                <div>
                  <button
                    type="button"
                    className="shop-kiosk-hoa-don-back"
                    onClick={backToCartStep}
                  >
                    <ChevronLeft size={16} strokeWidth={2.2} aria-hidden />
                    Giỏ hàng
                  </button>
                  <div className="shop-kiosk-hoa-don-seller">
                    {sellerAvatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        className="shop-kiosk-hoa-don-seller-avatar"
                        src={sellerAvatarUrl}
                        alt=""
                      />
                    ) : (
                      <span
                        className="shop-kiosk-hoa-don-seller-avatar is-fallback"
                        aria-hidden
                      >
                        {sellerInitials}
                      </span>
                    )}
                    <p className="shop-kiosk-hoa-don-kicker">{sellerLabel}</p>
                  </div>
                  <h3 id="shop-kiosk-hoa-don-title">Xác nhận đơn</h3>
                </div>
                <button
                  type="button"
                  className="shop-kiosk-hoa-don-close"
                  aria-label="Quay lại giỏ hàng"
                  onClick={backToCartStep}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </header>

                <div className="shop-kiosk-hoa-don-sheet">
                <div className="shop-kiosk-hoa-don-meta">
                  <span>
                    {new Date().toLocaleString("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="shop-kiosk-hoa-don-badge">Mua ngay</span>
                </div>
                {hoaDonMa ? (
                  <p className="shop-kiosk-hoa-don-ma">
                    Mã đơn <strong>{hoaDonMa}</strong>
                  </p>
                ) : null}
                <table className="shop-kiosk-hoa-don-table">
                  <thead>
                    <tr>
                      <th scope="col">Hàng</th>
                      <th scope="col">SL</th>
                      <th scope="col">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gio.dong.map((d) => (
                      <tr key={d.idBienThe}>
                        <td>
                          <div className="shop-kiosk-hoa-don-item">
                            {d.anhUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={d.anhUrl}
                                alt=""
                                className="shop-kiosk-hoa-don-thumb"
                              />
                            ) : (
                              <span
                                className="shop-kiosk-hoa-don-thumb shop-kiosk-hoa-don-thumb--empty"
                                aria-hidden
                              />
                            )}
                            <span className="shop-kiosk-hoa-don-item-copy">
                              <span className="shop-kiosk-hoa-don-item-name">
                                {d.tenSanPham}
                              </span>
                              {d.nhanBienThe !== "Mặc định" ? (
                                <span className="shop-kiosk-hoa-don-item-var">
                                  {d.nhanBienThe}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td>{d.soLuong}</td>
                        <td>
                          {(d.giaHienThi * d.soLuong).toLocaleString("vi-VN")}{" "}
                          {d.tienTe}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="shop-kiosk-hoa-don-total">
                  <span>Tổng cộng</span>
                  <strong>
                    {gio.tongTien.toLocaleString("vi-VN")} {gio.tienTe}
                  </strong>
                </div>
                <p className="shop-kiosk-hoa-don-foot">
                  Thanh toán trực tiếp cho người bán — CINs không trung gian tiền.
                </p>
              </div>

              <div className="shop-kiosk-pay-box">
                <h4 className="shop-kiosk-pay-title">Chuyển khoản tới</h4>
                {sellerPayLoading ? (
                  <p className="shop-kiosk-pay-muted">
                    <Loader2 size={14} className="shop-spin" aria-hidden /> Đang
                    tải thông tin nhận tiền…
                  </p>
                ) : sellerPay ? (
                  <div className="shop-kiosk-pay-grid">
                    <div>
                      <p>
                        <strong>{sellerPay.nganHang}</strong>
                      </p>
                      <p>
                        STK: <strong>{sellerPay.soTaiKhoan}</strong>
                      </p>
                      <p>Chủ TK: {sellerPay.tenChuTaiKhoan}</p>
                      {hoaDonMa ? (
                        <p>
                          Nội dung CK: <strong>{hoaDonMa}</strong>
                        </p>
                      ) : null}
                      {gio ? (
                        <p>
                          Số tiền:{" "}
                          <strong>
                            {gio.tongTien.toLocaleString("vi-VN")} {gio.tienTe}
                          </strong>
                        </p>
                      ) : null}
                      {sellerPay.chinhSach ? (
                        <p className="shop-kiosk-pay-policy">
                          {sellerPay.chinhSach}
                        </p>
                      ) : null}
                    </div>
                    {payQrUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={payQrUrl}
                        alt="QR chuyển khoản"
                        className="shop-kiosk-pay-qr"
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="shop-kiosk-err" role="alert">
                    {sellerPayErr ??
                      "Người bán chưa thêm tài khoản nhận tiền."}
                  </p>
                )}
              </div>

              <label className="shop-kiosk-hoa-don-note-field">
                <span>Ghi chú cho người bán</span>
                <textarea
                  rows={2}
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                />
              </label>

              <div className="shop-kiosk-hoa-don-proof">
                  <p className="shop-kiosk-hoa-don-warn" role="alert">
                    <TriangleAlert
                      className="shop-kiosk-hoa-don-warn-icon"
                      size={18}
                      strokeWidth={2.2}
                      aria-hidden
                    />
                    <span>
                      Chuyển tiền trực tiếp cho người bán — hãy xác minh chính chủ
                      trước khi thanh toán. Mọi giao dịch ngoài nền tảng do hai bên
                      tự chịu trách nhiệm; CINs không chịu trách nhiệm.
                    </span>
                  </p>

              <div className="shop-kiosk-hoa-don-upload">
                <span className="shop-kiosk-hoa-don-upload-label">
                  Ảnh biên lai chuyển khoản
                </span>
                <input
                  ref={hoaDonFileRef}
                  type="file"
                  accept="image/*"
                  className="shop-kiosk-hoa-don-file"
                  disabled={hoaDonUploading}
                  onChange={(e) =>
                    void uploadHoaDonThanhToan(e.target.files?.[0] ?? null)
                  }
                />
                {hoaDonAnhUrl ? (
                  <div className="shop-kiosk-hoa-don-upload-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hoaDonAnhUrl} alt="Biên lai chuyển khoản" />
                    {hoaDonUploading ? (
                      <div className="shop-kiosk-hoa-don-upload-busy">
                        <Loader2 size={16} className="shop-spin" aria-hidden />
                        Đang tải lên…
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="shop-kiosk-hoa-don-upload-remove"
                        onClick={() => {
                          if (hoaDonLocalUrlRef.current) {
                            URL.revokeObjectURL(hoaDonLocalUrlRef.current);
                            hoaDonLocalUrlRef.current = null;
                          }
                          setHoaDonAnhUrl(null);
                          setHoaDonAnhId(null);
                          setHoaDonUploadErr(null);
                        }}
                      >
                        Gỡ ảnh
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="shop-kiosk-hoa-don-upload-btn"
                    disabled={hoaDonUploading}
                    onClick={() => hoaDonFileRef.current?.click()}
                  >
                    {hoaDonUploading ? (
                      <>
                        <Loader2 size={16} className="shop-spin" aria-hidden />
                        Đang tải…
                      </>
                    ) : (
                      <>
                        <Upload size={16} strokeWidth={2} aria-hidden />
                        Chọn ảnh biên lai
                      </>
                    )}
                  </button>
                )}
                {hoaDonUploadErr ? (
                  <p className="shop-kiosk-hoa-don-upload-err" role="alert">
                    {hoaDonUploadErr}
                  </p>
                ) : null}
              </div>

              <label className="shop-kiosk-hoa-don-accept">
                <input
                  type="checkbox"
                  checked={hoaDonAccepted}
                  onChange={(e) => setHoaDonAccepted(e.target.checked)}
                />
                <span>{SHOP_BUYER_TRANSFER_DISCLAIMER}</span>
              </label>
              </div>

              <div className="shop-kiosk-hoa-don-footer">
                {err ? (
                  <p className="shop-kiosk-err" role="alert">
                    {err}
                  </p>
                ) : null}
                <div className="shop-kiosk-hoa-don-actions">
                  <button
                    type="button"
                    className="shop-kiosk-submit shop-kiosk-hoa-don-submit"
                    disabled={
                      busy ||
                      !hoaDonAccepted ||
                      !hoaDonBienLaiOk ||
                      !sellerPay ||
                      sellerPayLoading
                    }
                    onClick={() => void submitOrder()}
                  >
                    {busy ? (
                      <Loader2 size={16} className="shop-spin" />
                    ) : (
                      "Gửi đơn cho người bán"
                    )}
                  </button>
                  <button
                    type="button"
                    className="shop-kiosk-hoa-don-copy"
                    disabled={hoaDonCopying}
                    onClick={() => void copyHoaDonPanel()}
                  >
                    {hoaDonCopying ? (
                      <>
                        <Loader2 size={16} className="shop-spin" aria-hidden />
                        Đang tạo ảnh…
                      </>
                    ) : hoaDonCopied ? (
                      <>
                        <Check size={16} strokeWidth={2.2} aria-hidden />
                        Đã sao chép ảnh
                      </>
                    ) : (
                      <>
                        <Copy size={16} strokeWidth={2} aria-hidden />
                        Sao chép ảnh đơn
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
    ) : null;

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
              setHoaDonOpen(false);
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
                  <p className="shop-kiosk-catalog-kicker">{sellerLabel}</p>
                  <h3 id="shop-kiosk-catalog-title">
                    {tab === "gio"
                      ? showCheckoutPanel
                        ? "Xác nhận đơn"
                        : "Giỏ hàng của bạn"
                      : "Hàng bán"}
                  </h3>
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
                    onClick={() => {
                      setHoaDonOpen(false);
                              setCatalogOpen(false);
                    }}
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </header>

              <div className="shop-kiosk-catalog-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "hang"}
                  className={`shop-kiosk-catalog-tab${tab === "hang" ? " is-active" : ""}`}
                  onClick={() => {
                    setHoaDonOpen(false);
                          setTab("hang");
                  }}
                >
                  <ShoppingBag size={14} strokeWidth={1.8} aria-hidden />
                  Hàng bán
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "gio"}
                  className={`shop-kiosk-catalog-tab${tab === "gio" ? " is-active" : ""}`}
                  onClick={() => setTab("gio")}
                  disabled={isOwner}
                >
                  Giỏ hàng
                  {cartCount > 0 ? (
                    <span className="shop-kiosk-badge">{cartCount}</span>
                  ) : null}
                </button>
              </div>

              {err ? <p className="shop-kiosk-catalog-err">{err}</p> : null}

              {tab === "gio" && !isOwner ? (
                <nav
                  className="shop-kiosk-checkout-steps"
                  aria-label="Các bước mua hàng"
                >
                  <button
                    type="button"
                    className={`shop-kiosk-checkout-step${showCheckoutPanel ? "" : " is-active"}`}
                    aria-current={showCheckoutPanel ? undefined : "step"}
                    onClick={() => {
                      if (showCheckoutPanel) backToCartStep();
                    }}
                  >
                    <span className="shop-kiosk-checkout-step-num" aria-hidden>
                      1
                    </span>
                    Giỏ hàng
                  </button>
                  <span className="shop-kiosk-checkout-step-sep" aria-hidden />
                  <button
                    type="button"
                    className={`shop-kiosk-checkout-step${showCheckoutPanel ? " is-active" : ""}`}
                    aria-current={showCheckoutPanel ? "step" : undefined}
                    disabled={
                      !(gio?.dong.length) || cartHasOutOfStock(gio.dong)
                    }
                    onClick={() => {
                      if (
                        !showCheckoutPanel &&
                        gio?.dong.length &&
                        !cartHasOutOfStock(gio.dong)
                      ) {
                        openHoaDon();
                      }
                    }}
                  >
                    <span className="shop-kiosk-checkout-step-num" aria-hidden>
                      2
                    </span>
                    Xác nhận
                  </button>
                </nav>
              ) : null}

              <div
                className={`shop-kiosk-catalog-body${showCheckoutPanel ? " is-split" : ""}`}
              >
                {tab === "hang" ? (
                  itemsByGroup.length === 0 ? (
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
                            const qty = qtyInCart(it.idBienThe);
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
                                    <img
                                      src={it.anhUrl}
                                      alt=""
                                      loading="lazy"
                                    />
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
                                              patchQty(it.idBienThe, qty - 1)
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
                                              patchQty(it.idBienThe, qty + 1)
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
                                          aria-label="Thêm vào giỏ"
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
                                            patchQty(it.idBienThe, 1);
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
                  )
                ) : (
                  <div
                    className={`shop-kiosk-cart shop-kiosk-catalog-cart${showCheckoutPanel ? " is-checkout-summary" : ""}`}
                  >
                    {!gio?.dong.length ? (
                      <div className="shop-kiosk-cart-empty">
                        <ShoppingBag size={22} strokeWidth={1.7} aria-hidden />
                        <p>Giỏ còn trống</p>
                        <button
                          type="button"
                          className="shop-kiosk-cart-empty-cta"
                          onClick={() => setTab("hang")}
                        >
                          Xem hàng bán
                        </button>
                      </div>
                    ) : (
                      <>
                        {showCheckoutPanel ? (
                          <p className="shop-kiosk-cart-summary-label">
                            Đơn của bạn
                          </p>
                        ) : null}
                        <ul
                          className="shop-kiosk-cart-lines"
                          aria-label="Giỏ hàng"
                        >
                          {gio.dong.map((d) => {
                            const canIncrease = canIncreaseLineQty(
                              d.soLuongTon,
                              d.soLuong,
                            );
                            const outOfStock = d.soLuongTon <= 0;
                            return (
                            <li
                              key={d.idBienThe}
                              className="shop-kiosk-cart-line"
                            >
                              {d.anhUrl ? (
                                <button
                                  type="button"
                                  className="shop-kiosk-thumb-btn"
                                  onClick={() =>
                                    setPreview({
                                      src: d.anhUrl!,
                                      name: d.tenSanPham,
                                    })
                                  }
                                  aria-label={`Xem ảnh ${d.tenSanPham}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={d.anhUrl}
                                    alt=""
                                    className="shop-kiosk-thumb"
                                  />
                                </button>
                              ) : (
                                <div className="shop-kiosk-thumb shop-kiosk-thumb--empty" />
                              )}
                              <div className="shop-kiosk-cart-line-body">
                                <div className="shop-kiosk-cart-line-top">
                                  <div className="shop-kiosk-name">
                                    {d.tenSanPham}
                                    {d.nhanBienThe !== "Mặc định" ? (
                                      <span className="shop-kiosk-variant">
                                        {" "}
                                        · {d.nhanBienThe}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="shop-kiosk-cart-line-sum">
                                    {(d.giaHienThi * d.soLuong).toLocaleString(
                                      "vi-VN",
                                    )}{" "}
                                    {d.tienTe}
                                  </div>
                                </div>
                                <div className="shop-kiosk-cart-line-foot">
                                  <span className="shop-kiosk-cart-unit">
                                    {d.giaHienThi.toLocaleString("vi-VN")}{" "}
                                    {d.tienTe}/sp
                                    {outOfStock ? (
                                      <span className="shop-kiosk-cart-stock is-oos">
                                        {" "}
                                        · hết hàng
                                      </span>
                                    ) : (
                                      <span className="shop-kiosk-cart-stock">
                                        {" "}
                                        · còn {d.soLuongTon}
                                      </span>
                                    )}
                                  </span>
                                  <div className="shop-kiosk-qty">
                                    <button
                                      type="button"
                                      aria-label="Bớt"
                                      disabled={d.soLuong <= 0}
                                      onClick={() =>
                                        patchQty(d.idBienThe, d.soLuong - 1)
                                      }
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span>{d.soLuong}</span>
                                    <button
                                      type="button"
                                      aria-label="Thêm"
                                      disabled={!canIncrease}
                                      title={
                                        !canIncrease && !outOfStock
                                          ? `Tối đa ${d.soLuongTon} (tồn kho)`
                                          : outOfStock
                                            ? "Hết hàng"
                                            : undefined
                                      }
                                      onClick={() =>
                                        patchQty(d.idBienThe, d.soLuong + 1)
                                      }
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </li>
                            );
                          })}
                        </ul>

                        <div className="shop-kiosk-cart-summary">
                          <span>Tổng cộng</span>
                          <strong>
                            {gio.tongTien.toLocaleString("vi-VN")} {gio.tienTe}
                          </strong>
                        </div>

                        {!showCheckoutPanel ? (
                        <div className="shop-kiosk-cart-form">
                              {cartHasOutOfStock(gio.dong) ? (
                                <p className="shop-kiosk-cart-continue-hint is-warn">
                                  Giỏ có món hết hàng — gỡ món đó hoặc xóa giỏ
                                </p>
                              ) : null}
                              {err && tab === "gio" ? (
                                <p className="shop-kiosk-err" role="alert">
                                  {err}
                                </p>
                              ) : null}
                              <button
                                type="button"
                                className="shop-kiosk-submit shop-kiosk-cart-continue"
                                disabled={cartHasOutOfStock(gio.dong)}
                                onClick={() => {
                                  if (cartHasOutOfStock(gio.dong)) {
                                    setErr(
                                      "Có món hết hàng — hãy gỡ khỏi giỏ hoặc xóa giỏ.",
                                    );
                                    return;
                                  }
                                  openHoaDon();
                                }}
                              >
                                Tiếp tục
                              </button>
                              <button
                                type="button"
                                className="shop-kiosk-cart-clear"
                                disabled={busy}
                                onClick={() => void clearCart()}
                              >
                                Xóa giỏ hàng hiện tại
                              </button>
                              <p className="shop-kiosk-cart-continue-hint">
                                Bước tiếp: kiểm tra đơn rồi gửi người bán
                              </p>
                        </div>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
                {hoaDonPanel}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {!dialogOnly ? (
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
            className="shop-kiosk-ticker is-scroll"
            onPointerDown={(e) => {
              e.currentTarget.classList.add("is-paused");
            }}
          >
            <div className="shop-kiosk-ticker-track">
              {tickerItems.map((it, i) =>
                it.anhUrl ? (
                  <button
                    key={`${it.id}-${i}`}
                    type="button"
                    className="shop-kiosk-ticker-thumb-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPreview({
                        src: it.anhUrl!,
                        name: it.tenSanPham,
                      });
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
                    key={`${it.id}-${i}`}
                    className="shop-kiosk-ticker-thumb shop-kiosk-ticker-thumb--empty"
                    aria-hidden
                  />
                ),
              )}
            </div>
          </div>
          <button
            type="button"
            className="shop-kiosk-ticker-label"
            onClick={(e) => {
              e.stopPropagation();
              openCatalog("hang");
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
      ) : null}
      {previewPortal}
      {catalogPortal}
    </>
  );
}

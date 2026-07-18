"use client";

import {
  CalendarClock,
  Check,
  ChevronUp,
  Copy,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  TriangleAlert,
  Upload,
  Zap,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { getNameInitials } from "@/lib/journey/profile";
import { copyShareCardImage } from "@/lib/journey/share-card-export";
import { buildShopMaDon } from "@/lib/shop/ma-don";
import { SHOP_BUYER_TRANSFER_DISCLAIMER } from "@/lib/shop/terms";
import type {
  ShopGio,
  ShopGioDong,
  ShopLoaiDon,
  ShopPostHangItem,
} from "@/lib/shop/types";

import "./shop-kiosk-block.css";

/** Timeout upload biên lai — tránh kẹt "Đang tải…" khi API/CF treo. */
const HOA_DON_UPLOAD_TIMEOUT_MS = 45_000;

function filterHoaDonExportNode(node: HTMLElement): boolean {
  if (node.classList?.contains("shop-kiosk-hoa-don-footer")) return false;
  if (node.classList?.contains("shop-kiosk-hoa-don-close")) return false;
  return true;
}

type Props = {
  milestoneId: string;
  sellerUserId: string | null | undefined;
  viewerProfileId?: string | null;
  /** Logo / avatar người bán — header hóa đơn. */
  sellerAvatarUrl?: string | null;
  /** Tên hiển thị người bán — thay kicker «CINs Shop». */
  sellerName?: string | null;
  sellerSlug?: string | null;
};

type Tab = "hang" | "gio";

type PreviewState = {
  src: string;
  name: string;
};

/** Debounce sync giỏ — gộp nhiều lần bấm ± thành 1 PATCH. */
const QTY_SYNC_MS = 180;

function applyLocalQty(
  prev: ShopGio | null,
  milestoneId: string,
  item: ShopPostHangItem,
  soLuong: number,
): ShopGio {
  const qty = Math.max(0, Math.trunc(soLuong));
  const base: ShopGio = prev ?? {
    id: null,
    idCotMoc: milestoneId,
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
  const tongTien = dong.reduce((sum, d) => sum + d.giaHienThi * d.soLuong, 0);
  return {
    ...base,
    dong,
    tongTien,
    tienTe: dong[0]?.tienTe ?? base.tienTe,
  };
}

function mergePendingOntoGio(
  server: ShopGio,
  milestoneId: string,
  items: ShopPostHangItem[],
  pending: Map<string, number>,
): ShopGio {
  if (pending.size === 0) return server;
  let merged = server;
  for (const [idBienThe, soLuong] of pending) {
    const item = items.find((it) => it.idBienThe === idBienThe);
    if (!item) continue;
    merged = applyLocalQty(merged, milestoneId, item, soLuong);
  }
  return merged;
}

export function ShopKioskBlock({
  milestoneId,
  sellerUserId,
  viewerProfileId,
  sellerAvatarUrl = null,
  sellerName = null,
  sellerSlug = null,
}: Props) {
  const { openChat } = useCinsChat();
  const sellerLabel =
    sellerName?.trim() ||
    (sellerSlug?.trim() ? `@${sellerSlug.trim()}` : null) ||
    "CINs Shop";
  const sellerInitials = getNameInitials(
    sellerName,
    sellerSlug?.trim() || "C",
  );
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
  const [catalogOpen, setCatalogOpen] = useState(false);
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
    if (!preview && !hoaDonOpen && !catalogOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (preview) setPreview(null);
      else if (catalogOpen) setCatalogOpen(false);
      else if (hoaDonOpen) setHoaDonOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [preview, hoaDonOpen, catalogOpen]);

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
      if (json?.gio) {
        setGio(
          mergePendingOntoGio(
            json.gio,
            milestoneId,
            itemsRef.current,
            pendingQtyRef.current,
          ),
        );
      }
    } catch {
      /* ignore */
    }
  }, [milestoneId, viewerProfileId, isOwner]);

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
            cotMocId: milestoneId,
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
            milestoneId,
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
    [milestoneId, loadGio],
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

      const qty = Math.max(0, Math.trunc(soLuong));
      setErr(null);
      qtyEpochRef.current.set(
        idBienThe,
        (qtyEpochRef.current.get(idBienThe) ?? 0) + 1,
      );
      /* Phản hồi tức thì — không chờ mạng. */
      setGio((prev) => applyLocalQty(prev, milestoneId, item, qty));

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
    [viewerProfileId, isOwner, milestoneId, flushQtySync],
  );

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

  /** >5 loại → dropdown; ≤5 giữ chip không viền. */
  const useFilterDropdown =
    categoryOptions.length + (hasUncategorized ? 1 : 0) > 5;

  const filteredItems = useMemo(() => {
    if (filterLoai === "all") return items;
    if (filterLoai === "__none__") {
      return items.filter((it) => !it.phanLoai?.trim());
    }
    return items.filter((it) => it.phanLoai?.trim() === filterLoai);
  }, [items, filterLoai]);

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
    setHoaDonOpen(true);
  }, [buyerLabel]);

  const hoaDonBienLaiOk =
    Boolean(hoaDonAnhUrl) &&
    !hoaDonUploading &&
    !hoaDonAnhUrl?.startsWith("blob:");

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
    if (loaiDon === "mua_ngay" && !hoaDonAccepted) {
      setErr("Bạn cần xác nhận rủi ro chuyển khoản trước khi gửi đơn.");
      if (!hoaDonOpen) openHoaDon();
      return;
    }
    if (loaiDon === "mua_ngay" && !hoaDonBienLaiOk) {
      setHoaDonUploadErr(
        hoaDonUploading
          ? "Đang tải hóa đơn — chờ xong rồi gửi đơn."
          : "Cần tải biên lai chuyển khoản trước khi gửi đơn.",
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
      if (loaiDon === "mua_ngay" && hoaDonAnhUrl) {
        noteParts.push(`Hóa đơn thanh toán: ${hoaDonAnhUrl}`);
      }
      const ghiChuGui = noteParts.filter(Boolean).join("\n") || null;
      const maDonGui =
        loaiDon === "mua_ngay"
          ? (hoaDonMa ?? buildShopMaDon(buyerLabel))
          : buildShopMaDon(buyerLabel);

      const res = await fetch("/api/shop/don", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotMocId: milestoneId,
          loaiDon,
          ghiChu: ghiChuGui,
          maDon: maDonGui,
          nguoiMuaChapNhanRuiRo:
            loaiDon === "mua_ngay" ? hoaDonAccepted : undefined,
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
        idCotMoc: milestoneId,
        dong: [],
        tongTien: 0,
        tienTe: gio.tienTe,
      });
      setGhiChu("");
      const bienLaiUrl =
        loaiDon === "mua_ngay" && hoaDonAnhUrl && !hoaDonAnhUrl.startsWith("blob:")
          ? hoaDonAnhUrl
          : null;
      const bienLaiId =
        loaiDon === "mua_ngay" ? hoaDonAnhId?.trim() || null : null;
      setHoaDonAnhUrl(null);
      setHoaDonAnhId(null);
      setHoaDonOpen(false);
      setHoaDonAccepted(false);
      setHoaDonMa(null);
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
    milestoneId,
    loaiDon,
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
  ]);

  const uploadHoaDonThanhToan = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!isAllowedUploadImageFile(file)) {
      setHoaDonUploadErr("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setHoaDonUploadErr("Ảnh quá lớn (giới hạn 8MB).");
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

  if (loading) return null;
  if (items.length === 0) return null;

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

  const hoaDonPortal =
    portalReady && hoaDonOpen && gio && gio.dong.length > 0
      ? createPortal(
          <div
            className="shop-kiosk-hoa-don"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-kiosk-hoa-don-title"
            onClick={(e) => {
              e.stopPropagation();
              setHoaDonOpen(false);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              ref={hoaDonPanelRef}
              className="shop-kiosk-hoa-don-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="shop-kiosk-hoa-don-hdr">
                <div>
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
                  <h3 id="shop-kiosk-hoa-don-title">Hóa đơn xác nhận</h3>
                </div>
                <button
                  type="button"
                  className="shop-kiosk-hoa-don-close"
                  aria-label="Đóng"
                  onClick={() => setHoaDonOpen(false)}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </header>

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
                              <span className="shop-kiosk-hoa-don-item-unit">
                                {d.giaHienThi.toLocaleString("vi-VN")} {d.tienTe}
                                /sp
                              </span>
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
                  CINs không trung gian tiền — hai bên tự thỏa thuận thanh toán.
                </p>
              </div>

              <label className="shop-kiosk-hoa-don-note-field">
                <span>Ghi chú cho người bán</span>
                <textarea
                  rows={2}
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  placeholder="VD: đã chuyển khoản lúc 17:30, mã GD…"
                />
              </label>

              <div className="shop-kiosk-hoa-don-upload">
                <span className="shop-kiosk-hoa-don-upload-label">
                  Tải hóa đơn thanh toán
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
                    <img src={hoaDonAnhUrl} alt="Hóa đơn thanh toán" />
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
                        Chọn ảnh hóa đơn / biên lai
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

              <div className="shop-kiosk-hoa-don-footer">
                <div className="shop-kiosk-hoa-don-actions">
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
                        Sao chép ảnh
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="shop-kiosk-submit shop-kiosk-hoa-don-submit"
                    disabled={busy || !hoaDonAccepted || !hoaDonBienLaiOk}
                    onClick={() => void submitOrder()}
                  >
                    {busy ? (
                      <Loader2 size={16} className="shop-spin" />
                    ) : (
                      "Gửi đơn cho người bán"
                    )}
                  </button>
                </div>
              </div>
            </div>
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
                  <p className="shop-kiosk-catalog-kicker">{sellerLabel}</p>
                  <h3 id="shop-kiosk-catalog-title">Tất cả hàng bán</h3>
                </div>
                <div className="shop-kiosk-catalog-hdr-actions">
                  {!isOwner && cartCount > 0 ? (
                    <button
                      type="button"
                      className="shop-kiosk-catalog-cart-btn"
                      onClick={() => {
                        setCatalogOpen(false);
                        setExpanded(true);
                        setTab("gio");
                      }}
                    >
                      <ShoppingBag size={15} strokeWidth={2} aria-hidden />
                      Giỏ ({cartCount})
                    </button>
                  ) : null}
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
                          const qty = qtyInCart(it.idBienThe);
                          return (
                            <li key={it.id} className="shop-kiosk-catalog-card">
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
                                </button>
                              ) : (
                                <div className="shop-kiosk-catalog-thumb is-empty" />
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
                                  <span>
                                    {it.hetHang || it.soLuongTon < 0
                                      ? "Đợi restock"
                                      : `Còn ${it.soLuongTon}`}
                                  </span>
                                </div>
                                {!isOwner ? (
                                  <div className="shop-kiosk-qty shop-kiosk-catalog-qty">
                                    <button
                                      type="button"
                                      aria-label="Bớt"
                                      disabled={qty <= 0}
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
                                      disabled={!viewerProfileId}
                                      onClick={() =>
                                        patchQty(it.idBienThe, qty + 1)
                                      }
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                ) : null}
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
        {hoaDonPortal}
        {catalogPortal}
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
            <span className="shop-kiosk-tab-msg-icon" aria-hidden>
              <MessageCircle size={16} strokeWidth={2} />
            </span>
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
            {items.length > 0 ? (
              <div className="shop-kiosk-toolbar">
                {categoryOptions.length > 0 || hasUncategorized ? (
                  useFilterDropdown ? (
                    <label className="shop-kiosk-filters shop-kiosk-filters--select">
                      <span className="shop-kiosk-filter-label">Loại hàng</span>
                      <select
                        className="shop-kiosk-filter-select"
                        value={filterLoai}
                        aria-label="Lọc theo loại hàng"
                        onChange={(e) => setFilterLoai(e.target.value)}
                      >
                        <option value="all">Tất cả</option>
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        {hasUncategorized ? (
                          <option value="__none__">Chưa phân loại</option>
                        ) : null}
                      </select>
                    </label>
                  ) : (
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
                  )
                ) : (
                  <span className="shop-kiosk-toolbar-spacer" />
                )}
                <button
                  type="button"
                  className="shop-kiosk-view-all"
                  onClick={() => setCatalogOpen(true)}
                >
                  <LayoutGrid size={14} strokeWidth={2.2} aria-hidden />
                  Xem tất cả
                </button>
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
                        <div className="shop-kiosk-meta-foot">
                          <span className="shop-kiosk-price">
                            {it.giaHienThi.toLocaleString("vi-VN")} {it.tienTe}
                          </span>
                          <span className="shop-kiosk-stock">
                            {it.hetHang || it.soLuongTon < 0
                              ? "Đợi restock"
                              : `Còn ${it.soLuongTon}`}
                          </span>
                        </div>
                      </div>
                      {!isOwner ? (
                        <div className="shop-kiosk-qty">
                          <button
                            type="button"
                            aria-label="Bớt"
                            disabled={qty <= 0}
                            onClick={() => patchQty(it.idBienThe, qty - 1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            aria-label="Thêm"
                            disabled={!viewerProfileId}
                            onClick={() => patchQty(it.idBienThe, qty + 1)}
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
                <ul className="shop-kiosk-cart-lines" aria-label="Giỏ hàng">
                  {gio.dong.map((d) => (
                    <li key={d.idBienThe} className="shop-kiosk-cart-line">
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
                            {(d.giaHienThi * d.soLuong).toLocaleString("vi-VN")}{" "}
                            {d.tienTe}
                          </div>
                        </div>
                        <div className="shop-kiosk-cart-line-foot">
                          <span className="shop-kiosk-cart-unit">
                            {d.giaHienThi.toLocaleString("vi-VN")} {d.tienTe}
                            /sp
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
                  ))}
                </ul>

                <div className="shop-kiosk-cart-summary">
                  <span>Tổng cộng</span>
                  <strong>
                    {gio.tongTien.toLocaleString("vi-VN")} {gio.tienTe}
                  </strong>
                </div>

                <div className="shop-kiosk-cart-form">
                  <div
                    className="shop-kiosk-loai-don"
                    role="radiogroup"
                    aria-label="Loại đơn"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={loaiDon === "mua_ngay"}
                      className={`shop-kiosk-loai-don-opt is-mua${loaiDon === "mua_ngay" ? " is-active" : ""}`}
                      onClick={() => {
                        setLoaiDon("mua_ngay");
                        if (gio?.dong.length) {
                          setHoaDonCopied(false);
                          openHoaDon();
                        }
                      }}
                    >
                      <span className="shop-kiosk-loai-don-icon" aria-hidden>
                        <Zap size={18} strokeWidth={2} />
                      </span>
                      <span className="shop-kiosk-loai-don-text">
                        <span className="shop-kiosk-loai-don-title">
                          Mua ngay
                        </span>
                        <span className="shop-kiosk-loai-don-desc">
                          Thanh toán luôn
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={loaiDon === "dat_truoc_nhan_su_kien"}
                      className={`shop-kiosk-loai-don-opt is-dat${loaiDon === "dat_truoc_nhan_su_kien" ? " is-active" : ""}`}
                      onClick={() => setLoaiDon("dat_truoc_nhan_su_kien")}
                    >
                      <span className="shop-kiosk-loai-don-icon" aria-hidden>
                        <CalendarClock size={18} strokeWidth={2} />
                      </span>
                      <span className="shop-kiosk-loai-don-text">
                        <span className="shop-kiosk-loai-don-title">
                          Đặt trước
                        </span>
                        <span className="shop-kiosk-loai-don-desc">
                          Thanh toán khi nhận hàng
                        </span>
                      </span>
                    </button>
                  </div>

                  {loaiDon === "dat_truoc_nhan_su_kien" ? (
                    <>
                      <label className="shop-kiosk-field">
                        <span>Ghi chú cho người bán</span>
                        <textarea
                          rows={2}
                          value={ghiChu}
                          onChange={(e) => setGhiChu(e.target.value)}
                          placeholder="VD: nhận tại quầy B12, ngày 2, màu xanh…"
                        />
                      </label>
                      <div className="shop-kiosk-cart-footer">
                        {err ? (
                          <p className="shop-kiosk-err" role="alert">
                            {err}
                          </p>
                        ) : null}
                        <p className="shop-kiosk-disclaimer">
                          CINs không trung gian tiền — hai bên tự thỏa thuận
                          thanh toán.
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
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {previewPortal}
      {hoaDonPortal}
      {catalogPortal}
    </>
  );
}

"use client";

import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  ImagePlus,
  Loader2,
  Minus,
  Package,
  PenLine,
  Plus,
  Send,
  Settings2,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { JourneyShopGuestActions } from "@/components/journey/JourneyShopGuestActions";
import { JourneyShopSfHero } from "@/components/journey/JourneyShopSfHero";
import { useJourneyViewOptional } from "@/components/journey/JourneyViewContext";
import {
  GIO_CHUNG_CHANGED_EVENT,
} from "@/components/shop/ShopGioChungButton";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import {
  fetchShopCuaHangClient,
  prefetchBanHangClientStatus,
} from "@/lib/shop/client-fetch-cache";
import { getNameInitials } from "@/lib/journey/profile";
import { shopLoaiHref, shopPublicHref, shopSlugFromTen } from "@/lib/shop/cua-hang-href";
import { parseShopNhomMoTa } from "@/lib/shop/nhom-mo-ta";
import { isShopTamDongActive } from "@/lib/shop/tam-dong";
import { ShopTamDongOverlay } from "@/components/shop/ShopTamDongOverlay";
import type {
  ShopCuaHang,
  ShopNhomDanhGia,
  ShopStorefrontMau,
  ShopStorefrontNhomCard,
  ShopStorefrontNhomDetail,
} from "@/lib/shop/types";
import {
  resolveShopNhanPhanLoai,
  resolveShopNhanPhanLoai2,
  SHOP_NHOM_DANH_GIA_ANH_MAX,
  SHOP_NHOM_DANH_GIA_NOI_DUNG_MAX,
  SHOP_STOREFRONT_KHAC_SLUG,
} from "@/lib/shop/types";

import "./journey-shop-view.css";
import "@/components/shop/shop-dashboard.css";

type Props = {
  ownerSlug: string;
  nhomId: string;
  ownerId?: string;
  ownerName?: string;
  isOwner?: boolean;
  viewerProfileId?: string | null;
  ownerAvatarUrl?: string | null;
};

const FILTER_KHAC = "__khac";

type FilterOption = { key: string; label: string };

function buildMauFilterOptions(
  mau: ShopStorefrontMau[],
  getValue: (m: ShopStorefrontMau) => string | null | undefined,
  khacLabel: string,
): FilterOption[] {
  const named = new Set<string>();
  let hasOther = false;
  for (const m of mau) {
    const t = getValue(m)?.trim();
    if (t) named.add(t);
    else hasOther = true;
  }
  const options: FilterOption[] = [];
  for (const label of [...named].sort((a, b) =>
    a.localeCompare(b, "vi", { sensitivity: "base" }),
  )) {
    options.push({ key: label, label });
  }
  if (hasOther && named.size > 0) {
    options.push({ key: FILTER_KHAC, label: khacLabel });
  }
  return options;
}

function applyMauMultiFilter(
  mau: ShopStorefrontMau[],
  selected: string[],
  getValue: (m: ShopStorefrontMau) => string | null | undefined,
): ShopStorefrontMau[] {
  if (selected.length === 0) return mau;
  const set = new Set(selected);
  return mau.filter((m) => {
    const t = getValue(m)?.trim() || "";
    if (!t) return set.has(FILTER_KHAC);
    return set.has(t);
  });
}

function filterTriggerLabel(selected: string[], emptyLabel: string): string {
  if (selected.length === 0) return "Tất cả";
  const labels = selected.map((k) =>
    k === FILTER_KHAC ? emptyLabel : k,
  );
  if (labels.length <= 2) return labels.join(", ");
  return `Đã chọn ${labels.length}`;
}

function LoaiFilterDropdown({
  axisLabel,
  options,
  selected,
  onToggle,
  onClear,
}: {
  axisLabel: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isFiltered = selected.length > 0;
  const valueLabel = filterTriggerLabel(selected, "Khác");

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(`[data-loai-filter="${axisLabel}"]`)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, axisLabel]);

  return (
    <div className="j-shop-loai-dd" data-loai-filter={axisLabel}>
      <button
        type="button"
        className={`j-shop-loai-dd-trigger${isFiltered ? " is-active" : ""}${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Lọc theo ${axisLabel}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="j-shop-loai-dd-axis">{axisLabel}</span>
        <span className="j-shop-loai-dd-value">{valueLabel}</span>
        {isFiltered ? (
          <span className="j-shop-loai-dd-count">{selected.length}</span>
        ) : null}
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
      </button>
      {open ? (
        <div
          className="j-shop-loai-dd-panel"
          role="listbox"
          aria-multiselectable
          aria-label={axisLabel}
        >
          <label className="j-shop-loai-dd-opt">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={onClear}
            />
            <span>Tất cả</span>
          </label>
          {options.map((opt) => (
            <label key={opt.key} className="j-shop-loai-dd-opt">
              <input
                type="checkbox"
                checked={selected.includes(opt.key)}
                onChange={() => onToggle(opt.key)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function warmPrefetchBanHang() {
  prefetchBanHangClientStatus();
}

function formatGia(gia: number, tienTe: string): string {
  const n = Number.isFinite(gia) ? gia : 0;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: tienTe === "VND" ? "VND" : tienTe || "VND",
      maximumFractionDigits: tienTe === "VND" ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} ${tienTe || "VND"}`;
  }
}

function Stars({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <span className="j-shop-loai-stars" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? "is-on" : ""}
          disabled={!onChange}
          aria-label={`${n} sao`}
          onClick={() => onChange?.(n)}
        >
          <Star
            size={size}
            strokeWidth={2}
            fill={n <= value ? "currentColor" : "none"}
            aria-hidden
          />
        </button>
      ))}
    </span>
  );
}

export function JourneyShopLoaiClient({
  ownerSlug,
  nhomId,
  ownerId: ownerIdProp,
  ownerName: ownerNameProp,
  isOwner: isOwnerProp,
  viewerProfileId: viewerProfileIdProp = null,
  ownerAvatarUrl = null,
}: Props) {
  const { openAuthModal } = useAuthGate();
  const setShopSlugCtx = useJourneyViewOptional()?.setShopSlug;
  const searchParams = useSearchParams();
  const mauFromQuery = searchParams.get("mau")?.trim() || null;
  const [detail, setDetail] = useState<ShopStorefrontNhomDetail | null>(null);
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(
    () => viewerProfileIdProp ?? null,
  );
  const [isOwner, setIsOwner] = useState(() => isOwnerProp === true);

  const [selectedSpId, setSelectedSpId] = useState<string | null>(null);
  const [selectedBtId, setSelectedBtId] = useState<string | null>(null);
  const [filterLoai, setFilterLoai] = useState<string[]>([]);
  const [filterLoai2, setFilterLoai2] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartErr, setCartErr] = useState<string | null>(null);

  const [otherNhom, setOtherNhom] = useState<ShopStorefrontNhomCard[]>([]);
  const moreTrackRef = useRef<HTMLDivElement>(null);
  const moreDragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    /** Đã vuốt ngang → kéo thật (chặn click card). */
    active: boolean;
  } | null>(null);
  const moreSuppressClickRef = useRef(false);
  const [moreDragging, setMoreDragging] = useState(false);
  const [reviews, setReviews] = useState<ShopNhomDanhGia[]>([]);
  const [diemTb, setDiemTb] = useState<number | null>(null);
  const [tongDg, setTongDg] = useState(0);
  const [reviewBoDem, setReviewBoDem] = useState<{
    tong: number;
    theoDiem: Record<1 | 2 | 3 | 4 | 5, number>;
    coBinhLuan: number;
    coAnh: number;
  }>({
    tong: 0,
    theoDiem: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    coBinhLuan: 0,
    coAnh: 0,
  });
  const [canReview, setCanReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "media" | "comment" | "1" | "2" | "3" | "4" | "5"
  >("all");
  const [reviewDiem, setReviewDiem] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewAnh, setReviewAnh] = useState<
    Array<{ id: string; url: string }>
  >([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const reviewFileRef = useRef<HTMLInputElement>(null);

  const shopSlug = shopSlugFromTen(shop?.ten, ownerSlug);
  const shopHref = shopPublicHref(ownerSlug, shopSlug);

  useEffect(() => {
    setShopSlugCtx?.(shopSlug);
  }, [setShopSlugCtx, shopSlug]);

  /** Canh giữa hàng "Loại khác" để 2 mép L & R crop → gợi ý kéo được. */
  const centerMore = useCallback(() => {
    const el = moreTrackRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, []);

  useLayoutEffect(() => {
    centerMore();
  }, [otherNhom, centerMore]);

  const onMorePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      /* Touch: cuộn ngang tự nhiên. Chuột: kéo bằng JS. */
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return;
      const el = moreTrackRef.current;
      if (!el) return;
      moreDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startScroll: el.scrollLeft,
        active: false,
      };
    },
    [],
  );

  const onMorePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = moreDragRef.current;
      const el = moreTrackRef.current;
      if (!drag || drag.pointerId !== e.pointerId || !el) return;
      const dx = e.clientX - drag.startX;

      if (!drag.active) {
        if (Math.abs(dx) < 3) return;
        drag.active = true;
        setMoreDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      el.scrollLeft = drag.startScroll - dx;
      e.preventDefault();
    },
    [],
  );

  const finishMoreDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = moreDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      moreDragRef.current = null;
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (drag.active) moreSuppressClickRef.current = true;
      setMoreDragging(false);
    },
    [],
  );

  const onMoreLostPointerCapture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = moreDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      finishMoreDrag(e);
    },
    [finishMoreDrag],
  );

  const onMoreClickCapture = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!moreSuppressClickRef.current) return;
      moreSuppressClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const loadSession = useCallback(async () => {
    if (viewerProfileIdProp != null || isOwnerProp != null) {
      setViewerId(viewerProfileIdProp ?? null);
      return;
    }
    try {
      const res = await fetch("/api/auth/session-profile", { cache: "no-store" });
      if (!res.ok) {
        setViewerId(null);
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        profile?: { id?: string } | null;
      } | null;
      setViewerId(json?.profile?.id ?? null);
    } catch {
      setViewerId(null);
    }
  }, [viewerProfileIdProp, isOwnerProp]);

  const loadShop = useCallback(async () => {
    try {
      const data = await fetchShopCuaHangClient({ slug: ownerSlug });
      setShop(data.shop);
      if (typeof data.isOwner === "boolean" && isOwnerProp == null) {
        setIsOwner(data.isOwner);
      }
    } catch {
      setShop(null);
    }
  }, [ownerSlug, isOwnerProp]);

  const loadOtherNhom = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/shop/cua-hang/mat-hang?slug=${encodeURIComponent(ownerSlug)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        nhomCards?: ShopStorefrontNhomCard[];
      } | null;
      if (!res.ok) {
        setOtherNhom([]);
        return;
      }
      setOtherNhom(
        (json?.nhomCards ?? []).filter((c) => c.id !== nhomId),
      );
    } catch {
      setOtherNhom([]);
    }
  }, [ownerSlug, nhomId]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/shop/cua-hang/nhom/${encodeURIComponent(nhomId)}?slug=${encodeURIComponent(ownerSlug)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        detail?: ShopStorefrontNhomDetail;
        error?: string;
      } | null;
      if (!res.ok || !json?.detail) {
        setDetail(null);
        setErr(json?.error ?? "Không tải được loại hàng.");
        return;
      }
      setDetail(json.detail);
      const fromQuery = mauFromQuery
        ? json.detail.mau.find((m) => m.sanPhamId === mauFromQuery)
        : null;
      /* Chỉ auto-chọn khi vào từ search (?mau=). Không pick → hiện giá mặc định loại. */
      if (fromQuery) {
        setSelectedSpId(fromQuery.sanPhamId);
        const bt =
          fromQuery.bienThe.find((b) => !b.hetHang && b.giaHienThi != null) ??
          fromQuery.bienThe[0] ??
          null;
        setSelectedBtId(bt?.id ?? null);
      } else {
        setSelectedSpId(null);
        setSelectedBtId(null);
      }
    } catch {
      setErr("Không tải được loại hàng.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [nhomId, ownerSlug, mauFromQuery]);

  useEffect(() => {
    if (isOwnerProp != null) {
      setIsOwner(isOwnerProp);
      return;
    }
    setIsOwner(Boolean(viewerId && detail && viewerId === detail.sellerId));
  }, [viewerId, detail, isOwnerProp]);

  useEffect(() => {
    setViewerId(viewerProfileIdProp ?? null);
  }, [viewerProfileIdProp]);

  const loadReviews = useCallback(async () => {
    if (nhomId === SHOP_STOREFRONT_KHAC_SLUG) {
      setReviews([]);
      setCanReview(false);
      setDiemTb(null);
      setTongDg(0);
      setReviewBoDem({
        tong: 0,
        theoDiem: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        coBinhLuan: 0,
        coAnh: 0,
      });
      return;
    }
    try {
      const params = new URLSearchParams();
      if (reviewFilter === "media") params.set("withMedia", "1");
      else if (reviewFilter === "comment") params.set("withComment", "1");
      else if (
        reviewFilter === "1" ||
        reviewFilter === "2" ||
        reviewFilter === "3" ||
        reviewFilter === "4" ||
        reviewFilter === "5"
      ) {
        params.set("diem", reviewFilter);
      }
      const q = params.toString() ? `?${params}` : "";
      const res = await fetch(
        `/api/shop/nhom/${encodeURIComponent(nhomId)}/danh-gia${q}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        items?: ShopNhomDanhGia[];
        diemTrungBinh?: number | null;
        tong?: number;
        boDem?: {
          tong: number;
          theoDiem: Record<1 | 2 | 3 | 4 | 5, number>;
          coBinhLuan: number;
          coAnh: number;
        };
        canReview?: boolean;
      } | null;
      if (!res.ok) return;
      setReviews(json?.items ?? []);
      setDiemTb(json?.diemTrungBinh ?? null);
      setTongDg(json?.tong ?? 0);
      if (json?.boDem) setReviewBoDem(json.boDem);
      setCanReview(json?.canReview === true);
    } catch {
      /* ignore */
    }
  }, [nhomId, reviewFilter]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    void loadOtherNhom();
  }, [loadOtherNhom]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const selectedMau: ShopStorefrontMau | null = useMemo(() => {
    if (!detail || !selectedSpId) return null;
    return detail.mau.find((m) => m.sanPhamId === selectedSpId) ?? null;
  }, [detail, selectedSpId]);

  const selectedBt = useMemo(() => {
    if (!selectedMau || !selectedBtId) return null;
    return selectedMau.bienThe.find((b) => b.id === selectedBtId) ?? null;
  }, [selectedMau, selectedBtId]);

  const nhanPhanLoai = resolveShopNhanPhanLoai(shop);
  const nhanPhanLoai2 = resolveShopNhanPhanLoai2(shop);

  const filterOptions1 = useMemo(
    () =>
      buildMauFilterOptions(
        detail?.mau ?? [],
        (m) => m.phanLoai,
        `Chưa có ${nhanPhanLoai.toLowerCase()}`,
      ),
    [detail, nhanPhanLoai],
  );
  const filterOptions2 = useMemo(
    () =>
      buildMauFilterOptions(
        detail?.mau ?? [],
        (m) => m.phanLoai2,
        `Chưa có ${nhanPhanLoai2.toLowerCase()}`,
      ),
    [detail, nhanPhanLoai2],
  );
  /* Hiện khi có ≥ 2 giá trị thẻ (hoặc 1 giá trị + «chưa gán»). */
  const showFilter1 = filterOptions1.length >= 2;
  const showFilter2 = filterOptions2.length >= 2;
  const showFilters = showFilter1 || showFilter2;

  const filteredMau = useMemo(() => {
    const list = detail?.mau ?? [];
    const after1 = applyMauMultiFilter(list, filterLoai, (m) => m.phanLoai);
    return applyMauMultiFilter(after1, filterLoai2, (m) => m.phanLoai2);
  }, [detail, filterLoai, filterLoai2]);

  const toggleFilter = useCallback((truc: 1 | 2, key: string) => {
    const setFilter = truc === 1 ? setFilterLoai : setFilterLoai2;
    setFilter((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return [...prev, key];
    });
  }, []);

  useEffect(() => {
    setFilterLoai([]);
    setFilterLoai2([]);
  }, [nhomId]);

  useEffect(() => {
    if (!selectedSpId) return;
    if (filteredMau.some((m) => m.sanPhamId === selectedSpId)) return;
    setSelectedSpId(null);
    setSelectedBtId(null);
    setQty(1);
    setCartErr(null);
  }, [filteredMau, selectedSpId]);

  const loaiGiaLabel = useMemo(() => {
    if (!detail) return null;
    if (selectedBt?.giaHienThi != null) {
      return {
        kind: "mau" as const,
        gia: selectedBt.giaHienThi,
        giaGoc: selectedBt.giaGoc,
        tienTe: selectedBt.tienTe,
      };
    }
    if (detail.giaMacDinh != null) {
      return {
        kind: "loai" as const,
        gia: detail.giaMacDinh,
        giaGoc: null as number | null,
        tienTe: detail.tienTe,
        range: false,
      };
    }
    if (detail.giaTu != null) {
      const range =
        detail.giaDen != null && detail.giaDen !== detail.giaTu;
      return {
        kind: "loai" as const,
        gia: detail.giaTu,
        giaGoc: null as number | null,
        tienTe: detail.tienTe,
        range,
        giaDen: detail.giaDen,
      };
    }
    return null;
  }, [detail, selectedBt]);

  /** Có chọn mẫu → chỉ ảnh mẫu/biến thể; không chọn → ảnh loại + ảnh/video phụ. */
  const galleryItems = useMemo(() => {
    type Item =
      | { kind: "image"; key: string; url: string }
      | {
          kind: "video";
          key: string;
          videoId: string;
          embedUrl: string;
          thumbUrl: string | null;
        };
    const items: Item[] = [];
    const seen = new Set<string>();
    const pushImage = (u: string | null | undefined) => {
      const t = u?.trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      items.push({ kind: "image", key: t, url: t });
    };
    if (selectedSpId) {
      pushImage(selectedBt?.anhUrl);
      pushImage(selectedMau?.anhUrl);
      /* Fallback nếu mẫu chưa có ảnh riêng. */
      if (items.length === 0) pushImage(detail?.anhUrl);
      return items;
    }
    pushImage(detail?.anhUrl);
    if (detail?.videoPhuId && detail.videoPhuEmbedUrl) {
      items.push({
        kind: "video",
        key: `v-${detail.videoPhuId}`,
        videoId: detail.videoPhuId,
        embedUrl: detail.videoPhuEmbedUrl,
        thumbUrl: detail.videoPhuThumbUrl,
      });
    }
    for (const u of detail?.anhPhuUrls ?? []) pushImage(u);
    return items;
  }, [detail, selectedSpId, selectedMau, selectedBt]);

  const [galleryIdx, setGalleryIdx] = useState(0);
  const gallerySwipeRef = useRef<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  /** Tạm dừng auto-advance sau swipe / chọn thumb (ms epoch). */
  const galleryAutoPauseUntilRef = useRef(0);
  const galleryHoverRef = useRef(false);

  const pauseGalleryAuto = useCallback((ms = 8000) => {
    galleryAutoPauseUntilRef.current = Date.now() + ms;
  }, []);

  useEffect(() => {
    setGalleryIdx(0);
    pauseGalleryAuto(6000);
  }, [nhomId, selectedSpId, pauseGalleryAuto]);

  const safeGalleryIdx = Math.min(
    galleryIdx,
    Math.max(galleryItems.length - 1, 0),
  );
  const activeGallery = galleryItems[safeGalleryIdx] ?? null;
  const galleryUrl =
    activeGallery?.kind === "image" ? activeGallery.url : null;
  const showOverlay =
    Boolean(detail?.overlayAnhUrl) &&
    Boolean(detail?.anhUrl) &&
    galleryUrl === detail?.anhUrl;

  /* Mỗi 4s chuyển ảnh; dừng khi hover / reduced-motion / user vừa thao tác. */
  useEffect(() => {
    if (galleryItems.length <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (galleryHoverRef.current) return;
      if (Date.now() < galleryAutoPauseUntilRef.current) return;
      setGalleryIdx((i) => {
        const len = galleryItems.length;
        if (len <= 1) return i;
        let next = (Math.min(i, len - 1) + 1) % len;
        /* Bỏ qua video trong vòng auto — user chọn bằng thumb/dot. */
        for (let step = 0; step < len; step++) {
          const item = galleryItems[next];
          if (item?.kind !== "video") break;
          next = (next + 1) % len;
        }
        return next;
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, [galleryItems]);

  const clearMauSelection = useCallback(() => {
    setSelectedSpId(null);
    setSelectedBtId(null);
    setQty(1);
    setCartErr(null);
    setGalleryIdx(0);
  }, []);

  const onGalleryPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (galleryItems.length <= 1) return;
      if (activeGallery?.kind === "video") return;
      if ((e.target as Element | null)?.closest?.(".j-shop-loai-gallery-dot")) {
        return;
      }
      gallerySwipeRef.current = {
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [galleryItems.length, activeGallery?.kind],
  );

  const onGalleryPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = gallerySwipeRef.current;
      gallerySwipeRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!start || start.id !== e.pointerId) return;
      if (galleryItems.length <= 1) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return;
      pauseGalleryAuto();
      if (dx < 0) {
        setGalleryIdx((i) => Math.min(galleryItems.length - 1, i + 1));
      } else {
        setGalleryIdx((i) => Math.max(0, i - 1));
      }
    },
    [galleryItems.length, pauseGalleryAuto],
  );

  const onGalleryPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      gallerySwipeRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  const selectGalleryIdx = useCallback(
    (i: number) => {
      pauseGalleryAuto();
      setGalleryIdx(i);
    },
    [pauseGalleryAuto],
  );

  const onLoaiMainPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedSpId) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      /* Giữ chọn khi thao tác chip / số lượng / thêm giỏ / swipe gallery. */
      if (
        t.closest(
          ".j-shop-loai-chips, .j-shop-loai-qty-row, .j-shop-loai-add, .j-shop-loai-buy-bar, .j-shop-loai-filters, .j-shop-loai-gallery, .j-shop-loai-gallery-thumbs",
        )
      ) {
        return;
      }
      clearMauSelection();
    },
    [selectedSpId, clearMauSelection],
  );

  const canShop = !isOwner && !isShopTamDongActive(shop);
  const maxQty = selectedBt?.soLuongTon ?? 0;
  const canAdd =
    canShop &&
    detail != null &&
    selectedBt != null &&
    selectedBt.giaHienThi != null &&
    !selectedBt.hetHang &&
    maxQty > 0;

  const addToCart = useCallback(async () => {
    if (!selectedBt) return;
    if (!viewerId) {
      openAuthModal("Đăng nhập để thêm vào giỏ.");
      return;
    }
    if (!canAdd) {
      setCartErr(
        selectedBt.giaHienThi == null
          ? "Mẫu này chưa có giá."
          : "Hết hàng.",
      );
      return;
    }
    const delta = Math.max(1, qty);
    setCartBusy(true);
    setCartErr(null);
    try {
      const res = await fetch("/api/shop/gio-chung", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idBienThe: selectedBt.id, delta }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setCartErr(json?.error ?? "Không thêm vào giỏ.");
        return;
      }
      window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
    } catch {
      setCartErr("Không thêm vào giỏ.");
    } finally {
      setCartBusy(false);
    }
  }, [selectedBt, viewerId, canAdd, qty, openAuthModal]);

  async function uploadReviewImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/post-image/upload", {
      method: "POST",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as {
      imageId?: string;
      url?: string;
      error?: string;
    } | null;
    if (!res.ok || !json?.imageId || !json.url) {
      throw new Error(json?.error ?? "Upload thất bại.");
    }
    return { id: json.imageId, url: json.url };
  }

  async function addReviewImages(files: File[]) {
    if (files.length === 0) return;
    setReviewErr(null);
    const room = SHOP_NHOM_DANH_GIA_ANH_MAX - reviewAnh.length;
    if (room <= 0) {
      setReviewErr(`Tối đa ${SHOP_NHOM_DANH_GIA_ANH_MAX} ảnh.`);
      return;
    }
    const batch = files.slice(0, room);
    const uploaded: Array<{ id: string; url: string }> = [];
    try {
      for (const file of batch) {
        uploaded.push(await uploadReviewImage(file));
      }
      if (uploaded.length > 0) {
        setReviewAnh((prev) =>
          [...prev, ...uploaded].slice(0, SHOP_NHOM_DANH_GIA_ANH_MAX),
        );
      }
    } catch (ex) {
      if (uploaded.length > 0) {
        setReviewAnh((prev) =>
          [...prev, ...uploaded].slice(0, SHOP_NHOM_DANH_GIA_ANH_MAX),
        );
      }
      setReviewErr(
        ex instanceof Error ? ex.message : "Upload thất bại.",
      );
    }
  }

  async function submitReview() {
    if (!canReview) return;
    if (!viewerId) {
      openAuthModal("Đăng nhập để đánh giá.");
      return;
    }
    setReviewBusy(true);
    setReviewErr(null);
    try {
      const res = await fetch(
        `/api/shop/nhom/${encodeURIComponent(nhomId)}/danh-gia`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diem: reviewDiem,
            noiDung: reviewText.trim() || null,
            anhIds: reviewAnh.map((a) => a.id),
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setReviewErr(json?.error ?? "Không gửi được đánh giá.");
        return;
      }
      setReviewText("");
      setReviewAnh([]);
      setReviewDiem(5);
      await loadReviews();
    } catch {
      setReviewErr("Không gửi được đánh giá.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function deleteMyReview(id: string) {
    setReviewBusy(true);
    try {
      await fetch(
        `/api/shop/nhom/${encodeURIComponent(nhomId)}/danh-gia?danhGiaId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      await loadReviews();
    } finally {
      setReviewBusy(false);
    }
  }

  const ownerId = ownerIdProp ?? detail?.sellerId ?? shop?.idNguoiDung ?? "";
  const ownerName = ownerNameProp?.trim() || ownerSlug;
  const shopLabel = shop?.ten?.trim() || `${ownerName} — cửa hàng`;
  const initials = getNameInitials(shop?.ten || ownerName, ownerSlug);
  const shopReady = shop?.sanSangNhanDon === true;
  const sectionActions = isOwner ? (
    <nav className="j-shop-sf-actions" aria-label="Quản lý bán hàng">
      <Link
        href="/ban-hang/cua-hang"
        className="j-shop-action-btn"
        aria-label="Quản lý cửa hàng"
        onMouseEnter={warmPrefetchBanHang}
        onFocus={warmPrefetchBanHang}
      >
        <Settings2 size={13} aria-hidden />
        <span className="j-shop-action-btn-label">Quản lý cửa hàng</span>
      </Link>
      {shopReady ? (
        <>
          <Link
            href="/ban-hang/kho"
            className="j-shop-action-btn"
            aria-label="Kho hàng"
            onMouseEnter={warmPrefetchBanHang}
            onFocus={warmPrefetchBanHang}
          >
            <Package size={13} aria-hidden />
            <span className="j-shop-action-btn-label">Kho hàng</span>
          </Link>
          <Link
            href="/ban-hang/don"
            className="j-shop-action-btn"
            aria-label="Đơn hàng"
            onMouseEnter={warmPrefetchBanHang}
            onFocus={warmPrefetchBanHang}
          >
            <ClipboardList size={13} aria-hidden />
            <span className="j-shop-action-btn-label">Đơn hàng</span>
          </Link>
        </>
      ) : (
        <span
          className="j-shop-action-btn is-disabled"
          aria-disabled="true"
          aria-label="Kho (cần STK)"
          title="Kho (cần STK)"
        >
          <Package size={13} aria-hidden />
          <span className="j-shop-action-btn-label">Kho (cần STK)</span>
        </span>
      )}
    </nav>
  ) : ownerId ? (
    <JourneyShopGuestActions
      ownerId={ownerId}
      ownerSlug={ownerSlug}
      shopSlug={shopSlug}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl ?? shop?.avatarUrl ?? null}
      viewerProfileId={viewerId}
      shareTitle={detail?.nhan?.trim() || shopLabel}
    />
  ) : null;

  const shopChrome = (
    <>
      <JourneyShopSfHero
        shopName={shopLabel}
        shopMoTa={shop?.moTa ?? null}
        shopAvatarUrl={shop?.avatarUrl ?? null}
        shopCoverUrl={shop?.coverUrl ?? null}
        initials={initials}
      />
      <div className="j-shop-sf-section-head">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-shop-sf-section-tools">
          <Link href={shopHref} className="j-shop-loai-back">
            <ChevronLeft size={16} aria-hidden />
            Về cửa hàng
          </Link>
          {sectionActions}
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <section className="j-shop" aria-busy="true">
        {shopChrome}
        <div className="j-shop-loai-page">
          <div className="j-shop-loai-loading">
            <Loader2 size={18} className="shop-spin" aria-hidden />
            Đang tải…
          </div>
        </div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="j-shop">
        {shopChrome}
        <div className="j-shop-loai-page">
          <p className="j-shop-loai-err" role="alert">
            {err ?? "Không tìm thấy loại hàng."}
          </p>
        </div>
      </section>
    );
  }

  const moTaBlocks = detail.moTa ? parseShopNhomMoTa(detail.moTa) : [];
  const shopClosed = isShopTamDongActive(shop);

  return (
    <section className="j-shop" aria-label={detail.nhan}>
    {shopChrome}
    <div
      className={`j-shop-loai-page${shopClosed ? " is-tam-dong" : ""}`}
    >
      {shopClosed ? <ShopTamDongOverlay shop={shop} /> : null}
      <div
        className="j-shop-loai-page-body"
        inert={shopClosed ? true : undefined}
        aria-hidden={shopClosed || undefined}
      >
      <div
        className="j-shop-loai-main"
        onPointerDown={onLoaiMainPointerDown}
      >
        <div className="j-shop-loai-gallery-col">
          <div
            className={`j-shop-loai-gallery${galleryItems.length > 1 ? " is-swipeable" : ""}`}
            role={galleryItems.length > 1 ? "region" : undefined}
            aria-roledescription={
              galleryItems.length > 1 ? "carousel" : undefined
            }
            aria-label={
              galleryItems.length > 1 ? "Ảnh và video sản phẩm" : undefined
            }
            onPointerDown={onGalleryPointerDown}
            onPointerUp={onGalleryPointerUp}
            onPointerCancel={onGalleryPointerCancel}
            onPointerEnter={() => {
              galleryHoverRef.current = true;
            }}
            onPointerLeave={() => {
              galleryHoverRef.current = false;
            }}
          >
            {activeGallery?.kind === "video" ? (
              <iframe
                className="j-shop-loai-gallery-video"
                src={`${activeGallery.embedUrl}?autoplay=false&preload=true`}
                title={`Video ${detail.nhan}`}
                allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : galleryUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={galleryUrl}
                className="j-shop-loai-gallery-base"
                src={galleryUrl}
                alt=""
              />
            ) : (
              <div className="j-shop-loai-gallery-ph" aria-hidden />
            )}
            {showOverlay && detail.overlayAnhUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="j-shop-loai-gallery-overlay"
                src={detail.overlayAnhUrl}
                alt=""
                aria-hidden
              />
            ) : null}
            {galleryItems.length > 1 ? (
              <div
                className="j-shop-loai-gallery-dots"
                role="tablist"
                aria-label="Chỉ số ảnh"
              >
                {galleryItems.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={i === safeGalleryIdx}
                    aria-label={`Ảnh ${i + 1}`}
                    className={`j-shop-loai-gallery-dot${i === safeGalleryIdx ? " is-active" : ""}`}
                    onClick={() => selectGalleryIdx(i)}
                  />
                ))}
              </div>
            ) : null}
          </div>
          {galleryItems.length > 1 ? (
            <div
              className="j-shop-loai-gallery-thumbs"
              role="listbox"
              aria-label="Ảnh và video sản phẩm"
            >
              {galleryItems.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={i === safeGalleryIdx}
                  className={`j-shop-loai-gallery-thumb${i === safeGalleryIdx ? " is-active" : ""}${item.kind === "video" ? " is-video" : ""}`}
                  onClick={() => selectGalleryIdx(i)}
                >
                  {item.kind === "video" ? (
                    item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbUrl} alt="" />
                    ) : (
                      <span className="j-shop-loai-gallery-thumb-video" aria-hidden>
                        ▶
                      </span>
                    )
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="j-shop-loai-buy">
          <h1>{detail.nhan}</h1>
          {moTaBlocks.length > 0 ? (
            <div className="j-shop-loai-mota">
              {moTaBlocks.map((b, i) =>
                b.type === "p" ? (
                  <p key={i}>{b.text}</p>
                ) : b.type === "ul" ? (
                  <ul key={i}>
                    {b.items.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <ol key={i}>
                    {b.items.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ol>
                ),
              )}
            </div>
          ) : null}

          {loaiGiaLabel ? (
            <p
              className={`j-shop-loai-price${loaiGiaLabel.giaGoc != null ? " is-sale" : ""}`}
            >
              {loaiGiaLabel.giaGoc != null ? (
                <span className="j-shop-loai-price-goc">
                  {formatGia(loaiGiaLabel.giaGoc, loaiGiaLabel.tienTe)}
                </span>
              ) : null}
              <span>
                {loaiGiaLabel.kind === "loai" &&
                "range" in loaiGiaLabel &&
                loaiGiaLabel.range &&
                loaiGiaLabel.giaDen != null
                  ? `Từ ${formatGia(loaiGiaLabel.gia, loaiGiaLabel.tienTe)}`
                  : formatGia(loaiGiaLabel.gia, loaiGiaLabel.tienTe)}
              </span>
            </p>
          ) : (
            <p className="j-shop-loai-price is-empty">Chưa có giá</p>
          )}

          {showFilters ? (
            <div className="j-shop-loai-filters">
              {showFilter1 ? (
                <LoaiFilterDropdown
                  axisLabel={nhanPhanLoai}
                  options={filterOptions1}
                  selected={filterLoai}
                  onToggle={(key) => toggleFilter(1, key)}
                  onClear={() => setFilterLoai([])}
                />
              ) : null}
              {showFilter2 ? (
                <LoaiFilterDropdown
                  axisLabel={nhanPhanLoai2}
                  options={filterOptions2}
                  selected={filterLoai2}
                  onToggle={(key) => toggleFilter(2, key)}
                  onClear={() => setFilterLoai2([])}
                />
              ) : null}
            </div>
          ) : null}

          <div className="j-shop-loai-section">
            <h2>Mẫu</h2>
            <div className="j-shop-loai-chips j-shop-loai-chips--mau">
              {filteredMau.length === 0 ? (
                <p className="j-shop-loai-mau-empty">
                  Không có mẫu khớp bộ lọc.
                </p>
              ) : null}
              {filteredMau.map((m) => {
                const available = m.bienThe.some(
                  (b) => !b.hetHang && b.giaHienThi != null,
                );
                const onSale = m.bienThe.some((b) => b.giaGoc != null);
                const thumb =
                  m.anhUrl ||
                  m.bienThe.find((b) => b.anhUrl)?.anhUrl ||
                  null;
                return (
                  <button
                    key={m.sanPhamId}
                    type="button"
                    className={`j-shop-loai-chip j-shop-loai-chip--mau${selectedSpId === m.sanPhamId ? " is-active" : ""}${m.noiBat ? " is-feature" : ""}${!available ? " is-disabled" : ""}`}
                    disabled={!available && selectedSpId !== m.sanPhamId}
                    onClick={() => {
                      if (selectedSpId === m.sanPhamId) {
                        clearMauSelection();
                        return;
                      }
                      setSelectedSpId(m.sanPhamId);
                      const bt =
                        m.bienThe.find(
                          (b) => !b.hetHang && b.giaHienThi != null,
                        ) ?? m.bienThe[0] ?? null;
                      setSelectedBtId(bt?.id ?? null);
                      setQty(1);
                    }}
                  >
                    <span className="j-shop-loai-chip-media" aria-hidden>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" loading="lazy" />
                      ) : (
                        <span className="j-shop-loai-chip-ph" />
                      )}
                      {m.noiBat ? (
                        <span
                          className="j-shop-loai-chip-feature"
                          title="Ngôi sao"
                          aria-label="Ngôi sao"
                        >
                          <Star
                            size={12}
                            strokeWidth={2}
                            fill="currentColor"
                            aria-hidden
                          />
                        </span>
                      ) : null}
                      {onSale ? (
                        <span className="j-shop-loai-chip-sale">Sale</span>
                      ) : null}
                    </span>
                    <span className="j-shop-loai-chip-label">{m.ten}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMau && selectedMau.bienThe.length > 1 ? (
            <div className="j-shop-loai-section">
              <h2>Biến thể</h2>
              <div className="j-shop-loai-chips">
                {selectedMau.bienThe.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    className={`j-shop-loai-chip${selectedBtId === bt.id ? " is-active" : ""}${bt.hetHang || bt.giaHienThi == null ? " is-disabled" : ""}${bt.giaGoc != null ? " has-sale" : ""}`}
                    disabled={bt.hetHang || bt.giaHienThi == null}
                    onClick={() => {
                      setSelectedBtId(bt.id);
                      setQty(1);
                    }}
                  >
                    {bt.giaGoc != null ? (
                      <span className="j-shop-loai-chip-sale">Sale</span>
                    ) : null}
                    {bt.nhan}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {canShop || isOwner ? (
            <div className="j-shop-loai-buy-bar">
              {canShop ? (
                <div className="j-shop-loai-qty-row">
                  <span>Số lượng</span>
                  <span className="j-shop-sf-qty">
                    <button
                      type="button"
                      aria-label="Bớt"
                      disabled={qty <= 1}
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      aria-label="Thêm"
                      disabled={qty >= maxQty}
                      onClick={() =>
                        setQty((q) => Math.min(maxQty || 1, q + 1))
                      }
                    >
                      <Plus size={14} />
                    </button>
                  </span>
                  {selectedBt ? (
                    <span className="j-shop-loai-ton">
                      Còn {selectedBt.soLuongTon}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {cartErr ? (
                <p className="j-shop-sf-cart-err" role="alert">
                  {cartErr}
                </p>
              ) : null}

              {canShop ? (
                <button
                  type="button"
                  className="j-shop-loai-add"
                  disabled={!canAdd || cartBusy}
                  onClick={() => void addToCart()}
                >
                  {cartBusy ? (
                    <Loader2 size={16} className="shop-spin" aria-hidden />
                  ) : (
                    <ShoppingBag size={16} aria-hidden />
                  )}
                  Thêm vào giỏ
                </button>
              ) : (
                <p className="j-shop-loai-owner-hint">
                  Đây là cửa hàng của bạn — khách sẽ thêm hàng vào giỏ tại đây.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {otherNhom.length > 0 ? (
        <section
          className="j-shop-loai-more"
          aria-labelledby="j-shop-loai-more-title"
        >
          <header className="j-shop-loai-more-head">
            <h2 id="j-shop-loai-more-title">Loại khác</h2>
            <Link href={shopHref} className="j-shop-loai-more-all">
              Xem tất cả
            </Link>
          </header>
          <div
            ref={moreTrackRef}
            className={`j-shop-loai-more-track${moreDragging ? " is-dragging" : ""}`}
            onPointerDown={onMorePointerDown}
            onPointerMove={onMorePointerMove}
            onPointerUp={finishMoreDrag}
            onPointerCancel={finishMoreDrag}
            onLostPointerCapture={onMoreLostPointerCapture}
            onClickCapture={onMoreClickCapture}
          >
            <div className="j-shop-loai-more-ticker" role="list">
              {otherNhom.map((card) => {
                const href =
                  card.href?.trim() ||
                  shopLoaiHref(ownerSlug, shopSlug, card.id);
                const giaLabel =
                  card.giaTu != null
                    ? card.giaDen != null && card.giaDen !== card.giaTu
                      ? `Từ ${formatGia(card.giaTu, card.tienTe)}`
                      : formatGia(card.giaTu, card.tienTe)
                    : "Chưa có giá";
                return (
                  <Link
                    key={card.id}
                    role="listitem"
                    href={href}
                    draggable={false}
                    onDragStart={(ev) => ev.preventDefault()}
                    className={`j-shop-loai-more-card${card.hetHang ? " is-soldout" : ""}`}
                  >
                    <span className="j-shop-loai-more-media" aria-hidden>
                      {card.anhUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.anhUrl} alt="" loading="lazy" />
                      ) : (
                        <span className="j-shop-loai-more-ph" />
                      )}
                      {card.hetHang ? (
                        <span className="j-shop-loai-more-soldout">
                          Hết hàng
                        </span>
                      ) : null}
                    </span>
                    <span className="j-shop-loai-more-body">
                      <span className="j-shop-loai-more-name">
                        {card.nhan}
                      </span>
                      <span className="j-shop-loai-more-meta">
                        {card.soMau} mẫu
                        {card.diemTrungBinh != null ? (
                          <span className="j-shop-loai-more-rating">
                            <Star
                              size={11}
                              strokeWidth={2}
                              fill="currentColor"
                              aria-hidden
                            />
                            {card.diemTrungBinh}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`j-shop-loai-more-price${card.giaTu == null ? " is-empty" : ""}`}
                      >
                        {giaLabel}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {nhomId !== SHOP_STOREFRONT_KHAC_SLUG ? (
        <section className="j-shop-loai-reviews" aria-labelledby="j-shop-loai-rv">
          <header className="j-shop-loai-reviews-head">
            <h2 id="j-shop-loai-rv">Đánh giá sản phẩm</h2>
            <div className="j-shop-loai-review-board">
              <div className="j-shop-loai-review-score">
                {diemTb != null ? (
                  <>
                    <p className="j-shop-loai-review-score-num">
                      <strong>{diemTb}</strong>
                      <span>trên 5</span>
                    </p>
                    <Stars value={Math.round(diemTb)} size={14} />
                    <p className="j-shop-loai-review-score-tong">
                      {tongDg} đánh giá
                    </p>
                  </>
                ) : (
                  <p className="j-shop-loai-review-score-empty">
                    Chưa có đánh giá
                  </p>
                )}
              </div>
              <div
                className="j-shop-loai-review-filters"
                role="toolbar"
                aria-label="Lọc đánh giá"
              >
                {(
                  [
                    {
                      key: "all" as const,
                      label: `Tất cả (${reviewBoDem.tong})`,
                    },
                    {
                      key: "5" as const,
                      label: `5 ★ (${reviewBoDem.theoDiem[5]})`,
                    },
                    {
                      key: "4" as const,
                      label: `4 ★ (${reviewBoDem.theoDiem[4]})`,
                    },
                    {
                      key: "3" as const,
                      label: `3 ★ (${reviewBoDem.theoDiem[3]})`,
                    },
                    {
                      key: "2" as const,
                      label: `2 ★ (${reviewBoDem.theoDiem[2]})`,
                    },
                    {
                      key: "1" as const,
                      label: `1 ★ (${reviewBoDem.theoDiem[1]})`,
                    },
                    {
                      key: "comment" as const,
                      label: `Có bình luận (${reviewBoDem.coBinhLuan})`,
                    },
                    {
                      key: "media" as const,
                      label: `Có ảnh (${reviewBoDem.coAnh})`,
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={reviewFilter === opt.key ? "is-active" : ""}
                    aria-pressed={reviewFilter === opt.key}
                    onClick={() => setReviewFilter(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {canReview ? (
            <form
              className="j-shop-loai-review-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submitReview();
              }}
            >
              <div className="j-shop-loai-review-form-head">
                <span className="j-shop-loai-review-form-title">
                  <PenLine size={15} aria-hidden />
                  Viết đánh giá
                  <span className="j-shop-loai-review-form-badge">
                    <BadgeCheck size={12} aria-hidden />
                    Đã mua
                  </span>
                </span>
                <Stars value={reviewDiem} onChange={setReviewDiem} size={18} />
              </div>

              <div className="j-shop-loai-review-form-compose">
                <textarea
                  rows={2}
                  maxLength={SHOP_NHOM_DANH_GIA_NOI_DUNG_MAX}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  onPaste={(e) => {
                    const files = imageFilesFromClipboard(e.clipboardData);
                    if (files.length === 0) return;
                    e.preventDefault();
                    void addReviewImages(files);
                  }}
                  aria-label="Nội dung đánh giá"
                  placeholder="Chất lượng, đúng mô tả… (Ctrl+V dán ảnh)"
                />
                <div className="j-shop-loai-review-form-side">
                  {reviewAnh.length > 0 ? (
                    <div className="j-shop-loai-review-anh-row">
                      {reviewAnh.map((a) => (
                        <span key={a.id} className="j-shop-loai-review-anh">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt="" />
                          <button
                            type="button"
                            aria-label="Gỡ ảnh"
                            onClick={() =>
                              setReviewAnh((prev) =>
                                prev.filter((x) => x.id !== a.id),
                              )
                            }
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {reviewAnh.length < SHOP_NHOM_DANH_GIA_ANH_MAX ? (
                    <button
                      type="button"
                      className="j-shop-loai-review-anh-add"
                      onClick={() => reviewFileRef.current?.click()}
                      aria-label="Thêm ảnh thật"
                      title="Thêm ảnh thật · Ctrl+V để dán"
                    >
                      <ImagePlus size={16} aria-hidden />
                    </button>
                  ) : null}
                  <input
                    ref={reviewFileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void addReviewImages([file]);
                    }}
                  />
                  <button
                    type="submit"
                    className="j-shop-loai-review-submit"
                    disabled={reviewBusy}
                  >
                    {reviewBusy ? (
                      <Loader2 size={15} className="shop-spin" aria-hidden />
                    ) : (
                      <Send size={15} aria-hidden />
                    )}
                    Gửi
                  </button>
                </div>
              </div>

              {reviewErr ? (
                <p className="j-shop-sf-cart-err" role="alert">
                  {reviewErr}
                </p>
              ) : null}
            </form>
          ) : null}

          <ul className="j-shop-loai-review-list">
            {reviews.map((r) => (
              <li key={r.id} className="j-shop-loai-review-item">
                <div className="j-shop-loai-review-user">
                  <span className="j-shop-loai-review-avatar" aria-hidden>
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatarUrl} alt="" />
                    ) : (
                      (r.tenHienThi?.[0] ?? "?").toUpperCase()
                    )}
                  </span>
                  <div>
                    <strong>{r.tenHienThi || "Người mua"}</strong>
                    <Stars value={r.diem} size={13} />
                    <time dateTime={r.taoLuc}>
                      {new Date(r.taoLuc).toLocaleDateString("vi-VN")}
                    </time>
                  </div>
                  {r.isMine ? (
                    <button
                      type="button"
                      className="j-shop-loai-review-del"
                      aria-label="Xóa đánh giá"
                      disabled={reviewBusy}
                      onClick={() => void deleteMyReview(r.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
                {r.mauDaMua.length > 0 ? (
                  <p className="j-shop-loai-review-var">
                    Mẫu: {r.mauDaMua.join(", ")}
                  </p>
                ) : null}
                {r.noiDung ? <p>{r.noiDung}</p> : null}
                {r.anhUrls.length > 0 ? (
                  <div className="j-shop-loai-review-media">
                    {r.anhUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="" loading="lazy" />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {reviews.length === 0 ? (
            <p className="j-shop-sf-empty">Chưa có đánh giá nào.</p>
          ) : null}
        </section>
      ) : null}
      </div>
    </div>
    </section>
  );
}

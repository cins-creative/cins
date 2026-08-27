"use client";

import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  ClipboardPaste,
  ImagePlus,
  Loader2,
  Maximize,
  Minimize,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  beginClipboardImageRead,
  clipboardImageFailureMessage,
  imageFilesFromClipboard,
  readImageFilesFromClipboardDetailed,
} from "@/lib/files/clipboard-images";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { uploadPostImageWithProgress } from "@/lib/files/upload-post-image";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import {
  buildComposeEditorDraftKey,
  clearComposeEditorDraft,
} from "@/lib/journey/compose-editor-draft";
import {
  COMPOSE_PUBLISHED_EVENT,
  type ComposePublishedDetail,
} from "@/lib/journey/compose-published-sync";
import {
  SHOP_THUMB_FIT_DEFAULT,
  broadcastShopThumbFit,
  parseShopThumbFit,
  toggleShopThumbFit,
  type ShopThumbFit,
} from "@/lib/shop/anh-thumb-fit";
import {
  resolveShopKhoLoaiSlug,
  SHOP_KHO_ORPHAN_SLUG,
  shopKhoHubHref,
  shopKhoLoaiHref,
  shopKhoOrphanHref,
  shopLoaiHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import { parseGiaInput } from "@/lib/shop/gia-input";
import {
  buildPrefillGioiThieu,
  chonBienTheChoKiosk,
  danhGiaGioiThieuKiosk,
  doKichThuocAnh,
  mapAnhUrlLoaiHang,
  minMaxGiaGocTheoNhom,
  nhomGioiThieuCanhBao,
  shopGioiThieuDraftScope,
  thuThapAnhLoaiHang,
} from "@/lib/shop/gioi-thieu";
import type { ShopBangGia, ShopNhom, ShopSanPham } from "@/lib/shop/types";
import {
  resolveShopNhanPhanLoai,
  SHOP_FEATURE_MAX,
  SHOP_NHAN_PHAN_LOAI_DEFAULT,
} from "@/lib/shop/types";
import {
  fetchBanHangClientStatus,
  fetchBangGiaCached,
  fetchNhomCached,
  fetchSanPhamCached,
  fetchShopCuaHangClient,
  peekBangGia,
  peekNhom,
  peekSanPham,
  writeBangGiaCache,
  writeNhomCache,
  writeSanPhamCache,
} from "@/lib/shop/client-fetch-cache";

import { ShopKhoLoaiHub, ShopKhoLoaiMeta } from "./ShopKhoLoaiHub";
import { ShopPhanLoaiInput } from "./ShopPhanLoaiInput";
import "./shop-dashboard.css";

const KHO_ORPHAN_KEY = "__orphan__";
const KHO_PENDING_PREFIX = "pending-";
/** Song song tối đa khi up nhiều ảnh — tránh nghẽn API/CF. */
const KHO_UPLOAD_CONCURRENCY = 3;

type SortTon = "none" | "nhieu" | "het";

type ThumbUpload = {
  progress: number;
  blobUrl: string;
};

function ShopThumbFitBtn({
  fit,
  disabled,
  onToggle,
}: {
  fit: ShopThumbFit;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const contain = fit === "contain";
  return (
    <button
      type="button"
      className="shop-thumb-fit-chip"
      disabled={disabled}
      aria-label={
        contain
          ? "Ảnh vừa khung — bấm để lấp đầy ô"
          : "Ảnh lấp đầy ô — bấm để vừa khung"
      }
      title={contain ? "Thu nhỏ — vừa khung" : "Phóng to — lấp đầy"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      {contain ? (
        <Minimize size={15} strokeWidth={2.25} aria-hidden />
      ) : (
        <Maximize size={15} strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}

type RowDraft = {
  ten: string;
  phanLoai: string;
  phanLoai2: string;
  ton: string;
  /** Giá bán (niêm yết). */
  gia: string;
  /** Giá giảm / khuyến mãi — trống = không giảm. */
  giaGiam: string;
  /** Còn kinh doanh (`shop_san_pham.dang_ban`). */
  dangBan: boolean;
  /** Feature (`shop_san_pham.noi_bat`). */
  noiBat: boolean;
  /** Ảnh mới chờ lưu (đã upload CF). */
  anhId?: string | null;
  anhUrl?: string | null;
};

function isPendingKhoRow(id: string): boolean {
  return id.startsWith(KHO_PENDING_PREFIX);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export function ShopKhoClient({
  initialLoaiSlug = null,
}: {
  /** Segment `/seller/inventory/[slug]` — null = hub. */
  initialLoaiSlug?: string | null;
}) {
  const router = useRouter();
  const { openCompose, canCompose, ownerSlug: composeOwnerSlug } =
    useJourneyCompose();
  const fileRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [products, setProducts] = useState<ShopSanPham[]>([]);
  const [priceLists, setPriceLists] = useState<ShopBangGia[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  /** Preview blob + % progress theo từng dòng đang upload. */
  const [thumbUploads, setThumbUploads] = useState<Record<string, ThumbUpload>>(
    {},
  );
  const [bangGiaId, setBangGiaId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  /** Lọc multi theo cột phân loại (`__none__` = chưa gán). */
  const [filterLoai, setFilterLoai] = useState<string[]>([]);
  /** Sắp xếp theo tồn: none · còn nhiều trước · hết hàng trước. */
  const [sortTon, setSortTon] = useState<SortTon>("none");
  const [khoEditing, setKhoEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  /** Popup lọc trên header cột phân loại. */
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  /** Toolbar: 1 nút «Thêm hàng» → tách «Thêm dòng mới» / «Tải ảnh hàng loạt». */
  const [addHangOpen, setAddHangOpen] = useState(false);
  /** Sản phẩm đang chờ xác nhận xóa (1 hoặc nhiều). */
  const [deleteTargets, setDeleteTargets] = useState<
    Array<{ id: string; ten: string }>
  >([]);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectIndexRef = useRef<number | null>(null);
  /** Modifiers lúc mousedown trên checkbox (onChange không có shift/ctrl). */
  const selectModsRef = useRef({ shift: false, ctrl: false });
  /** Latest-wins khi bấm fit liên tục — bỏ PATCH cũ. */
  const thumbFitGenRef = useRef<Record<string, number>>({});
  /** Clipboard.read() bắt đầu ở pointerdown để còn user gesture. */
  const pendingClipboardReadRef = useRef<ReturnType<
    typeof beginClipboardImageRead
  > | null>(null);
  /** Dòng vừa sửa gần nhất — nguồn cho Áp dụng hàng loạt. */
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [nhanPhanLoai, setNhanPhanLoai] = useState(SHOP_NHAN_PHAN_LOAI_DEFAULT);
  /** Nhóm thẻ phân loại (truc 1) — tên + mô tả ngắn. */
  const [nhoms, setNhoms] = useState<ShopNhom[]>([]);
  /** Cache số mẫu chưa gán loại (id_nhom NULL) — thẻ «Chưa gán loại». */
  const [orphanCount, setOrphanCount] = useState(0);
  const [tiepCanByNhomId, setTiepCanByNhomId] = useState<
    Record<string, { luotThay: number; nguoiThay: number }>
  >({});
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exitingSave, setExitingSave] = useState(false);
  /** null = danh sách loại; uuid / KHO_ORPHAN_KEY = chi tiết. */
  const [activeNhomId, setActiveNhomId] = useState<string | null>(() => {
    const raw = initialLoaiSlug?.trim();
    if (!raw) return null;
    if (raw === SHOP_KHO_ORPHAN_SLUG) return KHO_ORPHAN_KEY;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
      return raw;
    }
    return null;
  });
  const [ownerSlug, setOwnerSlug] = useState<string | null>(null);
  const [shopTen, setShopTen] = useState<string | null>(null);
  const [gioiThieuBusy, setGioiThieuBusy] = useState(false);
  /** Lần giới thiệu gần nhất (`shop_nhom_gioi_thieu.tao_luc`); null nếu chưa từng / chưa biết. */
  const [gioiThieuLastAt, setGioiThieuLastAt] = useState<string | null>(null);
  /** true chỉ khi GET /about thành công — tránh highlight sai khi lỗi mạng. */
  const [gioiThieuAboutKnown, setGioiThieuAboutKnown] = useState(false);
  const [gioiThieuToast, setGioiThieuToast] = useState<{
    message: string;
    postHref?: string | null;
    canRetry?: boolean;
  } | null>(null);
  /** Đang chờ gắn kiosk sau publish — nhomId + draftScope + attach đã chốt lúc mở compose. */
  const pendingGioiThieuRef = useRef<{
    nhomId: string;
    draftScope: string;
    mau: ShopSanPham[];
    bangGia: ShopBangGia | null;
    nhomGiaMacDinh: number | null;
    attach: Array<{ idBienThe: string; idBangGia: string; thuTu: number }>;
    biCat: number;
  } | null>(null);
  const retryAttachRef = useRef<{
    cotMocId: string;
    postSlug: string | null;
    items: Array<{ idBienThe: string; idBangGia: string; thuTu: number }>;
    biCat: number;
  } | null>(null);

  const goKhoHub = useCallback(() => {
    setFilterLoai([]);
    setActiveNhomId(null);
    router.push(shopKhoHubHref());
  }, [router]);

  const openKhoNhom = useCallback(
    (id: string) => {
      setFilterLoai([]);
      setActiveNhomId(id);
      const nhom = nhoms.find((n) => n.id === id);
      router.push(
        nhom ? shopKhoLoaiHref(nhom, nhoms) : `${shopKhoHubHref()}/${encodeURIComponent(id)}`,
      );
    },
    [nhoms, router],
  );

  const openKhoOrphans = useCallback(() => {
    setFilterLoai([]);
    setActiveNhomId(KHO_ORPHAN_KEY);
    router.push(shopKhoOrphanHref());
  }, [router]);

  /* Sync `/seller/inventory/[slug]` → activeNhomId sau khi nhoms sẵn sàng. */
  useEffect(() => {
    if (loading || enabled === false) return;
    const raw = initialLoaiSlug?.trim() ?? "";
    if (!raw) {
      setActiveNhomId(null);
      return;
    }
    const resolved = resolveShopKhoLoaiSlug(raw, nhoms);
    if (resolved === SHOP_KHO_ORPHAN_SLUG) {
      setActiveNhomId(KHO_ORPHAN_KEY);
      return;
    }
    if (resolved) {
      setActiveNhomId(resolved);
      const nhom = nhoms.find((n) => n.id === resolved);
      if (nhom) {
        const canonical = shopKhoLoaiHref(nhom, nhoms);
        const current = `${shopKhoHubHref()}/${encodeURIComponent(raw)}`;
        if (canonical !== current) router.replace(canonical);
      }
      return;
    }
    if (nhoms.length === 0 && orphanCount === 0) return;
    setActiveNhomId(null);
    router.replace(shopKhoHubHref());
  }, [
    loading,
    enabled,
    initialLoaiSlug,
    nhoms,
    orphanCount,
    router,
  ]);

  useEffect(() => {
    if (enabled === false || activeNhomId != null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/shop/category-reach", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as {
          items?: Array<{
            idNhom: string;
            luotThay: number;
            nguoiThay: number;
          }>;
        } | null;
        if (!res.ok || cancelled || !json?.items) return;
        const map: Record<string, { luotThay: number; nguoiThay: number }> = {};
        for (const it of json.items) {
          map[it.idNhom] = { luotThay: it.luotThay, nguoiThay: it.nguoiThay };
        }
        setTiepCanByNhomId(map);
      } catch {
        /* badge tùy chọn */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, activeNhomId]);

  const uploading = Object.keys(thumbUploads).length > 0;
  const uploadProgressAvg = useMemo(() => {
    const entries = Object.values(thumbUploads);
    if (entries.length === 0) return 0;
    return Math.round(
      entries.reduce((sum, e) => sum + e.progress, 0) / entries.length,
    );
  }, [thumbUploads]);

  useEffect(() => {
    const blobs = blobUrlsRef.current;
    return () => {
      for (const url of blobs) URL.revokeObjectURL(url);
      blobs.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          profile?: { slug?: string | null } | null;
        } | null;
        const slug = json?.profile?.slug?.trim();
        if (!slug || cancelled) return;
        setOwnerSlug(slug);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function exitKhoEditing() {
    setKhoEditing(false);
    setDrafts({});
    setDeleteTargets([]);
    setSelectedIds([]);
    lastSelectIndexRef.current = null;
    setLastEditedId(null);
    setErr(null);
    setExitConfirmOpen(false);
    /* Giữ thumbUploads đang chạy — không hủy giữa chừng; blob cleanup khi xong. */
  }

  function enterKhoEditing() {
    setKhoEditing(true);
  }

  /**
   * Điều chỉnh cache số mẫu (nhoms.soMau + orphanCount) khi mẫu đổi loại —
   * dùng cho các đường ghi cập-nhật-tại-chỗ (saveRow / bulk) không reload nhoms.
   * Tạo/xóa mẫu đã gọi load() nên không cần.
   */
  function adjustNhomCounts(
    moves: Array<{
      oldNhom: string | null;
      newNhom: string | null;
      oldNhom2: string | null;
      newNhom2: string | null;
    }>,
  ) {
    const deltas = new Map<string, number>();
    let orphanDelta = 0;
    const bump = (id: string | null, d: number) => {
      if (!id) return;
      deltas.set(id, (deltas.get(id) ?? 0) + d);
    };
    for (const m of moves) {
      if ((m.oldNhom ?? null) !== (m.newNhom ?? null)) {
        bump(m.oldNhom, -1);
        bump(m.newNhom, +1);
        if (m.oldNhom && !m.newNhom) orphanDelta += 1;
        if (!m.oldNhom && m.newNhom) orphanDelta -= 1;
      }
      if ((m.oldNhom2 ?? null) !== (m.newNhom2 ?? null)) {
        bump(m.oldNhom2, -1);
        bump(m.newNhom2, +1);
      }
    }
    if (deltas.size > 0) {
      setNhoms((prev) =>
        prev.map((n) =>
          deltas.has(n.id)
            ? { ...n, soMau: Math.max(0, n.soMau + deltas.get(n.id)!) }
            : n,
        ),
      );
    }
    if (orphanDelta !== 0) {
      setOrphanCount((prev) => Math.max(0, prev + orphanDelta));
    }
  }

  function countDirtyRows(): number {
    return products.filter((p) => isRowDirty(p)).length;
  }

  function requestExitKhoEditing() {
    if (exitingSave) return;
    if (countDirtyRows() > 0) {
      setExitConfirmOpen(true);
      return;
    }
    exitKhoEditing();
  }

  async function confirmExitSaveAll() {
    if (exitingSave) return;
    setExitingSave(true);
    setErr(null);
    try {
      const dirty = products.filter((p) => isRowDirty(p));
      for (const p of dirty) {
        const ok = await saveRow(p);
        if (!ok) return;
      }
      exitKhoEditing();
    } finally {
      setExitingSave(false);
    }
  }

  useEffect(() => {
    if (deleteTargets.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) setDeleteTargets([]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTargets, deleting]);

  useEffect(() => {
    if (!exitConfirmOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !exitingSave) setExitConfirmOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitConfirmOpen, exitingSave]);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    const silent = opts?.silent === true;
    /* Sau mutate: bỏ qua cache cả ở bước peek — nếu không, bản cũ (còn dòng vừa
       xóa) sẽ được seed lại vào state và ghi ngược vào cache. */
    const force = opts?.force === true;
    const cachedProducts = force ? null : peekSanPham();
    const cachedBangGia = force ? null : peekBangGia();
    const cachedNhom = force ? null : peekNhom();
    const hasCatalogCache =
      cachedProducts != null && cachedBangGia != null && cachedNhom != null;
    if (hasCatalogCache) {
      setProducts(cachedProducts);
      setPriceLists(cachedBangGia);
      if (cachedBangGia[0] && !bangGiaId) setBangGiaId(cachedBangGia[0].id);
      setNhoms(cachedNhom.items);
      setOrphanCount(cachedNhom.orphanCount);
    }
    if (!silent && !hasCatalogCache) {
      setLoading(true);
      setErr(null);
    }
    try {
      const forceOpt = force ? { force: true } : undefined;
      const [status, products, lists, shopData, nhomPayload] = await Promise.all(
        [
          fetchBanHangClientStatus(),
          fetchSanPhamCached(forceOpt),
          fetchBangGiaCached(forceOpt),
          fetchShopCuaHangClient(),
          fetchNhomCached(forceOpt),
        ],
      );
      setEnabled(status.enabled);
      if (!status.enabled) return;

      setProducts(products);
      setPriceLists(lists);
      if (lists[0] && !bangGiaId) setBangGiaId(lists[0].id);
      setNhanPhanLoai(resolveShopNhanPhanLoai(shopData.shop));
      setNhoms(nhomPayload.items);
      setOrphanCount(nhomPayload.orphanCount);
      setShopTen(shopData.shop?.ten ?? null);
    } catch {
      setErr("Không tải được kho.");
    } finally {
      setLoading(false);
    }
  }, [bangGiaId]);

  /** Nạp lại sau khi mutate — luôn bỏ cache để không thấy lại dữ liệu vừa xóa. */
  const refreshKho = useCallback(
    () => load({ silent: true, force: true }),
    [load],
  );

  useEffect(() => {
    if (!enabled || loading) return;
    writeSanPhamCache(products);
    writeBangGiaCache(priceLists);
    writeNhomCache({ items: nhoms, orphanCount });
  }, [enabled, loading, products, priceLists, nhoms, orphanCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const n of nhoms) {
      if (n.truc !== 1) continue;
      const t = n.nhan?.trim();
      if (t) set.add(t);
    }
    for (const p of products) {
      const t = p.phanLoai?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products, nhoms]);

  const hasUncategorized = useMemo(
    () => products.some((p) => !p.phanLoai?.trim()),
    [products],
  );

  const activeNhom = useMemo(
    () =>
      activeNhomId && activeNhomId !== KHO_ORPHAN_KEY
        ? nhoms.find((n) => n.id === activeNhomId) ?? null
        : null,
    [activeNhomId, nhoms],
  );

  const activeNhomStorefrontHref = useMemo(() => {
    if (!ownerSlug || !activeNhom) return null;
    return shopLoaiHref(
      ownerSlug,
      shopSlugFromTen(shopTen, ownerSlug),
      activeNhom.id,
    );
  }, [ownerSlug, shopTen, activeNhom]);

  /* Số mẫu lấy từ cache `so_mau` (server duy trì bằng trigger) — không đếm
     mảng `products` (bị cắt 200 → sai). Cập nhật khi thêm/sửa/xóa mẫu. */
  const mauCountByNhomId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of nhoms) map[n.id] = n.soMau ?? 0;
    return map;
  }, [nhoms]);

  /** Min/max giá gốc mẫu theo loại. `null` = đã thấy mẫu nhưng chưa có dòng giá. */
  const giaHubByNhomId = useMemo(() => {
    const range = minMaxGiaGocTheoNhom({
      mau: products,
      bangGia:
        (bangGiaId
          ? priceLists.find((b) => b.id === bangGiaId)
          : null) ??
        priceLists[0] ??
        null,
    });
    const map: Record<string, { tu: number; den: number } | null> = {};
    for (const p of products) {
      const id = p.idNhom?.trim();
      if (!id || id in map) continue;
      map[id] = range[id] ?? null;
    }
    return map;
  }, [products, priceLists, bangGiaId]);

  /** Khi mở 1 loại: kéo thêm mẫu theo id_nhom (tránh lệch do list kho limit 200). */
  useEffect(() => {
    if (!activeNhomId || activeNhomId === KHO_ORPHAN_KEY) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/shop/products?nhomId=${encodeURIComponent(activeNhomId)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          items?: ShopSanPham[];
        } | null;
        if (!res.ok || cancelled || !json?.items) return;
        setProducts((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          for (const item of json.items!) byId.set(item.id, item);
          return [...byId.values()].sort((a, b) =>
            (b.taoLuc ?? "").localeCompare(a.taoLuc ?? ""),
          );
        });
      } catch {
        /* giữ list hiện có */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNhomId]);


  const filteredProducts = useMemo(() => {
    /* Trong 1 loại / orphan: chỉ scope theo idNhom — không áp filter cột
       (tránh list trống trong khi mauCount vẫn > 0 → không xóa được mặt hàng). */
    const scopedToNhom = Boolean(activeNhomId);
    const selected1 =
      !scopedToNhom && filterLoai.length > 0 ? new Set(filterLoai) : null;

    const list = products.filter((p) => {
      if (activeNhomId === KHO_ORPHAN_KEY) {
        if (p.idNhom?.trim()) return false;
      } else if (activeNhomId) {
        if (p.idNhom?.trim() !== activeNhomId) return false;
      }
      if (selected1) {
        const loai = p.phanLoai?.trim();
        if (!loai) {
          if (!selected1.has("__none__")) return false;
        } else if (!selected1.has(loai)) {
          return false;
        }
      }
      return true;
    });

    const dangBanOf = (p: ShopSanPham): boolean => {
      const draft = drafts[p.id];
      if (draft) return draft.dangBan;
      return p.dangBan !== false;
    };

    const tonOf = (p: ShopSanPham): number => {
      const draft = drafts[p.id];
      if (draft) {
        const n = Number.parseInt(draft.ton, 10);
        if (Number.isFinite(n)) return n;
      }
      return p.bienThe[0]?.soLuongTon ?? 0;
    };

    return [...list].sort((a, b) => {
      // Ngừng bán luôn xuống dưới cùng
      const aBan = dangBanOf(a) ? 0 : 1;
      const bBan = dangBanOf(b) ? 0 : 1;
      if (aBan !== bBan) return aBan - bBan;

      if (sortTon === "none") return 0;
      const diff = tonOf(a) - tonOf(b);
      return sortTon === "het" ? diff : -diff;
    });
  }, [
    products,
    filterLoai,
    sortTon,
    drafts,
    activeNhomId,
  ]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const alive = new Set(products.map((p) => p.id));
      const next = prev.filter((id) => alive.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [products]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIdSet.has(p.id));
  const someFilteredSelected =
    filteredProducts.some((p) => selectedIdSet.has(p.id)) && !allFilteredSelected;

  const applySelect = useCallback(
    (id: string, index: number, shiftKey: boolean, ctrlKey = false) => {
      setSelectedIds((prev) => {
        if (shiftKey && lastSelectIndexRef.current != null) {
          const a = Math.min(lastSelectIndexRef.current, index);
          const b = Math.max(lastSelectIndexRef.current, index);
          const next = new Set(prev);
          for (let i = a; i <= b; i++) {
            const row = filteredProducts[i];
            if (row) next.add(row.id);
          }
          return [...next];
        }
        /* Ctrl/Cmd: bật/tắt từng ô, giữ các ô đã chọn khác. */
        if (ctrlKey) {
          if (prev.includes(id)) return prev.filter((x) => x !== id);
          return [...prev, id];
        }
        /* Không modifier: bỏ selection cũ, chỉ giữ ô vừa pick.
           Click lại đúng ô đang chọn duy nhất → bỏ chọn. */
        if (prev.length === 1 && prev[0] === id) return [];
        return [id];
      });
      if (!shiftKey) lastSelectIndexRef.current = index;
    },
    [filteredProducts],
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (
        filteredProducts.length > 0 &&
        filteredProducts.every((p) => prev.includes(p.id))
      ) {
        lastSelectIndexRef.current = null;
        return [];
      }
      return filteredProducts.map((p) => p.id);
    });
  }, [filteredProducts]);

  function toggleFilterLoai(key: string) {
    if (key === "all") {
      setFilterLoai([]);
      return;
    }
    setFilterLoai((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return [...prev, key];
    });
  }

  useEffect(() => {
    if (!filterMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-shop-filter-menu]")) return;
      setFilterMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    if (!addHangOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (uploading) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-shop-add-hang]")) return;
      setAddHangOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading) setAddHangOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addHangOpen, uploading]);

  function cycleSortTon() {
    setSortTon((prev) => {
      if (prev === "none") return "nhieu";
      if (prev === "nhieu") return "het";
      return "none";
    });
  }

  function resolveDongBienThe(idBienThe: string | undefined) {
    if (!idBienThe) return null;
    // Chỉ lấy giá trong bảng đang chọn — không fallback sang bảng khác
    // (tránh hiện 35.000 IDR khi bảng IDR chưa có dòng, giá thật thuộc bảng VND).
    const bg = bangGiaId
      ? priceLists.find((b) => b.id === bangGiaId)
      : priceLists[0];
    if (!bg) return null;
    return bg.dong.find((x) => x.idBienThe === idBienThe) ?? null;
  }

  function resolveGiaBienThe(idBienThe: string | undefined): number | null {
    const d = resolveDongBienThe(idBienThe);
    return d ? d.gia : null;
  }

  function resolveGiaGiamBienThe(
    idBienThe: string | undefined,
  ): number | null {
    const d = resolveDongBienThe(idBienThe);
    return d?.giaGiam ?? null;
  }

  function baseDraftForProduct(p: ShopSanPham): RowDraft {
    const bt = p.bienThe[0];
    const dong = resolveDongBienThe(bt?.id);
    const nhomGia =
      (p.idNhom
        ? nhoms.find((n) => n.id === p.idNhom)?.giaMacDinh
        : null) ?? null;
    /* Giá gốc riêng của mẫu là sự thật; giá loại chỉ đỡ khi mẫu chưa có dòng giá. */
    const giaGoc =
      dong != null
        ? String(dong.gia)
        : nhomGia != null
          ? String(nhomGia)
          : "";
    return {
      ten: p.ten ?? "",
      phanLoai: p.phanLoai ?? "",
      phanLoai2: p.phanLoai2 ?? "",
      ton: String(bt?.soLuongTon ?? 0),
      gia: giaGoc,
      giaGiam: dong?.giaGiam != null ? String(dong.giaGiam) : "",
      dangBan: p.dangBan !== false,
      noiBat: p.noiBat === true,
    };
  }

  function getDraft(p: ShopSanPham): RowDraft {
    const base = baseDraftForProduct(p);
    const d = drafts[p.id];
    return d ? { ...base, ...d } : base;
  }

  function patchDraft(id: string, patch: Partial<RowDraft>, base: RowDraft) {
    setLastEditedId(id);
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? base), ...patch },
    }));
  }

  /** Các field đã đổi trên một dòng (so với giá trị gốc). */
  function getChangedDraftPatch(p: ShopSanPham): Partial<RowDraft> | null {
    const d = getDraft(p);
    const base = baseDraftForProduct(p);
    const patch: Partial<RowDraft> = {};
    if (d.ten.trim() !== base.ten.trim()) patch.ten = d.ten;
    if (d.phanLoai.trim() !== base.phanLoai.trim()) patch.phanLoai = d.phanLoai;
    if (d.phanLoai2.trim() !== base.phanLoai2.trim()) {
      patch.phanLoai2 = d.phanLoai2;
    }
    if (d.ton.trim() !== base.ton.trim()) patch.ton = d.ton;
    if (parseGiaInput(d.gia) !== parseGiaInput(base.gia)) patch.gia = d.gia;
    if (parseGiaInput(d.giaGiam) !== parseGiaInput(base.giaGiam)) {
      patch.giaGiam = d.giaGiam;
    }
    if (d.dangBan !== base.dangBan) patch.dangBan = d.dangBan;
    if (d.noiBat !== base.noiBat) patch.noiBat = d.noiBat;
    if (d.anhId !== undefined) {
      patch.anhId = d.anhId;
      patch.anhUrl = d.anhUrl ?? null;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }

  function isRowDirty(p: ShopSanPham): boolean {
    const d = getDraft(p);
    const base = baseDraftForProduct(p);
    if (d.anhId !== undefined) return true;
    return (
      d.ten.trim() !== base.ten.trim() ||
      d.phanLoai.trim() !== base.phanLoai.trim() ||
      d.phanLoai2.trim() !== base.phanLoai2.trim() ||
      d.ton.trim() !== base.ton.trim() ||
      parseGiaInput(d.gia) !== parseGiaInput(base.gia) ||
      parseGiaInput(d.giaGiam) !== parseGiaInput(base.giaGiam) ||
      d.dangBan !== base.dangBan ||
      d.noiBat !== base.noiBat
    );
  }

  async function ensureBangGiaId(
    lists: ShopBangGia[] = priceLists,
    tienTe = "VND",
  ): Promise<string | null> {
    if (bangGiaId) return bangGiaId;
    if (lists[0]) {
      setBangGiaId(lists[0].id);
      return lists[0].id;
    }
    const res = await fetch("/api/shop/price-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ten: "Bảng giá mặc định",
        tienTe: tienTe.trim() || "VND",
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      item?: ShopBangGia;
      error?: string;
    } | null;
    if (!res.ok || !json?.item) {
      setErr(json?.error ?? "Không tạo được bảng giá để gắn giá.");
      return null;
    }
    setPriceLists((prev) => [json.item!, ...prev]);
    setBangGiaId(json.item.id);
    return json.item.id;
  }

  // Mô hình 1 bảng giá VND duy nhất — tiền tệ cố định.
  function currentTienTe(): string {
    return "VND";
  }

  async function saveGiaForBienThe(
    idBienThe: string,
    next: { gia: number; giaGiam: number | null },
    lists: ShopBangGia[] = priceLists,
  ): Promise<boolean> {
    const targetBang = await ensureBangGiaId(lists);
    if (!targetBang) return false;
    const bg =
      lists.find((b) => b.id === targetBang) ??
      priceLists.find((b) => b.id === targetBang);
    const dong = [
      ...(bg?.dong.filter((d) => d.idBienThe !== idBienThe) ?? []).map((d) => ({
        idBienThe: d.idBienThe,
        gia: d.gia,
        giaGiam: d.giaGiam ?? null,
      })),
      {
        idBienThe,
        gia: next.gia,
        giaGiam: next.giaGiam,
      },
    ];
    const res = await fetch(`/api/shop/price-lists/${targetBang}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dong }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErr(json?.error ?? "Không lưu được giá.");
      return false;
    }
    setPriceLists((prev) =>
      prev.map((b) => {
        if (b.id !== targetBang) return b;
        const existing = b.dong.find((d) => d.idBienThe === idBienThe);
        return {
          ...b,
          dong: [
            ...b.dong.filter((d) => d.idBienThe !== idBienThe),
            {
              id: existing?.id ?? `local-${idBienThe}`,
              idBienThe,
              gia: next.gia,
              giaGiam: next.giaGiam,
            },
          ],
        };
      }),
    );
    return true;
  }

  async function uploadThumb(
    rowId: string,
    file: File,
    blobUrl: string,
  ): Promise<{ imageId: string; url: string } | null> {
    setThumbUploads((prev) => ({
      ...prev,
      [rowId]: { progress: 1, blobUrl },
    }));
    try {
      const result = await uploadPostImageWithProgress(file, (pct) => {
        setThumbUploads((prev) => {
          const cur = prev[rowId];
          if (!cur) return prev;
          return { ...prev, [rowId]: { ...cur, progress: pct } };
        });
      });
      if (!result.url) {
        setErr("Không tải ảnh được.");
        return null;
      }
      return { imageId: result.imageId, url: result.url };
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải ảnh được.");
      return null;
    }
  }

  function finishThumbUpload(rowId: string, blobUrl: string) {
    setThumbUploads((prev) => {
      if (!(rowId in prev)) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    /* Revoke sau khi React kịp chuyển sang URL CF — tránh nháy ảnh vỡ. */
    window.setTimeout(() => {
      if (blobUrlsRef.current.has(blobUrl)) {
        blobUrlsRef.current.delete(blobUrl);
        URL.revokeObjectURL(blobUrl);
      }
    }, 0);
  }

  function nameFromImageFile(file: File): string {
    const base = file.name.replace(/\.[^.]+$/u, "").trim();
    return base || "Sản phẩm mới";
  }

  function makePendingProduct(file: File, blobUrl: string): ShopSanPham {
    const id = `${KHO_PENDING_PREFIX}${crypto.randomUUID()}`;
    const btId = `${KHO_PENDING_PREFIX}bt-${crypto.randomUUID()}`;
    const nhomId =
      activeNhomId && activeNhomId !== KHO_ORPHAN_KEY ? activeNhomId : null;
    return {
      id,
      ten: nameFromImageFile(file),
      moTa: null,
      anhId: null,
      anhUrl: blobUrl,
      anhThumbFit: SHOP_THUMB_FIT_DEFAULT,
      phanLoai: activeNhom?.nhan ?? null,
      phanLoai2: null,
      idNhom: nhomId,
      idNhom2: null,
      dangBan: true,
      noiBat: false,
      bienThe: [
        {
          id: btId,
          idSanPham: id,
          nhan: "Mặc định",
          sku: null,
          soLuongTon: 0,
          canNang: null,
          anhId: null,
          anhUrl: null,
        },
      ],
      taoLuc: new Date().toISOString(),
    };
  }

  function trackBlob(url: string): string {
    blobUrlsRef.current.add(url);
    return url;
  }

  /**
   * Ảnh đang hiển thị trên dòng (ưu tiên blob đang upload, rồi draft chưa lưu).
   */
  function rowDisplayAnh(p: ShopSanPham): string | null {
    const uploadingThumb = thumbUploads[p.id];
    if (uploadingThumb) return uploadingThumb.blobUrl;
    const d = drafts[p.id];
    if (d?.anhId !== undefined) return d.anhUrl ?? null;
    return p.anhUrl ?? null;
  }

  function applyThumbFitLocal(id: string, fit: ReturnType<typeof parseShopThumbFit>) {
    setProducts((prev) => {
      const next = prev.map((x) =>
        x.id === id ? { ...x, anhThumbFit: fit } : x,
      );
      writeSanPhamCache(next.filter((x) => !isPendingKhoRow(x.id)));
      return next;
    });
    broadcastShopThumbFit(id, fit);
  }

  function toggleRowThumbFit(p: ShopSanPham) {
    if (!rowDisplayAnh(p)) return;
    const next = toggleShopThumbFit(p.anhThumbFit);
    applyThumbFitLocal(p.id, next);
    if (isPendingKhoRow(p.id)) return;
    const gen = (thumbFitGenRef.current[p.id] ?? 0) + 1;
    thumbFitGenRef.current[p.id] = gen;
    void fetch(`/api/shop/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anhThumbFit: next }),
    }).then(async (res) => {
      if (thumbFitGenRef.current[p.id] !== gen) return;
      if (res.ok) return;
      applyThumbFitLocal(p.id, parseShopThumbFit(p.anhThumbFit));
    }).catch(() => {
      if (thumbFitGenRef.current[p.id] !== gen) return;
      applyThumbFitLocal(p.id, parseShopThumbFit(p.anhThumbFit));
    });
  }

  function rowHasAnh(p: ShopSanPham): boolean {
    return Boolean(thumbUploads[p.id] || rowDisplayAnh(p));
  }

  /**
   * Chọn ảnh (1 hoặc nhiều) → ưu tiên gắn vào dòng trống đang lọc,
   * còn thừa mới tạo sản phẩm mới (tên = tên file).
   * Blob preview hiện ngay; upload song song + hiện %.
   */
  async function handleAddImages(files: File[]) {
    const list = files.filter((f) => f.size > 0 && isAllowedUploadImageFile(f));
    if (list.length === 0) {
      if (files.length > 0) setErr("File không phải ảnh hợp lệ.");
      return;
    }
    if (!khoEditing) enterKhoEditing();

    setErr(null);

    const emptySlots = filteredProducts.filter((p) => !rowHasAnh(p));
    type Job =
      | { kind: "fill"; product: ShopSanPham; file: File; blobUrl: string }
      | { kind: "create"; pending: ShopSanPham; file: File; blobUrl: string };

    const jobs: Job[] = [];
    const pendingRows: ShopSanPham[] = [];
    let filled = 0;

    for (const file of list) {
      const emptyTarget = emptySlots[filled];
      if (emptyTarget) {
        const blobUrl = trackBlob(URL.createObjectURL(file));
        jobs.push({
          kind: "fill",
          product: emptyTarget,
          file,
          blobUrl,
        });
        filled += 1;
      } else {
        const blobUrl = trackBlob(URL.createObjectURL(file));
        const pending = makePendingProduct(file, blobUrl);
        pendingRows.push(pending);
        jobs.push({ kind: "create", pending, file, blobUrl });
      }
    }

    if (jobs.length === 0) return;

    /* Hiện blob ngay trên dòng trống / dòng pending mới. */
    setThumbUploads((prev) => {
      const next = { ...prev };
      for (const job of jobs) {
        const id = job.kind === "fill" ? job.product.id : job.pending.id;
        next[id] = { progress: 1, blobUrl: job.blobUrl };
      }
      return next;
    });
    if (pendingRows.length > 0) {
      setProducts((prev) => [...pendingRows, ...prev]);
      setLastEditedId(pendingRows[0]!.id);
    } else if (jobs[0]?.kind === "fill") {
      setLastEditedId(jobs[0].product.id);
    }

    let failUpload = 0;
    let failCreate = 0;
    let okFill = 0;
    let okCreate = 0;
    const created: ShopSanPham[] = [];

    await mapPool(jobs, KHO_UPLOAD_CONCURRENCY, async (job) => {
      const rowId = job.kind === "fill" ? job.product.id : job.pending.id;
      const uploaded = await uploadThumb(rowId, job.file, job.blobUrl);
      if (!uploaded) {
        failUpload += 1;
        finishThumbUpload(rowId, job.blobUrl);
        if (job.kind === "create") {
          setProducts((prev) => prev.filter((p) => p.id !== job.pending.id));
        }
        return;
      }

      if (job.kind === "fill") {
        const base = baseDraftForProduct(job.product);
        setDrafts((prev) => ({
          ...prev,
          [job.product.id]: {
            ...(prev[job.product.id] ?? base),
            anhId: uploaded.imageId,
            anhUrl: uploaded.url,
          },
        }));
        finishThumbUpload(rowId, job.blobUrl);
        okFill += 1;
        return;
      }

      try {
        const res = await fetch("/api/shop/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ten: nameFromImageFile(job.file),
            anhId: uploaded.imageId,
            phanLoai: activeNhom?.nhan ?? null,
            phanLoai2: null,
            bienThe: [{ nhan: "Mặc định", soLuongTon: 0 }],
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          item?: ShopSanPham;
          error?: string;
        } | null;
        if (!res.ok || !json?.item) {
          failCreate += 1;
          finishThumbUpload(rowId, job.blobUrl);
          setProducts((prev) => prev.filter((p) => p.id !== job.pending.id));
          return;
        }
        const item = json.item;
        const bt0 = item.bienThe[0];
        if (
          bt0 &&
          activeNhom?.giaMacDinh != null &&
          Number.isFinite(activeNhom.giaMacDinh)
        ) {
          await saveGiaForBienThe(bt0.id, {
            gia: activeNhom.giaMacDinh,
            giaGiam: null,
          });
        }
        created.push(item);
        setProducts((prev) => {
          const withoutPending = prev.filter((p) => p.id !== job.pending.id);
          const ids = new Set(withoutPending.map((p) => p.id));
          if (ids.has(item.id)) {
            return withoutPending.map((p) => (p.id === item.id ? item : p));
          }
          return [item, ...withoutPending];
        });
        finishThumbUpload(rowId, job.blobUrl);
        okCreate += 1;
      } catch {
        failCreate += 1;
        finishThumbUpload(rowId, job.blobUrl);
        setProducts((prev) => prev.filter((p) => p.id !== job.pending.id));
      }
    });

    if (created.length > 0) {
      setLastEditedId(created[0]!.id);
      await refreshKho();
    }

    const fail = failUpload + failCreate;
    if (fail > 0) {
      const ok = okFill + okCreate;
      setErr(
        ok === 0
          ? "Không thêm được sản phẩm từ ảnh."
          : `Đã gắn/thêm ${ok} ảnh — ${fail} ảnh lỗi.`,
      );
    }
  }

  async function createBlankProduct() {
    if (!khoEditing) enterKhoEditing();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: "Mẫu mới",
          anhId: null,
          phanLoai: activeNhom?.nhan ?? null,
          phanLoai2: null,
          bienThe: [{ nhan: "Mặc định", soLuongTon: 0 }],
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopSanPham;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        setErr(json?.error ?? "Không tạo mẫu.");
        return;
      }
      const item = json.item;
      const bt0 = item.bienThe[0];
      if (
        bt0 &&
        activeNhom?.giaMacDinh != null &&
        Number.isFinite(activeNhom.giaMacDinh)
      ) {
        await saveGiaForBienThe(bt0.id, {
          gia: activeNhom.giaMacDinh,
          giaGiam: null,
        });
      }
      setProducts((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      setLastEditedId(item.id);
      await refreshKho();
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveProduct() {
    if (deleteTargets.length === 0) return;
    const targets = deleteTargets;
    const targetIds = new Set(targets.map((t) => t.id));
    const snapshot = products.filter((p) => targetIds.has(p.id));
    const apiTargets = targets.filter((t) => !isPendingKhoRow(t.id));

    /* Optimistic: đóng dialog + gỡ khỏi list ngay. */
    setDeleteTargets([]);
    setErr(null);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const id of targetIds) delete next[id];
      return next;
    });
    setProducts((prev) => prev.filter((p) => !targetIds.has(p.id)));
    setSelectedIds((prev) => prev.filter((id) => !targetIds.has(id)));
    if (lastEditedId && targetIds.has(lastEditedId)) setLastEditedId(null);

    const deltas = new Map<string, number>();
    let orphanDelta = 0;
    for (const p of snapshot) {
      if (p.idNhom) {
        deltas.set(p.idNhom, (deltas.get(p.idNhom) ?? 0) - 1);
      } else {
        orphanDelta -= 1;
      }
      if (p.idNhom2) {
        deltas.set(p.idNhom2, (deltas.get(p.idNhom2) ?? 0) - 1);
      }
    }
    if (deltas.size > 0) {
      setNhoms((prev) =>
        prev.map((n) =>
          deltas.has(n.id)
            ? { ...n, soMau: Math.max(0, (n.soMau ?? 0) + deltas.get(n.id)!) }
            : n,
        ),
      );
    }
    if (orphanDelta !== 0) {
      setOrphanCount((prev) => Math.max(0, prev + orphanDelta));
    }

    if (apiTargets.length === 0) return;

    try {
      const results = await Promise.all(
        apiTargets.map(async (t) => {
          const res = await fetch(`/api/shop/products/${t.id}`, {
            method: "DELETE",
          });
          return { id: t.id, ok: res.ok };
        }),
      );
      const failedIds = new Set(
        results.filter((r) => !r.ok).map((r) => r.id),
      );
      if (failedIds.size > 0) {
        const restore = snapshot.filter((p) => failedIds.has(p.id));
        setProducts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const add = restore.filter((p) => !ids.has(p.id));
          if (add.length === 0) return prev;
          return [...prev, ...add].sort((a, b) =>
            (b.taoLuc ?? "").localeCompare(a.taoLuc ?? ""),
          );
        });
        const restoreDeltas = new Map<string, number>();
        let restoreOrphan = 0;
        for (const p of restore) {
          if (p.idNhom) {
            restoreDeltas.set(
              p.idNhom,
              (restoreDeltas.get(p.idNhom) ?? 0) + 1,
            );
          } else {
            restoreOrphan += 1;
          }
          if (p.idNhom2) {
            restoreDeltas.set(
              p.idNhom2,
              (restoreDeltas.get(p.idNhom2) ?? 0) + 1,
            );
          }
        }
        if (restoreDeltas.size > 0) {
          setNhoms((prev) =>
            prev.map((n) =>
              restoreDeltas.has(n.id)
                ? {
                    ...n,
                    soMau: Math.max(
                      0,
                      (n.soMau ?? 0) + restoreDeltas.get(n.id)!,
                    ),
                  }
                : n,
            ),
          );
        }
        if (restoreOrphan !== 0) {
          setOrphanCount((prev) => Math.max(0, prev + restoreOrphan));
        }
        setErr(
          failedIds.size === apiTargets.length
            ? "Không xóa được sản phẩm."
            : `Đã xóa một phần — ${failedIds.size} sản phẩm lỗi.`,
        );
      }
      if (failedIds.size < apiTargets.length) {
        void refreshKho();
      }
    } catch {
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const add = snapshot.filter((p) => !ids.has(p.id));
        if (add.length === 0) return prev;
        return [...prev, ...add].sort((a, b) =>
          (b.taoLuc ?? "").localeCompare(a.taoLuc ?? ""),
        );
      });
      setNhoms((prev) =>
        prev.map((n) =>
          deltas.has(n.id)
            ? { ...n, soMau: Math.max(0, (n.soMau ?? 0) - deltas.get(n.id)!) }
            : n,
        ),
      );
      if (orphanDelta !== 0) {
        setOrphanCount((prev) => Math.max(0, prev - orphanDelta));
      }
      setErr("Không xóa được sản phẩm.");
    }
  }

  async function saveRow(p: ShopSanPham): Promise<boolean> {
    if (isPendingKhoRow(p.id) || thumbUploads[p.id]) {
      setErr("Đợi tải ảnh xong rồi lưu.");
      return false;
    }
    const bt = p.bienThe[0];
    if (!bt) {
      setErr("Sản phẩm thiếu biến thể.");
      return false;
    }
    const draft = getDraft(p);
    const tenTrim = draft.ten.trim();
    if (!tenTrim) {
      setErr("Tên sản phẩm không được để trống.");
      return false;
    }
    const tonNum = Number.parseInt(draft.ton, 10);
    if (!Number.isFinite(tonNum) || tonNum < 0) {
      setErr("Tồn kho không hợp lệ.");
      return false;
    }
    const giaGiamRaw = draft.giaGiam.trim();
    const giaGiamNum = giaGiamRaw ? parseGiaInput(giaGiamRaw) : null;
    if (giaGiamRaw && giaGiamNum == null) {
      setErr("Giá giảm không hợp lệ.");
      return false;
    }
    const oldGia = resolveGiaBienThe(bt.id);
    const oldGiaGiam = resolveGiaGiamBienThe(bt.id);
    const giaRaw = draft.gia.trim();
    const giaNum = giaRaw ? parseGiaInput(giaRaw) : null;
    if (giaRaw && giaNum == null) {
      setErr("Giá gốc không hợp lệ.");
      return false;
    }
    /* Mẫu chưa đặt giá riêng — mượn giá gốc của loại hàng. */
    const nhomForGia =
      activeNhom ??
      (p.idNhom ? nhoms.find((n) => n.id === p.idNhom) : null) ??
      nhoms.find(
        (n) =>
          n.truc === 1 &&
          n.nhan.trim() === draft.phanLoai.trim(),
      ) ??
      null;
    const nhomGia = nhomForGia?.giaMacDinh ?? null;
    const nextGia = giaNum ?? oldGia ?? nhomGia;
    const nextGiaGiam = giaGiamRaw ? giaGiamNum : null;
    if (giaGiamRaw && nextGia == null) {
      setErr("Nhập giá gốc cho mẫu trước khi nhập giá giảm.");
      return false;
    }
    if (
      nextGia != null &&
      nextGiaGiam != null &&
      nextGiaGiam > nextGia
    ) {
      setErr("Giá giảm không được cao hơn giá gốc.");
      return false;
    }
    const giaChanged =
      (nextGia != null && nextGia !== oldGia) ||
      (giaGiamRaw ? giaGiamNum !== oldGiaGiam : oldGiaGiam != null);

    setSavingId(p.id);
    setErr(null);
    try {
      const nextPhanLoai = draft.phanLoai.trim() || null;
      const nextPhanLoai2 = draft.phanLoai2.trim() || null;

      const tonChanged = tonNum !== bt.soLuongTon;
      if (tonChanged) {
        const tonRes = await fetch(`/api/shop/products/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsertBienThe",
            bienTheId: bt.id,
            nhan: bt.nhan || "Mặc định",
            soLuongTon: tonNum,
          }),
        });
        if (!tonRes.ok) {
          setErr("Không lưu được tồn kho.");
          return false;
        }
      }

      const patchBody: Record<string, unknown> = {
        ten: tenTrim,
        phanLoai: nextPhanLoai,
        phanLoai2: nextPhanLoai2,
        dangBan: draft.dangBan,
        noiBat: draft.noiBat,
      };
      if (draft.anhId !== undefined) {
        patchBody.anhId = draft.anhId;
      }
      const patchRes = await fetch(`/api/shop/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!patchRes.ok) {
        const json = (await patchRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không lưu được sản phẩm.");
        return false;
      }

      const sideOps: Promise<boolean>[] = [];
      if (giaChanged && nextGia != null) {
        sideOps.push(
          saveGiaForBienThe(bt.id, {
            gia: nextGia,
            giaGiam: nextGiaGiam,
          }),
        );
      }
      if (sideOps.length > 0) {
        const sideOk = await Promise.all(sideOps);
        if (sideOk.some((ok) => !ok)) return false;
      }

      const nextIdNhom =
        nextPhanLoai == null
          ? null
          : (nhoms.find(
              (n) => n.truc === 1 && n.nhan.trim() === nextPhanLoai,
            )?.id ??
            p.idNhom ??
            null);
      const nextIdNhom2 =
        nextPhanLoai2 == null
          ? null
          : (nhoms.find(
              (n) => n.truc === 2 && n.nhan.trim() === nextPhanLoai2,
            )?.id ??
            p.idNhom2 ??
            null);

      setProducts((prev) =>
        prev.map((row) => {
          if (row.id !== p.id) return row;
          return {
            ...row,
            ten: tenTrim,
            phanLoai: nextPhanLoai,
            phanLoai2: nextPhanLoai2,
            idNhom: nextIdNhom,
            idNhom2: nextIdNhom2,
            dangBan: draft.dangBan,
            noiBat: draft.noiBat,
            ...(draft.anhId !== undefined
              ? { anhId: draft.anhId, anhUrl: draft.anhUrl ?? null }
              : null),
            bienThe: row.bienThe.map((b) =>
              b.id === bt.id ? { ...b, soLuongTon: tonNum } : b,
            ),
          };
        }),
      );
      adjustNhomCounts([
        {
          oldNhom: p.idNhom ?? null,
          newNhom: nextIdNhom,
          oldNhom2: p.idNhom2 ?? null,
          newNhom2: nextIdNhom2,
        },
      ]);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      return true;
    } finally {
      setSavingId(null);
    }
  }

  async function applyBulkEdit() {
    if (selectedIds.length === 0 || bulkApplying) return;

    if (!lastEditedId) {
      setErr(
        "Sửa một dòng trước, rồi chọn các dòng khác và bấm Áp dụng.",
      );
      return;
    }

    const source = products.find((p) => p.id === lastEditedId);
    if (!source) {
      setErr("Dòng sửa gần nhất không còn trong kho.");
      setLastEditedId(null);
      return;
    }

    const changed = getChangedDraftPatch(source);
    if (!changed) {
      setErr(
        "Dòng vừa sửa chưa có thay đổi chưa lưu. Sửa ít nhất một ô rồi thử lại.",
      );
      return;
    }

    const targets = products.filter(
      (p) => selectedIdSet.has(p.id) && p.id !== source.id,
    );
    if (targets.length === 0) {
      setErr("Chọn thêm các dòng khác (ngoài dòng vừa sửa) để áp dụng.");
      return;
    }

    const applyTen = changed.ten !== undefined;
    const applyPhan = changed.phanLoai !== undefined;
    const applyPhan2 = changed.phanLoai2 !== undefined;
    const applyDangBan = changed.dangBan !== undefined;
    const applyNoiBat = changed.noiBat !== undefined;
    const applyAnh = changed.anhId !== undefined;
    const applyTon = changed.ton !== undefined;
    const applyGia = changed.gia !== undefined;
    const applyGiaGiam = changed.giaGiam !== undefined;

    if (applyNoiBat && changed.noiBat === true) {
      const already = products.filter((p) => {
        if (selectedIdSet.has(p.id) || p.id === source.id) return false;
        const d = drafts[p.id];
        return d ? d.noiBat : p.noiBat === true;
      }).length;
      const applying = 1 + targets.length; // source + targets
      if (already + applying > SHOP_FEATURE_MAX) {
        setErr(
          `Chỉ được gắn ngôi sao tối đa ${SHOP_FEATURE_MAX} sản phẩm (đang còn ${Math.max(0, SHOP_FEATURE_MAX - already)} chỗ).`,
        );
        return;
      }
    }

    setBulkApplying(true);
    setErr(null);

    let tonNum: number | null = null;
    if (applyTon) {
      tonNum = Number.parseInt(changed.ton!, 10);
      if (!Number.isFinite(tonNum) || tonNum < 0) {
        setErr("Tồn kho trên dòng nguồn không hợp lệ.");
        setBulkApplying(false);
        return;
      }
    }

    let giaNum: number | null = null;
    if (applyGia) {
      giaNum = parseGiaInput(changed.gia!);
      if (giaNum == null) {
        setErr("Giá bán trên dòng nguồn không hợp lệ.");
        setBulkApplying(false);
        return;
      }
    }

    let giaGiamNum: number | null = null;
    let clearGiaGiam = false;
    if (applyGiaGiam) {
      const raw = changed.giaGiam!.trim();
      if (!raw) {
        clearGiaGiam = true;
        giaGiamNum = null;
      } else {
        giaGiamNum = parseGiaInput(raw);
        if (giaGiamNum == null) {
          setErr("Giá giảm trên dòng nguồn không hợp lệ.");
          setBulkApplying(false);
          return;
        }
      }
    }

    let bulkSourceGia: number | null = null;
    let bulkSourceGiaGiam: number | null = null;
    if (applyGia || applyGiaGiam) {
      const sourceDraft = getDraft(source);
      bulkSourceGia =
        giaNum ??
        parseGiaInput(sourceDraft.gia) ??
        resolveGiaBienThe(source.bienThe[0]?.id);
      bulkSourceGiaGiam = applyGiaGiam
        ? clearGiaGiam
          ? null
          : giaGiamNum
        : (parseGiaInput(sourceDraft.giaGiam) ??
          resolveGiaGiamBienThe(source.bienThe[0]?.id));
      if (bulkSourceGia == null) {
        setErr("Cần có giá bán trước khi áp dụng giá.");
        setBulkApplying(false);
        return;
      }
      if (
        bulkSourceGiaGiam != null &&
        bulkSourceGiaGiam > bulkSourceGia
      ) {
        setErr("Giá giảm không được cao hơn giá bán.");
        setBulkApplying(false);
        return;
      }
    }

    try {
      // Lưu dòng nguồn trước (các thay đổi chưa lưu).
      if (isRowDirty(source)) {
        const saved = await saveRow(source);
        if (!saved) return;
      }

      if (applyTon) {
        const btResults = await Promise.all(
          targets.map(async (p) => {
            const bt = p.bienThe[0];
            if (!bt) return false;
            const res = await fetch(`/api/shop/products/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "upsertBienThe",
                bienTheId: bt.id,
                nhan: bt.nhan || "Mặc định",
                soLuongTon: tonNum != null ? tonNum : bt.soLuongTon,
              }),
            });
            return res.ok;
          }),
        );
        if (btResults.some((ok) => !ok)) {
          setErr("Một số sản phẩm không lưu được tồn kho.");
          await refreshKho();
          return;
        }
      }

      const productPatch: Record<string, unknown> = {};
      if (applyTen) productPatch.ten = changed.ten!.trim();
      if (applyPhan) productPatch.phanLoai = changed.phanLoai!.trim() || null;
      if (applyPhan2) {
        productPatch.phanLoai2 = changed.phanLoai2!.trim() || null;
      }
      if (applyDangBan) productPatch.dangBan = changed.dangBan;
      if (applyNoiBat) productPatch.noiBat = changed.noiBat;
      if (applyAnh) productPatch.anhId = changed.anhId;

      if (Object.keys(productPatch).length > 0) {
        const results = await Promise.all(
          targets.map(async (p) => {
            const res = await fetch(`/api/shop/products/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productPatch),
            });
            return res.ok;
          }),
        );
        if (results.some((ok) => !ok)) {
          setErr("Một số sản phẩm không lưu được.");
          await refreshKho();
          return;
        }
      }

      if ((applyGia || applyGiaGiam) && bulkSourceGia != null) {
        const targetBang = await ensureBangGiaId(priceLists);
        if (!targetBang) return;
        const bg =
          priceLists.find((b) => b.id === targetBang) ?? priceLists[0];
        // Gồm cả dòng nguồn: saveRow vừa ghi giá mới lên server, nhưng
        // priceLists trong closure vẫn cũ — nếu chỉ PATCH targets thì dòng
        // dong của nguồn (giá cũ / thiếu) sẽ ghi đè lại giá vừa lưu.
        const applyBtIds = [
          source.bienThe[0]?.id,
          ...targets.map((p) => p.bienThe[0]?.id),
        ].filter((id): id is string => Boolean(id));
        const keep = new Set(applyBtIds);
        const dong = [
          ...(bg?.dong.filter((d) => !keep.has(d.idBienThe)) ?? []).map(
            (d) => ({
              idBienThe: d.idBienThe,
              gia: d.gia,
              giaGiam: d.giaGiam ?? null,
            }),
          ),
          ...applyBtIds.map((idBienThe) => {
            const existing = bg?.dong.find((d) => d.idBienThe === idBienThe);
            return {
              idBienThe,
              gia: applyGia ? bulkSourceGia : (existing?.gia ?? bulkSourceGia),
              giaGiam: applyGiaGiam
                ? bulkSourceGiaGiam
                : (existing?.giaGiam ?? null),
            };
          }),
        ];
        const res = await fetch(`/api/shop/price-lists/${targetBang}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dong }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setErr(json?.error ?? "Không lưu được giá hàng loạt.");
          return;
        }
        setPriceLists((prev) =>
          prev.map((b) => {
            if (b.id !== targetBang) return b;
            const byBt = new Map(
              dong.map((d) => [
                d.idBienThe,
                {
                  id:
                    b.dong.find((x) => x.idBienThe === d.idBienThe)?.id ??
                    `local-${d.idBienThe}`,
                  idBienThe: d.idBienThe,
                  gia: d.gia,
                  giaGiam: d.giaGiam,
                },
              ]),
            );
            return { ...b, dong: [...byBt.values()] };
          }),
        );
      }

      const tonApply = applyTon && tonNum != null ? tonNum : null;
      setProducts((prev) =>
        prev.map((row) => {
          const isTarget = targets.some((t) => t.id === row.id);
          if (!isTarget && row.id !== source.id) return row;
          const next = { ...row };
          if (isTarget) {
            if (applyTen) next.ten = changed.ten!.trim();
            if (applyPhan) {
              const label = changed.phanLoai!.trim() || null;
              next.phanLoai = label;
              next.idNhom =
                label == null
                  ? null
                  : (nhoms.find(
                      (n) => n.truc === 1 && n.nhan.trim() === label,
                    )?.id ??
                    row.idNhom ??
                    null);
            }
            if (applyPhan2) {
              const label = changed.phanLoai2!.trim() || null;
              next.phanLoai2 = label;
              next.idNhom2 =
                label == null
                  ? null
                  : (nhoms.find(
                      (n) => n.truc === 2 && n.nhan.trim() === label,
                    )?.id ??
                    row.idNhom2 ??
                    null);
            }
            if (applyDangBan) next.dangBan = changed.dangBan!;
            if (applyNoiBat) next.noiBat = changed.noiBat!;
            if (applyAnh) {
              next.anhId = changed.anhId ?? null;
              next.anhUrl = changed.anhUrl ?? null;
            }
            if (tonApply != null) {
              const bt0 = next.bienThe[0];
              if (bt0) {
                next.bienThe = next.bienThe.map((b, i) =>
                  i === 0 ? { ...b, soLuongTon: tonApply } : b,
                );
              }
            }
          }
          return next;
        }),
      );
      if (applyPhan || applyPhan2) {
        const label1 = applyPhan ? changed.phanLoai!.trim() || null : null;
        const label2 = applyPhan2 ? changed.phanLoai2!.trim() || null : null;
        const resolve = (
          truc: 1 | 2,
          label: string | null,
          fallback: string | null,
        ) =>
          label == null
            ? null
            : (nhoms.find((n) => n.truc === truc && n.nhan.trim() === label)
                ?.id ??
              fallback);
        adjustNhomCounts(
          targets.map((t) => ({
            oldNhom: t.idNhom ?? null,
            newNhom: applyPhan
              ? resolve(1, label1, t.idNhom ?? null)
              : (t.idNhom ?? null),
            oldNhom2: t.idNhom2 ?? null,
            newNhom2: applyPhan2
              ? resolve(2, label2, t.idNhom2 ?? null)
              : (t.idNhom2 ?? null),
          })),
        );
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[source.id];
        for (const p of targets) delete next[p.id];
        return next;
      });
    } finally {
      setBulkApplying(false);
    }
  }

  /**
   * Đổi ảnh trên một dòng. Chọn nhiều file → ảnh đầu gắn dòng này,
   * các ảnh sau xoay lần lượt vào các dòng đang trống (trong danh sách lọc).
   * Thừa hơn số dòng trống → tạo mẫu mới.
   * Blob + % hiện ngay từng dòng.
   */
  async function pickRowThumbs(anchor: ShopSanPham, files: File[]) {
    const list = files.filter((f) => f.size > 0 && isAllowedUploadImageFile(f));
    if (list.length === 0) {
      if (files.length > 0) setErr("File không phải ảnh hợp lệ.");
      return;
    }
    if (isPendingKhoRow(anchor.id) || thumbUploads[anchor.id]) return;

    setErr(null);

    const emptyOthers = filteredProducts.filter(
      (p) =>
        p.id !== anchor.id &&
        !rowHasAnh(p) &&
        !isPendingKhoRow(p.id),
    );
    const draftTargets: ShopSanPham[] = [anchor, ...emptyOthers];

    type Job =
      | { kind: "fill"; product: ShopSanPham; file: File; blobUrl: string }
      | { kind: "create"; pending: ShopSanPham; file: File; blobUrl: string };

    const jobs: Job[] = [];
    const pendingRows: ShopSanPham[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i]!;
      const target = draftTargets[i];
      if (target) {
        const blobUrl = trackBlob(URL.createObjectURL(file));
        jobs.push({ kind: "fill", product: target, file, blobUrl });
      } else {
        const blobUrl = trackBlob(URL.createObjectURL(file));
        const pending = makePendingProduct(file, blobUrl);
        pendingRows.push(pending);
        jobs.push({ kind: "create", pending, file, blobUrl });
      }
    }

    setThumbUploads((prev) => {
      const next = { ...prev };
      for (const job of jobs) {
        const id = job.kind === "fill" ? job.product.id : job.pending.id;
        next[id] = { progress: 1, blobUrl: job.blobUrl };
      }
      return next;
    });
    setLastEditedId(anchor.id);
    if (pendingRows.length > 0) {
      setProducts((prev) => [...pendingRows, ...prev]);
    }

    let failUpload = 0;
    let failCreate = 0;
    const created: ShopSanPham[] = [];
    let okFill = 0;

    await mapPool(jobs, KHO_UPLOAD_CONCURRENCY, async (job) => {
      const rowId = job.kind === "fill" ? job.product.id : job.pending.id;
      const uploaded = await uploadThumb(rowId, job.file, job.blobUrl);
      if (!uploaded) {
        failUpload += 1;
        finishThumbUpload(rowId, job.blobUrl);
        if (job.kind === "create") {
          setProducts((prev) => prev.filter((p) => p.id !== job.pending.id));
        }
        return;
      }

      if (job.kind === "fill") {
        const base = baseDraftForProduct(job.product);
        setDrafts((prev) => ({
          ...prev,
          [job.product.id]: {
            ...(prev[job.product.id] ?? base),
            anhId: uploaded.imageId,
            anhUrl: uploaded.url,
          },
        }));
        finishThumbUpload(rowId, job.blobUrl);
        okFill += 1;
        return;
      }

      try {
        const res = await fetch("/api/shop/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ten: nameFromImageFile(job.file),
            anhId: uploaded.imageId,
            phanLoai: activeNhom?.nhan ?? null,
            phanLoai2: null,
            bienThe: [{ nhan: "Mặc định", soLuongTon: 0 }],
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          item?: ShopSanPham;
          error?: string;
        } | null;
        if (!res.ok || !json?.item) {
          failCreate += 1;
          finishThumbUpload(rowId, job.blobUrl);
          setProducts((prev) => prev.filter((p) => p.id !== job.pending.id));
          return;
        }
        const item = json.item;
        const bt0 = item.bienThe[0];
        if (
          bt0 &&
          activeNhom?.giaMacDinh != null &&
          Number.isFinite(activeNhom.giaMacDinh)
        ) {
          await saveGiaForBienThe(bt0.id, {
            gia: activeNhom.giaMacDinh,
            giaGiam: null,
          });
        }
        created.push(item);
        setProducts((prev) => {
          const withoutPending = prev.filter((p) => p.id !== job.pending.id);
          const ids = new Set(withoutPending.map((p) => p.id));
          if (ids.has(item.id)) {
            return withoutPending.map((p) => (p.id === item.id ? item : p));
          }
          return [item, ...withoutPending];
        });
        finishThumbUpload(rowId, job.blobUrl);
      } catch {
        failCreate += 1;
        finishThumbUpload(rowId, job.blobUrl);
        setProducts((prev) => prev.filter((p) => p.id !== job.pending.id));
      }
    });

    if (created.length > 0) {
      await refreshKho();
    }

    const fail = failUpload + failCreate;
    if (fail > 0) {
      setErr(
        `Đã gắn ${okFill + created.length} ảnh — ${fail} ảnh lỗi.`,
      );
    }
  }

  function renderLoaiColHeader() {
    const label = nhanPhanLoai;
    const options = categoryOptions;
    const selected = filterLoai;
    const hasNone = hasUncategorized;
    const open = filterMenuOpen;

    return (
      <th scope="col" className="shop-grid-col-loai">
        <div className="shop-grid-col-filter" data-shop-filter-menu>
          <button
            type="button"
            className={`shop-grid-filter-btn${selected.length > 0 ? " is-active" : ""}${open ? " is-open" : ""}`}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={`Lọc theo ${label.toLowerCase()}`}
            title={`Lọc theo ${label.toLowerCase()}`}
            onClick={() => setFilterMenuOpen((cur) => !cur)}
          >
            <span>{label}</span>
            <ChevronDown size={13} strokeWidth={2.25} aria-hidden />
            {selected.length > 0 ? (
              <span className="shop-grid-filter-count">{selected.length}</span>
            ) : null}
          </button>
          {open ? (
            <div
              className="shop-filter-dropdown-panel shop-grid-filter-panel"
              role="listbox"
              aria-multiselectable
              aria-label={`Chọn ${label.toLowerCase()}`}
            >
              <label className="shop-filter-dropdown-opt">
                <input
                  type="checkbox"
                  checked={selected.length === 0}
                  onChange={() => toggleFilterLoai("all")}
                />
                <span>Tất cả</span>
              </label>
              {options.map((c) => (
                <label key={c} className="shop-filter-dropdown-opt">
                  <input
                    type="checkbox"
                    checked={selected.includes(c)}
                    onChange={() => toggleFilterLoai(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
              {hasNone ? (
                <label className="shop-filter-dropdown-opt">
                  <input
                    type="checkbox"
                    checked={selected.includes("__none__")}
                    onChange={() => toggleFilterLoai("__none__")}
                  />
                  <span>Chưa có {label.toLowerCase()}</span>
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      </th>
    );
  }

  const attachKioskAfterPublish = useCallback(
    async (
      cotMocId: string,
      postSlug: string | null,
      items: Array<{ idBienThe: string; idBangGia: string; thuTu: number }>,
      biCat: number,
    ) => {
      try {
        const res = await fetch(
          `/api/milestone/${encodeURIComponent(cotMocId)}/shop-products`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          retryAttachRef.current = { cotMocId, postSlug, items, biCat };
          setGioiThieuToast({
            message: `Bài đã đăng nhưng chưa gắn được hàng${json?.error ? `: ${json.error}` : ""}.`,
            canRetry: true,
          });
          return;
        }
        retryAttachRef.current = null;
        window.dispatchEvent(
          new CustomEvent("cins:shop-hang-changed", {
            detail: { milestoneId: cotMocId },
          }),
        );
        const slug = composeOwnerSlug || ownerSlug;
        const link =
          slug && postSlug ? `/${slug}/p/${postSlug}` : null;
        const catHint =
          biCat > 0
            ? ` Bài chỉ gắn tối đa 20 sản phẩm — ${biCat} mẫu còn lại không gắn.`
            : "";
        setGioiThieuToast({
          message: `Đã đăng bài giới thiệu · gắn ${items.length} sản phẩm.${catHint}`,
          postHref: link,
        });
      } catch {
        retryAttachRef.current = { cotMocId, postSlug, items, biCat };
        setGioiThieuToast({
          message: "Bài đã đăng nhưng chưa gắn được hàng.",
          canRetry: true,
        });
      }
    },
    [composeOwnerSlug, ownerSlug],
  );

  /** Ghi mốc lần giới thiệu gần nhất (audit) — không chặn lượt. */
  const recordGioiThieuAfterPublish = useCallback(
    async (nhomId: string, cotMocId: string) => {
      try {
        await fetch(
          `/api/shop/groups/${encodeURIComponent(nhomId)}/about`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cotMocId }),
          },
        );
      } catch {
        /* không chặn UX gắn kiosk */
      }
    },
    [],
  );

  /** Trạng thái «đã từng giới thiệu» cho loại đang mở — GET /about. */
  useEffect(() => {
    if (!activeNhomId || activeNhomId === KHO_ORPHAN_KEY) {
      setGioiThieuLastAt(null);
      setGioiThieuAboutKnown(false);
      return;
    }
    const ac = new AbortController();
    setGioiThieuLastAt(null);
    setGioiThieuAboutKnown(false);
    void (async () => {
      try {
        const res = await fetch(
          `/api/shop/groups/${encodeURIComponent(activeNhomId)}/about`,
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setGioiThieuAboutKnown(false);
          return;
        }
        const data = (await res.json()) as { lastAt?: unknown };
        if (ac.signal.aborted) return;
        setGioiThieuLastAt(
          typeof data.lastAt === "string" ? data.lastAt : null,
        );
        setGioiThieuAboutKnown(true);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!ac.signal.aborted) setGioiThieuAboutKnown(false);
      }
    })();
    return () => ac.abort();
  }, [activeNhomId]);

  useEffect(() => {
    function onPublished(event: Event) {
      const detail = (event as CustomEvent<ComposePublishedDetail>).detail;
      const pending = pendingGioiThieuRef.current;
      if (!pending || !detail?.cotMocId) return;
      pendingGioiThieuRef.current = null;

      const draftKey = buildComposeEditorDraftKey({
        ownerSlug: composeOwnerSlug || ownerSlug || "",
        composeIntent: "photo",
        scope: pending.draftScope,
      });
      clearComposeEditorDraft(draftKey);

      /* Ghi cooldown ngay sau publish — kể cả khi gắn kiosk thất bại. */
      void recordGioiThieuAfterPublish(pending.nhomId, detail.cotMocId);
      /* Tắt highlight ngay (optimistic) — độc lập với audit/kiosk. */
      if (pending.nhomId === activeNhomId) {
        setGioiThieuLastAt(new Date().toISOString());
        setGioiThieuAboutKnown(true);
      }

      const slug = composeOwnerSlug || ownerSlug;
      const link =
        detail.postSlug && slug
          ? `/${slug}/p/${detail.postSlug}`
          : null;
      const biCat = pending.biCat;
      const catHint =
        biCat > 0
          ? ` Bài chỉ gắn tối đa 20 sản phẩm — ${biCat} mẫu còn lại không gắn.`
          : "";

      /* Publish đã gắn hang trong cùng request — không PUT lại (tránh race). */
      if (detail.shopHangAttached) {
        window.dispatchEvent(
          new CustomEvent("cins:shop-hang-changed", {
            detail: { milestoneId: detail.cotMocId },
          }),
        );
        setGioiThieuToast({
          message: `Đã đăng bài giới thiệu · gắn ${detail.shopHangCount ?? pending.attach.length} sản phẩm.${catHint}`,
          postHref: link,
        });
        return;
      }

      if (detail.shopHangError) {
        if (pending.attach.length > 0) {
          retryAttachRef.current = {
            cotMocId: detail.cotMocId,
            postSlug: detail.postSlug ?? null,
            items: pending.attach,
            biCat,
          };
          setGioiThieuToast({
            message: `Bài đã đăng nhưng chưa gắn được hàng: ${detail.shopHangError}`,
            canRetry: true,
            postHref: link,
          });
        } else {
          setGioiThieuToast({
            message: `Bài đã đăng. ${detail.shopHangError}`,
            postHref: link,
          });
        }
        return;
      }

      if (!pending.bangGia) {
        setGioiThieuToast({
          message: "Bài đã đăng. Tạo bảng giá để gắn hàng vào bài.",
          postHref: link,
        });
        return;
      }

      const items =
        pending.attach.length > 0
          ? pending.attach
          : chonBienTheChoKiosk({
              mau: pending.mau,
              bangGia: pending.bangGia,
              nhomGiaById:
                pending.nhomGiaMacDinh != null
                  ? new Map([[pending.nhomId, pending.nhomGiaMacDinh]])
                  : undefined,
            }).items;

      if (items.length === 0) {
        setGioiThieuToast({
          message:
            "Bài đã đăng. Chưa gắn được hàng (thiếu giá, hết hàng hoặc mẫu ngừng bán).",
          postHref: link,
        });
        return;
      }
      void attachKioskAfterPublish(
        detail.cotMocId,
        detail.postSlug ?? null,
        items,
        biCat,
      );
    }
    window.addEventListener(COMPOSE_PUBLISHED_EVENT, onPublished);
    return () =>
      window.removeEventListener(COMPOSE_PUBLISHED_EVENT, onPublished);
  }, [
    activeNhomId,
    attachKioskAfterPublish,
    composeOwnerSlug,
    ownerSlug,
    recordGioiThieuAfterPublish,
  ]);

  /** Nút «Giới thiệu» chỉ hiện khi đủ ảnh + ≥1 mẫu + giá mẫu (min bang_gia_dong). */
  const gioiThieuVisible = useMemo(() => {
    if (!activeNhom) return false;
    const soMau =
      mauCountByNhomId[activeNhom.id] ?? activeNhom.soMau ?? 0;
    const giaTu = giaHubByNhomId[activeNhom.id]?.tu ?? null;
    return (
      nhomGioiThieuCanhBao({ ...activeNhom, soMau }, { giaTu }).length === 0
    );
  }, [activeNhom, mauCountByNhomId, giaHubByNhomId]);

  /** Highlight khi đã biết chắc chưa từng đăng bài giới thiệu. */
  const gioiThieuChuaCo =
    gioiThieuVisible && gioiThieuAboutKnown && gioiThieuLastAt === null;

  const gioiThieuDisabledReason = useMemo(() => {
    if (!activeNhom) return null;
    if (!canCompose) return "Đang tải phiên đăng nhập…";
    const ids = thuThapAnhLoaiHang({ nhom: activeNhom });
    if (ids.length === 0) {
      return "Thêm ảnh chính hoặc ảnh phụ cho loại hàng trước";
    }
    return null;
  }, [activeNhom, canCompose]);

  const activeBangGia = useMemo(() => {
    return (
      (bangGiaId ? priceLists.find((b) => b.id === bangGiaId) : null) ??
      priceLists[0] ??
      null
    );
  }, [bangGiaId, priceLists]);

  const gioiThieuKioskReady = useMemo(() => {
    if (!activeNhom) return null;
    const nhomGia = new Map<string, number>();
    if (activeNhom.giaMacDinh != null) {
      nhomGia.set(activeNhom.id, activeNhom.giaMacDinh);
    }
    return danhGiaGioiThieuKiosk({
      mau: filteredProducts,
      bangGia: activeBangGia,
      nhomGiaById: nhomGia,
    });
  }, [activeNhom, filteredProducts, activeBangGia]);

  const gioiThieuKioskWarn = useMemo(() => {
    if (!gioiThieuKioskReady || gioiThieuKioskReady.ok) return null;
    return gioiThieuKioskReady.message;
  }, [gioiThieuKioskReady]);

  async function onGioiThieuSanPham(opts?: { moTa?: string }) {
    if (!activeNhom || gioiThieuBusy) return;
    if (gioiThieuDisabledReason || !canCompose) {
      setErr(gioiThieuDisabledReason ?? "Chưa sẵn sàng soạn bài.");
      return;
    }
    setGioiThieuBusy(true);
    setErr(null);
    setGioiThieuToast(null);
    try {
      const moTaFresh =
        opts?.moTa !== undefined ? opts.moTa : (activeNhom.moTa ?? "");
      const nhomForPrefill: ShopNhom = {
        ...activeNhom,
        moTa: moTaFresh.trim() || null,
      };
      const imageIds = thuThapAnhLoaiHang({ nhom: nhomForPrefill });
      const urls = mapAnhUrlLoaiHang({
        nhom: nhomForPrefill,
        imageIds,
      });
      const kichThuoc = await doKichThuocAnh(imageIds, urls);
      const prefillDraft = buildPrefillGioiThieu({
        nhom: nhomForPrefill,
        imageIds,
        kichThuoc,
      });
      const draftScope = shopGioiThieuDraftScope(activeNhom.id);
      /* Xóa nháp cũ cùng scope — tránh mô tả phẳng / mất list từ lần mở trước. */
      const owner = (composeOwnerSlug || ownerSlug || "").trim();
      if (owner) {
        clearComposeEditorDraft(
          buildComposeEditorDraftKey({
            ownerSlug: owner,
            composeIntent: "photo",
            scope: draftScope,
          }),
        );
      }
      const bg = activeBangGia;
      const nhomGia = new Map<string, number>();
      if (activeNhom.giaMacDinh != null) {
        nhomGia.set(activeNhom.id, activeNhom.giaMacDinh);
      }
      const ready = danhGiaGioiThieuKiosk({
        mau: filteredProducts,
        bangGia: bg,
        nhomGiaById: nhomGia,
      });
      pendingGioiThieuRef.current = {
        nhomId: activeNhom.id,
        draftScope,
        mau: filteredProducts,
        bangGia: bg,
        nhomGiaMacDinh: activeNhom.giaMacDinh,
        attach: ready.attach,
        biCat: ready.stats.biCat,
      };
      openCompose({
        kind: "photo",
        prefillDraft,
        draftScope,
        shopKioskPreview: {
          items: ready.items,
          attach: ready.attach,
          hint: ready.ok
            ? ready.hint
            : ready.hint || ready.message,
        },
      });
    } catch {
      setErr("Không mở được trình soạn bài giới thiệu.");
      pendingGioiThieuRef.current = null;
    } finally {
      setGioiThieuBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="shop-dash-loading" aria-busy="true">
        <Loader2 className="shop-spin" size={20} aria-hidden />
        Đang tải…
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="shop-dash-gate">
        <h1>Quản lý kho hàng</h1>
        <p>
          Chức năng bán hàng đang tắt. Bật trong{" "}
          <strong>Cài đặt tài khoản → Bán hàng</strong>, hoặc{" "}
          <Link href="/">về trang chủ</Link> rồi mở menu tài khoản.
        </p>
      </div>
    );
  }

  if (activeNhomId == null) {
    return (
      <>
        {err ? <p className="shop-dash-err">{err}</p> : null}
        <section className="shop-dash-card">
          <ShopKhoLoaiHub
            nhoms={nhoms}
            mauCountByNhomId={mauCountByNhomId}
            orphanCount={orphanCount}
            nhanPhanLoai={nhanPhanLoai}
            onOpenNhom={openKhoNhom}
            onOpenOrphans={openKhoOrphans}
            onNhomsChanged={setNhoms}
            onError={setErr}
            tiepCanByNhomId={tiepCanByNhomId}
            giaHubByNhomId={giaHubByNhomId}
          />
        </section>
      </>
    );
  }

  return (
    <>
      {err ? <p className="shop-dash-err">{err}</p> : null}
      {gioiThieuToast ? (
        <p className="shop-dash-hint shop-kho-gioi-thieu-toast" role="status">
          {gioiThieuToast.message}
          {gioiThieuToast.postHref ? (
            <>
              {" "}
              <Link
                href={gioiThieuToast.postHref}
                className="shop-kho-gioi-thieu-retry"
              >
                Xem bài
              </Link>
            </>
          ) : null}
          {gioiThieuToast.canRetry ? (
            <>
              {" "}
              <button
                type="button"
                className="shop-kho-gioi-thieu-retry"
                onClick={() => {
                  const r = retryAttachRef.current;
                  if (!r) return;
                  void attachKioskAfterPublish(
                    r.cotMocId,
                    r.postSlug,
                    r.items,
                    r.biCat,
                  );
                }}
              >
                Thử lại
              </button>
            </>
          ) : null}{" "}
          <button
            type="button"
            className="shop-kho-gioi-thieu-retry"
            onClick={() => setGioiThieuToast(null)}
            aria-label="Đóng thông báo"
          >
            Đóng
          </button>
        </p>
      ) : null}

      <section className="shop-dash-card shop-dash-card--loai-meta">
        {activeNhom ? (
          <ShopKhoLoaiMeta
            key={activeNhom.id}
            nhom={activeNhom}
            mauCount={mauCountByNhomId[activeNhom.id] ?? 0}
            storefrontLoaiHref={activeNhomStorefrontHref}
            onBack={goKhoHub}
            onUpdated={(n) => {
              setNhoms((prev) => {
                const next = prev.map((x) => (x.id === n.id ? n : x));
                router.replace(shopKhoLoaiHref(n, next));
                return next;
              });
              void refreshKho();
            }}
            onDeleted={() => {
              setNhoms((prev) => prev.filter((x) => x.id !== activeNhom.id));
              goKhoHub();
              void refreshKho();
            }}
            onError={setErr}
            onRefreshMau={() => void refreshKho()}
            onGioiThieu={(opts) => void onGioiThieuSanPham(opts)}
            gioiThieuBusy={gioiThieuBusy}
            gioiThieuDisabledReason={gioiThieuDisabledReason}
            gioiThieuKioskWarn={gioiThieuKioskWarn}
            gioiThieuVisible={gioiThieuVisible}
            gioiThieuChuaCo={gioiThieuChuaCo}
          />
        ) : (
          <div className="shop-kho-loai-meta">
            <button
              type="button"
              className="shop-kho-loai-back"
              onClick={goKhoHub}
            >
              ← Tất cả loại hàng
            </button>
            <h2>Chưa gán loại</h2>
            <p className="shop-dash-hint">
              Gán cột «{nhanPhanLoai}» cho mẫu để đưa vào loại trên mặt tiền.
            </p>
          </div>
        )}
      </section>

      <section className="shop-dash-card shop-dash-card--loai-mau">
        <div className="shop-dash-kho-head">
          <div className="shop-dash-kho-title-row">
            <h2>
              {activeNhom ? "Danh mục hàng" : "Mẫu"} (
              {filteredProducts.length}
              {filterLoai.length > 0 ? ` / ${products.length}` : ""}
              )
            </h2>
          </div>
          <div className="shop-kho-toolbar">
            <div className="shop-kho-toolbar-actions">
              <div className="shop-kho-add-hang" data-shop-add-hang>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void handleAddImages(files);
                  }}
                />
                {addHangOpen || uploading ? (
                  <>
                    <button
                      type="button"
                      className="shop-kho-add-btn"
                      disabled={saving || uploading || deleting || bulkApplying}
                      title="Thêm một mẫu mới (vào chế độ Sửa)"
                      onClick={() => {
                        setAddHangOpen(false);
                        void createBlankProduct();
                      }}
                    >
                      {saving ? (
                        <Loader2 className="shop-spin" size={15} />
                      ) : (
                        <Plus size={15} strokeWidth={2.25} aria-hidden />
                      )}
                      Thêm dòng mới
                    </button>
                    <button
                      type="button"
                      className="shop-kho-add-btn"
                      disabled={saving || uploading || deleting || bulkApplying}
                      title="Thêm nhiều mẫu từ ảnh — ưu tiên dòng trống, thừa thì tạo mẫu mới"
                      aria-label="Tải ảnh hàng loạt"
                      onClick={() => {
                        if (!khoEditing) enterKhoEditing();
                        fileRef.current?.click();
                      }}
                    >
                      {uploading ? (
                        <span className="shop-kho-upload-progress" aria-live="polite">
                          {uploadProgressAvg}%
                        </span>
                      ) : (
                        <ImagePlus size={15} strokeWidth={2} aria-hidden />
                      )}
                      Tải ảnh hàng loạt
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="shop-kho-add-btn"
                    disabled={saving || uploading || deleting || bulkApplying}
                    title="Thêm mẫu — dòng mới hoặc tải ảnh hàng loạt"
                    aria-expanded={false}
                    aria-haspopup="true"
                    onClick={() => setAddHangOpen(true)}
                  >
                    <Plus size={15} strokeWidth={2.25} aria-hidden />
                    Thêm hàng
                    <ChevronDown
                      className="shop-kho-add-chevron"
                      size={14}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </button>
                )}
              </div>
              {khoEditing && selectedIds.length > 0 ? (
                <button
                  type="button"
                  className="shop-kho-bulk-delete-btn"
                  disabled={saving || uploading || deleting || bulkApplying}
                  title={`Xóa ${selectedIds.length} mẫu đã chọn`}
                  aria-label={`Xóa ${selectedIds.length} mẫu đã chọn`}
                  onClick={() => {
                    const items = products
                      .filter((p) => selectedIdSet.has(p.id))
                      .map((p) => ({ id: p.id, ten: p.ten }));
                    if (items.length > 0) setDeleteTargets(items);
                  }}
                >
                  <Trash2 size={15} strokeWidth={2} aria-hidden />
                  Xóa
                  {selectedIds.length > 1 ? (
                    <span className="shop-kho-bulk-delete-count">
                      {selectedIds.length}
                    </span>
                  ) : null}
                </button>
              ) : null}
              <button
                type="button"
                className={`shop-dash-kho-edit-btn shop-dash-kho-edit-btn--primary${khoEditing ? " is-active" : ""}`}
                aria-pressed={khoEditing}
                disabled={exitingSave}
                onClick={() => {
                  if (khoEditing) requestExitKhoEditing();
                  else enterKhoEditing();
                }}
              >
                {khoEditing ? (
                  <>
                    <Check size={15} strokeWidth={2.25} aria-hidden />
                    Xong
                  </>
                ) : (
                  <>
                    <Pencil size={15} strokeWidth={2} aria-hidden />
                    Sửa bảng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="shop-grid-wrap">
          <table className={`shop-grid shop-grid--kho${khoEditing ? "" : " shop-grid--readonly"}`}>
            <thead>
              <tr>
                {khoEditing ? (
                  <th scope="col" className="shop-grid-col-check">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      disabled={filteredProducts.length === 0 || bulkApplying}
                      aria-label="Chọn tất cả sản phẩm đang hiện"
                      onChange={toggleSelectAll}
                    />
                  </th>
                ) : null}
                <th scope="col" className="shop-grid-col-thumb">
                  Ảnh
                </th>
                <th scope="col" className="shop-grid-col-name">
                  Tên sản phẩm
                </th>
                {renderLoaiColHeader()}
                <th scope="col" className="shop-grid-col-ton">
                  <button
                    type="button"
                    className={`shop-grid-sort-btn${sortTon !== "none" ? " is-active" : ""}`}
                    onClick={cycleSortTon}
                    aria-label={
                      sortTon === "none"
                        ? "Sắp xếp tồn kho"
                        : sortTon === "nhieu"
                          ? "Đang sắp: còn nhiều hàng trước. Bấm để xếp hết hàng trước"
                          : "Đang sắp: hết hàng trước. Bấm để bỏ sắp xếp"
                    }
                    title={
                      sortTon === "none"
                        ? "Bấm để sắp: còn nhiều hàng → hết hàng → mặc định"
                        : sortTon === "nhieu"
                          ? "Còn nhiều hàng trước"
                          : "Hết hàng trước"
                    }
                  >
                    <span>Tồn kho</span>
                    {sortTon === "nhieu" ? (
                      <ArrowDownWideNarrow size={13} strokeWidth={2.25} aria-hidden />
                    ) : sortTon === "het" ? (
                      <ArrowUpNarrowWide size={13} strokeWidth={2.25} aria-hidden />
                    ) : (
                      <ArrowUpDown
                        className="shop-grid-sort-icon--idle"
                        size={13}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    )}
                  </button>
                </th>
                <th scope="col" className="shop-grid-col-gia">
                  Giá gốc
                </th>
                <th scope="col" className="shop-grid-col-gia-giam">
                  Giá giảm
                </th>
                <th scope="col" className="shop-grid-col-status">
                  Tình trạng
                </th>
                {khoEditing ? (
                  <th scope="col" className="shop-grid-col-actions">
                    Thao tác
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr className="shop-grid-row shop-grid-row--empty">
                  <td colSpan={khoEditing ? 9 : 7}>
                    {products.length === 0
                      ? khoEditing
                        ? "Chưa có mẫu — bấm Thêm mẫu để tạo dòng trống."
                        : "Chưa có mẫu — bấm Sửa để thêm."
                      : "Không có mẫu trong loại này."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, rowIndex) => {
                  const bt = p.bienThe[0];
                  const draft = getDraft(p);
                  const dirty = isRowDirty(p);
                  const displayAnh = rowDisplayAnh(p);
                  const rowFit = parseShopThumbFit(p.anhThumbFit);
                  const thumbUpload = thumbUploads[p.id];
                  const rowUploading = Boolean(thumbUpload);
                  const rowPending = isPendingKhoRow(p.id);
                  const rowSaving = savingId === p.id;
                  const rowFileId = `shop-row-thumb-${p.id}`;
                  const giaHienThi = resolveGiaBienThe(bt?.id);
                  const giaGiamHienThi = resolveGiaGiamBienThe(bt?.id);
                  const dangBanHienThi = khoEditing
                    ? draft.dangBan
                    : p.dangBan !== false;
                  const isSelected = selectedIdSet.has(p.id);
                  const isBulkSource = khoEditing && lastEditedId === p.id;
                  const changedFields =
                    isBulkSource ? getChangedDraftPatch(p) : null;
                  const cellChanged = (key: keyof RowDraft) =>
                    changedFields != null && changedFields[key] !== undefined
                      ? " shop-grid-cell--changed"
                      : "";
                  const applyTargetCount = selectedIds.filter(
                    (id) => id !== p.id,
                  ).length;
                  const selectedCount = selectedIds.length;
                  const showCellApply =
                    isBulkSource &&
                    changedFields != null &&
                    applyTargetCount > 0 &&
                    !rowUploading &&
                    !rowPending;
                  const firstChangedField = (
                    [
                      "anhId",
                      "ten",
                      "phanLoai",
                      "phanLoai2",
                      "ton",
                      "gia",
                      "giaGiam",
                      "dangBan",
                    ] as const
                  ).find(
                    (key) =>
                      changedFields != null &&
                      changedFields[key] !== undefined,
                  );
                  const cellApplyBtn = (key: keyof RowDraft) => {
                    if (!showCellApply || firstChangedField !== key) {
                      return null;
                    }
                    return (
                      <button
                        type="button"
                        className="shop-grid-cell-apply"
                        disabled={bulkApplying || rowSaving}
                        title={`Áp dụng sang ${applyTargetCount} dòng (đang chọn ${selectedCount})`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void applyBulkEdit();
                        }}
                      >
                        {bulkApplying ? (
                          <Loader2 className="shop-spin" size={12} />
                        ) : null}
                        Áp dụng {selectedCount} nội dung đang chọn
                      </button>
                    );
                  };
                  return (
                    <tr
                      key={p.id}
                      className={`shop-grid-row${dirty && khoEditing ? " is-dirty" : ""}${!dangBanHienThi ? " is-ngung-ban" : ""}${isSelected && khoEditing ? " is-selected" : ""}${isBulkSource && changedFields ? " is-bulk-source" : ""}${rowUploading ? " is-uploading-thumb" : ""}`}
                    >
                      {khoEditing ? (
                        <td
                          className="shop-grid-col-check"
                          data-label="Chọn"
                          onClick={(e) => {
                            if (rowSaving || bulkApplying || deleting) return;
                            /* Click padding ô — input tự xử lý qua onChange. */
                            if ((e.target as HTMLElement).closest("input")) {
                              return;
                            }
                            applySelect(
                              p.id,
                              rowIndex,
                              e.shiftKey,
                              e.ctrlKey || e.metaKey,
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={rowSaving || bulkApplying || deleting}
                            aria-label={`Chọn ${p.ten}`}
                            title="Click chọn · Ctrl chọn nhiều · Shift chọn dải"
                            onMouseDown={(e) => {
                              selectModsRef.current = {
                                shift: e.shiftKey,
                                ctrl: e.ctrlKey || e.metaKey,
                              };
                            }}
                            onChange={() => {
                              applySelect(
                                p.id,
                                rowIndex,
                                selectModsRef.current.shift,
                                selectModsRef.current.ctrl,
                              );
                              selectModsRef.current = {
                                shift: false,
                                ctrl: false,
                              };
                            }}
                          />
                        </td>
                      ) : null}
                      <td
                        className={`shop-grid-col-thumb${cellChanged("anhId")}`}
                        data-label="Ảnh"
                        title={
                          cellChanged("anhId")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("anhId")}
                        {!khoEditing ? (
                          displayAnh ? (
                            <div className="shop-thumb-pick">
                              <div
                                className="shop-grid-readonly-thumb"
                                data-shop-thumb-fit={rowFit}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={displayAnh} alt="" width={48} height={48} />
                              </div>
                              <ShopThumbFitBtn
                                fit={rowFit}
                                onToggle={() => toggleRowThumbFit(p)}
                              />
                            </div>
                          ) : (
                            <div className="shop-grid-readonly-thumb is-empty">
                              —
                            </div>
                          )
                        ) : (
                        <div
                          className="shop-thumb-pick"
                          tabIndex={0}
                          onPaste={(e) => {
                            if (rowUploading || rowPending || rowSaving) return;
                            const files = imageFilesFromClipboard(
                              e.clipboardData,
                            );
                            if (files.length === 0) return;
                            e.preventDefault();
                            e.stopPropagation();
                            void pickRowThumbs(p, files);
                          }}
                        >
                          <input
                            id={rowFileId}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            disabled={rowUploading || rowPending || rowSaving}
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              e.target.value = "";
                              if (files.length > 0) void pickRowThumbs(p, files);
                            }}
                          />
                          <div
                            className={`shop-thumb-frame${displayAnh ? " has-img" : ""}${rowUploading ? " is-uploading" : ""}`}
                            data-shop-thumb-fit={rowFit}
                          >
                            {displayAnh ? (
                              <button
                                type="button"
                                className="shop-thumb-img-btn"
                                disabled={rowUploading || rowPending || rowSaving}
                                aria-label="Đổi ảnh"
                                title="Chọn ảnh từ máy"
                                onClick={() =>
                                  document.getElementById(rowFileId)?.click()
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={displayAnh} alt="" width={48} height={48} />
                              </button>
                            ) : rowSaving ? (
                              <Loader2 className="shop-spin" size={18} />
                            ) : (
                              <div className="shop-thumb-empty-acts">
                                <button
                                  type="button"
                                  className="shop-thumb-placeholder shop-thumb-placeholder--pick"
                                  aria-label="Chọn ảnh từ máy"
                                  title="Chọn ảnh"
                                  disabled={rowUploading || rowPending || rowSaving}
                                  onClick={() =>
                                    document.getElementById(rowFileId)?.click()
                                  }
                                >
                                  <ImagePlus size={14} strokeWidth={2} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="shop-thumb-placeholder shop-thumb-placeholder--paste"
                                  aria-label="Dán ảnh từ bộ nhớ tạm"
                                  title="Dán ảnh (nhiều ảnh → dòng trống) · hoặc Ctrl+V"
                                  disabled={rowUploading || rowPending || rowSaving}
                                  onPointerDown={() => {
                                    if (rowUploading || rowPending || rowSaving) {
                                      return;
                                    }
                                    pendingClipboardReadRef.current =
                                      beginClipboardImageRead();
                                  }}
                                  onClick={(e) => {
                                    const pick = (
                                      e.currentTarget as HTMLElement
                                    ).closest(
                                      ".shop-thumb-pick",
                                    ) as HTMLElement | null;
                                    void (async () => {
                                      const pending =
                                        pendingClipboardReadRef.current;
                                      pendingClipboardReadRef.current = null;
                                      const result = await (pending ??
                                        readImageFilesFromClipboardDetailed());
                                      if (result.files.length > 0) {
                                        void pickRowThumbs(p, result.files);
                                        return;
                                      }
                                      pick?.focus();
                                      setErr(
                                        clipboardImageFailureMessage(
                                          result.reason,
                                        ),
                                      );
                                    })();
                                  }}
                                >
                                  <ClipboardPaste size={14} strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                            )}
                            {thumbUpload ? (
                              <span
                                className="shop-thumb-upload-pct"
                                aria-busy="true"
                                aria-label={`Đang tải ${thumbUpload.progress}%`}
                              >
                                {thumbUpload.progress}%
                              </span>
                            ) : null}
                            {displayAnh && !rowUploading ? (
                              <button
                                type="button"
                                className="shop-thumb-clear"
                                aria-label="Xóa ảnh"
                                title="Xóa ảnh"
                                disabled={rowPending || rowSaving}
                                onClick={() =>
                                  patchDraft(
                                    p.id,
                                    { anhId: null, anhUrl: null },
                                    baseDraftForProduct(p),
                                  )
                                }
                              >
                                <X size={12} />
                              </button>
                            ) : null}
                          </div>
                          {displayAnh ? (
                            <ShopThumbFitBtn
                              fit={rowFit}
                              disabled={rowUploading || rowPending || rowSaving}
                              onToggle={() => toggleRowThumbFit(p)}
                            />
                          ) : null}
                        </div>
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-name${cellChanged("ten")}`}
                        data-label="Tên sản phẩm"
                        title={
                          cellChanged("ten")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("ten")}
                        {!khoEditing ? (
                          <strong>{p.ten}</strong>
                        ) : (
                          <input
                            value={draft.ten}
                            disabled={rowSaving}
                            placeholder="Tên sản phẩm"
                            aria-label={`Tên ${p.ten}`}
                            onChange={(e) =>
                              patchDraft(
                                p.id,
                                { ten: e.target.value },
                                baseDraftForProduct(p),
                              )
                            }
                          />
                        )}
                        {bt &&
                        (khoEditing
                          ? Number.parseInt(draft.ton, 10) <= 0
                          : (bt.soLuongTon ?? 0) <= 0) ? (
                          <div className="shop-dash-hint">Đợi restock</div>
                        ) : null}
                      </td>
                      <td
                        className={`shop-grid-col-loai${cellChanged("phanLoai")}`}
                        data-label={nhanPhanLoai}
                        title={
                          cellChanged("phanLoai")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("phanLoai")}
                        {!khoEditing ? (
                          <span className="shop-grid-readonly-val">
                            {p.phanLoai?.trim() || "—"}
                          </span>
                        ) : (
                        <ShopPhanLoaiInput
                          className="shop-phan-loai-inline"
                          value={draft.phanLoai}
                          options={categoryOptions}
                          placeholder="—"
                          aria-label={`${nhanPhanLoai} ${p.ten}`}
                          disabled={rowSaving}
                          onChange={(v) =>
                            patchDraft(
                              p.id,
                              { phanLoai: v },
                              baseDraftForProduct(p),
                            )
                          }
                        />
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-ton${cellChanged("ton")}`}
                        data-label="Tồn kho"
                        title={
                          cellChanged("ton")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("ton")}
                        {!khoEditing ? (
                          <span className="shop-grid-readonly-val">
                            {bt ? bt.soLuongTon : "—"}
                          </span>
                        ) : bt ? (
                          <input
                            className="shop-dash-ton"
                            type="number"
                            value={draft.ton}
                            disabled={rowSaving}
                            onChange={(e) =>
                              patchDraft(
                                p.id,
                                { ton: e.target.value },
                                baseDraftForProduct(p),
                              )
                            }
                            aria-label={`Tồn kho ${p.ten}`}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-gia${cellChanged("gia")}`}
                        data-label="Giá gốc"
                        title={
                          cellChanged("gia")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : "Giá gốc riêng của mẫu"
                        }
                      >
                        {cellApplyBtn("gia")}
                        {!khoEditing ? (
                          <span className="shop-grid-readonly-val">
                            {giaHienThi != null
                              ? `${giaHienThi.toLocaleString("vi-VN")} ${currentTienTe()}`
                              : "—"}
                          </span>
                        ) : bt ? (
                          <div className="shop-gia-cell">
                            <input
                              value={draft.gia}
                              placeholder="—"
                              inputMode="decimal"
                              disabled={rowSaving}
                              aria-label={`Giá gốc ${p.ten} (${currentTienTe()})`}
                              onChange={(e) =>
                                patchDraft(
                                  p.id,
                                  { gia: e.target.value },
                                  baseDraftForProduct(p),
                                )
                              }
                            />
                            <span
                              className="shop-tien-te-badge"
                              title="Theo bảng giá đang chọn"
                            >
                              {currentTienTe()}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-gia-giam${cellChanged("giaGiam")}`}
                        data-label="Giá giảm"
                        title={
                          cellChanged("giaGiam")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("giaGiam")}
                        {!khoEditing ? (
                          <span className="shop-grid-readonly-val">
                            {giaGiamHienThi != null
                              ? `${giaGiamHienThi.toLocaleString("vi-VN")} ${currentTienTe()}`
                              : "—"}
                          </span>
                        ) : bt ? (
                          <div className="shop-gia-cell">
                            <input
                              value={draft.giaGiam}
                              placeholder="—"
                              inputMode="decimal"
                              disabled={rowSaving}
                              aria-label={`Giá giảm ${p.ten} (${currentTienTe()})`}
                              onChange={(e) =>
                                patchDraft(
                                  p.id,
                                  { giaGiam: e.target.value },
                                  baseDraftForProduct(p),
                                )
                              }
                            />
                            <span
                              className="shop-tien-te-badge"
                              title="Theo bảng giá đang chọn"
                            >
                              {currentTienTe()}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-status${cellChanged("dangBan")}`}
                        data-label="Tình trạng"
                        title={
                          cellChanged("dangBan")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("dangBan")}
                        {!khoEditing ? (
                          <span
                            className={`shop-status ${dangBanHienThi ? "shop-status--dang_ban" : "shop-status--ngung_ban"}`}
                          >
                            {dangBanHienThi ? "Đang bán" : "Ngừng bán"}
                          </span>
                        ) : (
                          <select
                            className="shop-status-select"
                            value={draft.dangBan ? "1" : "0"}
                            disabled={rowSaving}
                            aria-label={`Tình trạng ${p.ten}`}
                            title="Còn kinh doanh hay đã ngừng bán"
                            onChange={(e) =>
                              patchDraft(
                                p.id,
                                { dangBan: e.target.value === "1" },
                                baseDraftForProduct(p),
                              )
                            }
                          >
                            <option value="1">Đang bán</option>
                            <option value="0">Ngừng bán</option>
                          </select>
                        )}
                      </td>
                      {khoEditing ? (
                      <td className="shop-grid-col-actions" data-label="Thao tác">
                        <div className="shop-grid-actions">
                          {dirty ? (
                            <button
                              type="button"
                              className="shop-btn-save"
                              disabled={
                                rowSaving || rowUploading || rowPending
                              }
                              onClick={() => void saveRow(p)}
                              aria-label="Lưu thay đổi"
                              title="Lưu"
                            >
                              {rowSaving ? (
                                <Loader2 className="shop-spin" size={16} />
                              ) : (
                                <Save size={16} strokeWidth={2} />
                              )}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={
                              rowSaving ||
                              rowUploading ||
                              rowPending ||
                              deleting ||
                              bulkApplying
                            }
                            onClick={() =>
                              setDeleteTargets([{ id: p.id, ten: p.ten }])
                            }
                            aria-label={`Xóa ${p.ten}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteTargets.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              className="shop-kho-delete-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !deleting) {
                  setDeleteTargets([]);
                }
              }}
            >
              <div
                className="shop-kho-delete-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="shop-kho-delete-title"
                aria-describedby="shop-kho-delete-desc"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="shop-kho-delete-icon" aria-hidden>
                  <AlertTriangle size={22} strokeWidth={2.2} />
                </div>
                <h3 id="shop-kho-delete-title">
                  {deleteTargets.length === 1
                    ? "Xóa sản phẩm?"
                    : `Xóa ${deleteTargets.length} sản phẩm?`}
                </h3>
                <p id="shop-kho-delete-desc" className="shop-kho-delete-desc">
                  {deleteTargets.length === 1 ? (
                    <>
                      Bạn sắp xóa «{deleteTargets[0]!.ten}» khỏi kho. Hàng này
                      sẽ không còn hiện trên bảng giá / post bán. Hành động này
                      sẽ không thể hoàn tác.
                    </>
                  ) : (
                    <>
                      Bạn sắp xóa {deleteTargets.length} sản phẩm đã chọn khỏi
                      kho (gồm «{deleteTargets[0]!.ten}»
                      {deleteTargets.length > 1
                        ? ` và ${deleteTargets.length - 1} sản phẩm khác`
                        : ""}
                      ). Chúng sẽ không còn hiện trên bảng giá / post bán. Hành
                      động này sẽ không thể hoàn tác.
                    </>
                  )}
                </p>
                <div className="shop-kho-delete-actions">
                  <button
                    type="button"
                    className="shop-kho-delete-cancel"
                    disabled={deleting}
                    onClick={() => setDeleteTargets([])}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="shop-dash-danger shop-kho-delete-confirm"
                    disabled={deleting}
                    onClick={() => void confirmRemoveProduct()}
                  >
                    {deleting ? (
                      <Loader2 className="shop-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {deleteTargets.length === 1
                      ? "Xóa sản phẩm"
                      : `Xóa ${deleteTargets.length} sản phẩm`}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {exitConfirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="shop-kho-delete-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !exitingSave) {
                  setExitConfirmOpen(false);
                }
              }}
            >
              <div
                className="shop-kho-delete-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="shop-kho-exit-title"
                aria-describedby="shop-kho-exit-desc"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="shop-kho-exit-icon" aria-hidden>
                  <Save size={20} strokeWidth={2.2} />
                </div>
                <h3 id="shop-kho-exit-title">Lưu thay đổi?</h3>
                <p id="shop-kho-exit-desc" className="shop-kho-delete-desc">
                  Còn {countDirtyRows()} sản phẩm chưa lưu. Bạn muốn lưu hết trước
                  khi thoát chế độ sửa không?
                </p>
                <div className="shop-kho-delete-actions">
                  <button
                    type="button"
                    className="shop-kho-delete-cancel"
                    disabled={exitingSave}
                    onClick={() => setExitConfirmOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="shop-kho-exit-discard"
                    disabled={exitingSave}
                    onClick={() => exitKhoEditing()}
                  >
                    Không lưu
                  </button>
                  <button
                    type="button"
                    className="shop-kho-exit-save"
                    disabled={exitingSave}
                    onClick={() => void confirmExitSaveAll()}
                  >
                    {exitingSave ? (
                      <Loader2 className="shop-spin" size={16} aria-hidden />
                    ) : (
                      <Save size={15} strokeWidth={2.25} aria-hidden />
                    )}
                    Lưu hết
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}


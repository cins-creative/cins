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
  Pencil,
  Plus,
  Save,
  Star,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  imageFilesFromClipboard,
  readImageFileFromClipboard,
} from "@/lib/files/clipboard-images";
import type { ShopBangGia, ShopCuaHang, ShopNhom, ShopSanPham } from "@/lib/shop/types";
import {
  resolveShopNhanPhanLoai,
  resolveShopNhanPhanLoai2,
  SHOP_FEATURE_MAX,
  SHOP_NHAN_PHAN_LOAI_2_DEFAULT,
  SHOP_NHAN_PHAN_LOAI_DEFAULT,
  SHOP_NHOM_MO_TA_MAX,
} from "@/lib/shop/types";
import { fetchBanHangClientStatus } from "@/lib/shop/client-fetch-cache";

import { ShopDashTabs } from "./ShopDashTabs";
import { ShopNhomMoTaField } from "./ShopNhomMoTaField";
import { ShopPhanLoaiInput } from "./ShopPhanLoaiInput";
import { ShopTienTeSelect } from "./ShopTienTeSelect";
import "./shop-dashboard.css";

type SortTon = "none" | "nhieu" | "het";

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

export function ShopKhoClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [products, setProducts] = useState<ShopSanPham[]>([]);
  const [priceLists, setPriceLists] = useState<ShopBangGia[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bangGiaId, setBangGiaId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  /** Lọc multi theo cột phân loại 1 / 2 (`__none__` = chưa gán). */
  const [filterLoai, setFilterLoai] = useState<string[]>([]);
  const [filterLoai2, setFilterLoai2] = useState<string[]>([]);
  /** Sắp xếp theo tồn: none · còn nhiều trước · hết hàng trước. */
  const [sortTon, setSortTon] = useState<SortTon>("none");
  const [khoEditing, setKhoEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [thumbMenuKey, setThumbMenuKey] = useState<string | null>(null);
  /** Popup lọc trên header cột: 1 | 2 | đóng. */
  const [filterMenuOpen, setFilterMenuOpen] = useState<1 | 2 | null>(null);
  const [bangGiaMenuOpen, setBangGiaMenuOpen] = useState(false);
  const [renamingBangId, setRenamingBangId] = useState<string | null>(null);
  const [renameBangDraft, setRenameBangDraft] = useState("");
  const [renameBangTienTe, setRenameBangTienTe] = useState("VND");
  /** Sản phẩm đang chờ xác nhận xóa (1 hoặc nhiều). */
  const [deleteTargets, setDeleteTargets] = useState<
    Array<{ id: string; ten: string }>
  >([]);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectIndexRef = useRef<number | null>(null);
  const shiftHeldRef = useRef(false);
  /** Dòng vừa sửa gần nhất — nguồn cho Áp dụng hàng loạt. */
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [nhanPhanLoai, setNhanPhanLoai] = useState(SHOP_NHAN_PHAN_LOAI_DEFAULT);
  const [nhanPhanLoai2, setNhanPhanLoai2] = useState(
    SHOP_NHAN_PHAN_LOAI_2_DEFAULT,
  );
  const [nhanPhanLoaiDraft, setNhanPhanLoaiDraft] = useState(
    SHOP_NHAN_PHAN_LOAI_DEFAULT,
  );
  const [nhanPhanLoai2Draft, setNhanPhanLoai2Draft] = useState(
    SHOP_NHAN_PHAN_LOAI_2_DEFAULT,
  );
  const [savingNhanLoai, setSavingNhanLoai] = useState(false);
  /** Nhóm thẻ phân loại (truc 1 / 2) — tên + mô tả ngắn. */
  const [nhoms, setNhoms] = useState<ShopNhom[]>([]);
  /** Popup thẻ phân loại: null = đóng; 1|2 = tab đang mở. */
  const [nhomPanelTruc, setNhomPanelTruc] = useState<1 | 2 | null>(null);
  /** Nhóm đang xổ mô tả ngắn trong popup (null = chỉ hiện tên). */
  const [expandedNhomId, setExpandedNhomId] = useState<string | null>(null);
  /** Đang thêm dòng mới (chưa lưu API). */
  const [draftingNhom, setDraftingNhom] = useState(false);
  const [newNhomNhan, setNewNhomNhan] = useState("");
  const [newNhomMoTa, setNewNhomMoTa] = useState("");
  const [creatingNhom, setCreatingNhom] = useState(false);
  const [savingNhomId, setSavingNhomId] = useState<string | null>(null);
  const [nhomMoTaDrafts, setNhomMoTaDrafts] = useState<Record<string, string>>(
    {},
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exitingSave, setExitingSave] = useState(false);

  function exitKhoEditing() {
    setKhoEditing(false);
    setDrafts({});
    setThumbMenuKey(null);
    setDeleteTargets([]);
    setSelectedIds([]);
    lastSelectIndexRef.current = null;
    setLastEditedId(null);
    setErr(null);
    setExitConfirmOpen(false);
    setNhanPhanLoaiDraft(nhanPhanLoai);
    setNhanPhanLoai2Draft(nhanPhanLoai2);
  }

  function enterKhoEditing() {
    setNhanPhanLoaiDraft(nhanPhanLoai);
    setNhanPhanLoai2Draft(nhanPhanLoai2);
    setKhoEditing(true);
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

  useEffect(() => {
    if (!thumbMenuKey) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(`[data-thumb-menu="${thumbMenuKey}"]`)) return;
      setThumbMenuKey(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [thumbMenuKey]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setErr(null);
    }
    try {
      const [status, pRes, bRes, shopRes, nhomRes] = await Promise.all([
        fetchBanHangClientStatus(),
        fetch("/api/shop/san-pham", { cache: "no-store" }),
        fetch("/api/shop/bang-gia", { cache: "no-store" }),
        fetch("/api/shop/cua-hang", { cache: "no-store" }),
        fetch("/api/shop/nhom", { cache: "no-store" }),
      ]);
      setEnabled(status.enabled);
      if (!status.enabled) return;

      const pJson = (await pRes.json().catch(() => null)) as {
        items?: ShopSanPham[];
      } | null;
      const bJson = (await bRes.json().catch(() => null)) as {
        items?: ShopBangGia[];
      } | null;
      const shopJson = (await shopRes.json().catch(() => null)) as {
        shop?: ShopCuaHang | null;
      } | null;
      const nhomJson = (await nhomRes.json().catch(() => null)) as {
        items?: ShopNhom[];
      } | null;
      setProducts(pJson?.items ?? []);
      const lists = bJson?.items ?? [];
      setPriceLists(lists);
      if (lists[0] && !bangGiaId) setBangGiaId(lists[0].id);
      const label1 = resolveShopNhanPhanLoai(shopJson?.shop);
      const label2 = resolveShopNhanPhanLoai2(shopJson?.shop);
      setNhanPhanLoai(label1);
      setNhanPhanLoai2(label2);
      setNhanPhanLoaiDraft(label1);
      setNhanPhanLoai2Draft(label2);
      const nextNhoms = nhomJson?.items ?? [];
      setNhoms(nextNhoms);
      const drafts: Record<string, string> = {};
      for (const n of nextNhoms) drafts[n.id] = n.moTa ?? "";
      setNhomMoTaDrafts(drafts);
    } catch {
      setErr("Không tải được kho.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [bangGiaId]);

  const saveNhanPhanLoai = useCallback(
    async (which: 1 | 2) => {
      const nextRaw =
        which === 1 ? nhanPhanLoaiDraft.trim() : nhanPhanLoai2Draft.trim();
      const current = which === 1 ? nhanPhanLoai : nhanPhanLoai2;
      const fallback =
        which === 1
          ? SHOP_NHAN_PHAN_LOAI_DEFAULT
          : SHOP_NHAN_PHAN_LOAI_2_DEFAULT;
      const resolved = nextRaw || fallback;
      if (resolved === current) {
        if (which === 1) setNhanPhanLoaiDraft(current);
        else setNhanPhanLoai2Draft(current);
        return;
      }
      setSavingNhanLoai(true);
      setErr(null);
      try {
        const body =
          which === 1
            ? { nhanPhanLoai: nextRaw || null }
            : { nhanPhanLoai2: nextRaw || null };
        const res = await fetch("/api/shop/cua-hang", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => null)) as {
          shop?: ShopCuaHang | null;
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không lưu được tên phân loại.");
          if (which === 1) setNhanPhanLoaiDraft(nhanPhanLoai);
          else setNhanPhanLoai2Draft(nhanPhanLoai2);
          return;
        }
        const label1 = resolveShopNhanPhanLoai(json?.shop);
        const label2 = resolveShopNhanPhanLoai2(json?.shop);
        setNhanPhanLoai(label1);
        setNhanPhanLoai2(label2);
        setNhanPhanLoaiDraft(label1);
        setNhanPhanLoai2Draft(label2);
      } catch {
        setErr("Không lưu được tên phân loại.");
        if (which === 1) setNhanPhanLoaiDraft(nhanPhanLoai);
        else setNhanPhanLoai2Draft(nhanPhanLoai2);
      } finally {
        setSavingNhanLoai(false);
      }
    },
    [
      nhanPhanLoai,
      nhanPhanLoai2,
      nhanPhanLoaiDraft,
      nhanPhanLoai2Draft,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (nhomPanelTruc == null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeNhomPanel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nhomPanelTruc]);

  /** Nhóm theo trục — nguồn danh sách cho mỗi tab thẻ phân loại. */
  const nhomsByTruc = useMemo(
    () => ({
      1: nhoms.filter((n) => n.truc === 1),
      2: nhoms.filter((n) => n.truc === 2),
    }),
    [nhoms],
  );

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

  const categoryOptions2 = useMemo(() => {
    const set = new Set<string>();
    for (const n of nhoms) {
      if (n.truc !== 2) continue;
      const t = n.nhan?.trim();
      if (t) set.add(t);
    }
    for (const p of products) {
      const t = p.phanLoai2?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [products, nhoms]);

  const saveNhomMoTa = useCallback(
    async (nhomId: string) => {
      const nhom = nhoms.find((n) => n.id === nhomId);
      if (!nhom) return;
      const next = (nhomMoTaDrafts[nhomId] ?? "").trim().slice(0, SHOP_NHOM_MO_TA_MAX);
      const prev = (nhom.moTa ?? "").trim();
      if (next === prev) return;
      setSavingNhomId(nhomId);
      setErr(null);
      try {
        const res = await fetch(`/api/shop/nhom/${encodeURIComponent(nhomId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moTa: next || null }),
        });
        const json = (await res.json().catch(() => null)) as {
          item?: ShopNhom;
          error?: string;
        } | null;
        if (!res.ok || !json?.item) {
          setErr(json?.error ?? "Không lưu được mô tả loại hàng.");
          setNhomMoTaDrafts((d) => ({ ...d, [nhomId]: nhom.moTa ?? "" }));
          return;
        }
        setNhoms((prevList) =>
          prevList.map((n) => (n.id === nhomId ? json.item! : n)),
        );
        setNhomMoTaDrafts((d) => ({
          ...d,
          [nhomId]: json.item!.moTa ?? "",
        }));
      } catch {
        setErr("Không lưu được mô tả loại hàng.");
        setNhomMoTaDrafts((d) => ({ ...d, [nhomId]: nhom.moTa ?? "" }));
      } finally {
        setSavingNhomId(null);
      }
    },
    [nhoms, nhomMoTaDrafts],
  );

  const createLoaiHang = useCallback(
    async (truc: 1 | 2) => {
      const nhan = newNhomNhan.trim();
      const label = truc === 1 ? nhanPhanLoai : nhanPhanLoai2;
      if (!nhan) {
        setErr(`Nhập tên ${label.toLowerCase()}.`);
        return false;
      }
      setCreatingNhom(true);
      setErr(null);
      try {
        const res = await fetch("/api/shop/nhom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            truc,
            nhan,
            moTa: newNhomMoTa.trim() || null,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          item?: ShopNhom;
          error?: string;
        } | null;
        if (!res.ok || !json?.item) {
          setErr(json?.error ?? "Không tạo được loại hàng.");
          return false;
        }
        const item = json.item;
        setNhoms((prev) => {
          const without = prev.filter((n) => n.id !== item.id);
          return [...without, item].sort((a, b) =>
            a.nhan.localeCompare(b.nhan, "vi"),
          );
        });
        setNhomMoTaDrafts((d) => ({ ...d, [item.id]: item.moTa ?? "" }));
        setNewNhomNhan("");
        setNewNhomMoTa("");
        setDraftingNhom(false);
        setExpandedNhomId(item.id);
        setNhomPanelTruc(truc);
        return true;
      } catch {
        setErr("Không tạo được loại hàng.");
        return false;
      } finally {
        setCreatingNhom(false);
      }
    },
    [newNhomNhan, newNhomMoTa, nhanPhanLoai, nhanPhanLoai2],
  );

  const hasUncategorized = useMemo(
    () => products.some((p) => !p.phanLoai?.trim()),
    [products],
  );

  const hasUncategorized2 = useMemo(
    () => products.some((p) => !p.phanLoai2?.trim()),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const selected1 = filterLoai.length > 0 ? new Set(filterLoai) : null;
    const selected2 = filterLoai2.length > 0 ? new Set(filterLoai2) : null;

    const list = products.filter((p) => {
      if (selected1) {
        const loai = p.phanLoai?.trim();
        if (!loai) {
          if (!selected1.has("__none__")) return false;
        } else if (!selected1.has(loai)) {
          return false;
        }
      }
      if (selected2) {
        const loai2 = p.phanLoai2?.trim();
        if (!loai2) {
          if (!selected2.has("__none__")) return false;
        } else if (!selected2.has(loai2)) {
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
  }, [products, filterLoai, filterLoai2, sortTon, drafts]);

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

  const featureCount = useMemo(
    () =>
      products.filter((p) => {
        const d = drafts[p.id];
        return d ? d.noiBat : p.noiBat === true;
      }).length,
    [products, drafts],
  );

  const applySelect = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
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
        /* Không Shift: bỏ selection cũ, chỉ giữ ô vừa pick.
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

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    lastSelectIndexRef.current = null;
  }, []);

  /** Mở popup thẻ phân loại (tab mặc định = phân loại 1). */
  function openNhomPanel() {
    setNewNhomNhan("");
    setNewNhomMoTa("");
    setNhanPhanLoaiDraft(nhanPhanLoai);
    setNhanPhanLoai2Draft(nhanPhanLoai2);
    setNhomPanelTruc(1);
  }

  function closeNhomPanel() {
    setNhomPanelTruc(null);
    setExpandedNhomId(null);
    setDraftingNhom(false);
    setNewNhomNhan("");
    setNewNhomMoTa("");
  }

  function selectNhomPanelTab(truc: 1 | 2) {
    if (truc === nhomPanelTruc) return;
    if (nhomPanelTruc != null) void saveNhanPhanLoai(nhomPanelTruc);
    setExpandedNhomId(null);
    setDraftingNhom(false);
    setNewNhomNhan("");
    setNewNhomMoTa("");
    setNhomPanelTruc(truc);
  }

  function startDraftNhom() {
    if (creatingNhom) return;
    setExpandedNhomId(null);
    setNewNhomNhan("");
    setNewNhomMoTa("");
    setDraftingNhom(true);
  }

  function cancelDraftNhom() {
    if (creatingNhom) return;
    setDraftingNhom(false);
    setNewNhomNhan("");
    setNewNhomMoTa("");
  }

  function toggleFilterLoai(truc: 1 | 2, key: string) {
    const setFilter = truc === 1 ? setFilterLoai : setFilterLoai2;
    if (key === "all") {
      setFilter([]);
      return;
    }
    setFilter((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return [...prev, key];
    });
  }

  useEffect(() => {
    if (filterMenuOpen == null) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-shop-filter-menu]")) return;
      setFilterMenuOpen(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterMenuOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    if (!bangGiaMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-shop-bang-gia-menu]")) return;
      setBangGiaMenuOpen(false);
      setRenamingBangId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [bangGiaMenuOpen]);

  function cycleSortTon() {
    setSortTon((prev) => {
      if (prev === "none") return "nhieu";
      if (prev === "nhieu") return "het";
      return "none";
    });
  }

  function parseGiaInput(raw: string): number | null {
    const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "");
    if (!cleaned) return null;
    // 80.000 / 1.200.000 → nghìn VN
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      const n = Number.parseInt(cleaned.replace(/\./g, ""), 10);
      return Number.isFinite(n) ? n : null;
    }
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
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
    return {
      ten: p.ten ?? "",
      phanLoai: p.phanLoai ?? "",
      phanLoai2: p.phanLoai2 ?? "",
      ton: String(bt?.soLuongTon ?? 0),
      gia: dong != null ? String(dong.gia) : "",
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

  function describeChangedFields(patch: Partial<RowDraft>): string {
    const labels: string[] = [];
    if (patch.ten !== undefined) labels.push("tên");
    if (patch.phanLoai !== undefined) labels.push(nhanPhanLoai.toLowerCase());
    if (patch.phanLoai2 !== undefined) labels.push(nhanPhanLoai2.toLowerCase());
    if (patch.ton !== undefined) labels.push("tồn");
    if (patch.gia !== undefined) labels.push("giá bán");
    if (patch.giaGiam !== undefined) labels.push("giá giảm");
    if (patch.dangBan !== undefined) labels.push("tình trạng");
    if (patch.noiBat !== undefined) labels.push("ngôi sao");
    if (patch.anhId !== undefined) labels.push("ảnh");
    return labels.join(", ");
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
    const res = await fetch("/api/shop/bang-gia", {
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

  function currentTienTe(): string {
    return (
      priceLists.find((b) => b.id === bangGiaId)?.tienTe ??
      priceLists[0]?.tienTe ??
      "VND"
    );
  }

  const knownTienTe = useMemo(() => {
    const set = new Set<string>();
    for (const b of priceLists) {
      const t = b.tienTe?.trim().toUpperCase();
      if (t) set.add(t);
    }
    return [...set];
  }, [priceLists]);

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
    const res = await fetch(`/api/shop/bang-gia/${targetBang}`, {
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
    return true;
  }

  async function createBangGia() {
    setSaving(true);
    setErr(null);
    try {
      const tienTe = currentTienTe() || "VND";
      const ten =
        priceLists.length === 0
          ? "Bảng giá mặc định"
          : `Bảng giá ${priceLists.length + 1}`;
      const res = await fetch("/api/shop/bang-gia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, tienTe }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopBangGia;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        setErr(json?.error ?? "Không tạo bảng giá.");
        return;
      }
      setPriceLists((prev) => [json.item!, ...prev]);
      setBangGiaId(json.item.id);
      setDrafts({});
    } finally {
      setSaving(false);
    }
  }

  async function renameBangGia(
    id: string,
    tenRaw: string,
    tienTeRaw: string,
  ) {
    const ten = tenRaw.trim();
    if (!ten) {
      setErr("Tên bảng giá không được để trống.");
      return;
    }
    const tienTe =
      tienTeRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) ||
      "VND";
    const current = priceLists.find((b) => b.id === id);
    const tenChanged = !current || current.ten !== ten;
    const tienTeChanged = !current || current.tienTe !== tienTe;
    if (!tenChanged && !tienTeChanged) {
      setRenamingBangId(null);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, string> = {};
      if (tenChanged) body.ten = ten;
      if (tienTeChanged) body.tienTe = tienTe;
      const res = await fetch(`/api/shop/bang-gia/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không cập nhật được bảng giá.");
        return;
      }
      setPriceLists((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                ...(tenChanged ? { ten } : null),
                ...(tienTeChanged ? { tienTe } : null),
              }
            : b,
        ),
      );
      setRenamingBangId(null);
    } finally {
      setSaving(false);
    }
  }

  async function removeBangGia(id?: string) {
    const targetId = id ?? bangGiaId;
    const bg = priceLists.find((b) => b.id === targetId);
    if (!bg) {
      setErr("Chọn bảng giá cần xóa.");
      return;
    }
    const dongCount = bg.dong.length;
    const ok = window.confirm(
      [
        `Xóa bảng giá «${bg.ten}» (${bg.tienTe})?`,
        "",
        dongCount > 0
          ? `Bảng này đang có ${dongCount} dòng giá. Giá gắn với bảng này sẽ không còn dùng được cho hàng bán / post.`
          : "Bảng này chưa có dòng giá.",
        "",
        "Hành động này sẽ không thể hoàn tác.",
      ].join("\n"),
    );
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/bang-gia/${bg.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không xóa được bảng giá.");
        return;
      }
      const next = priceLists.filter((b) => b.id !== bg.id);
      setPriceLists(next);
      setBangGiaId((prev) =>
        prev === bg.id ? (next[0]?.id ?? "") : prev,
      );
      if (renamingBangId === bg.id) setRenamingBangId(null);
    } finally {
      setSaving(false);
    }
  }

  async function uploadThumb(
    file: File,
  ): Promise<{ imageId: string; url: string } | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/post-image/upload", {
      method: "POST",
      body: form,
    });
    const json = (await res.json().catch(() => null)) as {
      imageId?: string;
      url?: string;
      error?: string;
    } | null;
    if (!res.ok || !json?.imageId || !json.url) {
      setErr(json?.error ?? "Không tải ảnh được.");
      return null;
    }
    return { imageId: json.imageId, url: json.url };
  }

  function nameFromImageFile(file: File): string {
    const base = file.name.replace(/\.[^.]+$/u, "").trim();
    return base || "Sản phẩm mới";
  }

  /**
   * Chọn ảnh (1 hoặc nhiều) → tạo sản phẩm tương ứng (tên = tên file).
   */
  async function handleAddImages(files: File[]) {
    const list = files.filter((f) => f.size > 0);
    if (list.length === 0) return;
    if (!khoEditing) enterKhoEditing();

    setSaving(true);
    setUploading(true);
    setErr(null);
    setThumbMenuKey(null);

    const created: ShopSanPham[] = [];
    let failUpload = 0;
    let failCreate = 0;

    try {
      for (const file of list) {
        const uploaded = await uploadThumb(file);
        if (!uploaded) {
          failUpload += 1;
          continue;
        }

        const res = await fetch("/api/shop/san-pham", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ten: nameFromImageFile(file),
            anhId: uploaded.imageId,
            phanLoai: null,
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
          continue;
        }
        created.push(json.item);
      }

      if (created.length > 0) {
        setProducts((prev) => {
          const ids = new Set(created.map((p) => p.id));
          return [...created, ...prev.filter((p) => !ids.has(p.id))];
        });
        setLastEditedId(created[0]!.id);
        await load({ silent: true });
      }

      const fail = failUpload + failCreate;
      if (fail > 0) {
        setErr(
          created.length === 0
            ? "Không thêm được sản phẩm từ ảnh."
            : `Đã thêm ${created.length} sản phẩm — ${fail} ảnh lỗi.`,
        );
      }
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function createBlankProduct() {
    if (!khoEditing) enterKhoEditing();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/san-pham", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: "Sản phẩm mới",
          anhId: null,
          phanLoai: null,
          phanLoai2: null,
          bienThe: [{ nhan: "Mặc định", soLuongTon: 0 }],
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopSanPham;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        setErr(json?.error ?? "Không tạo sản phẩm.");
        return;
      }
      const item = json.item;
      setProducts((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
      setLastEditedId(item.id);
      await load({ silent: true });
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveProduct() {
    if (deleteTargets.length === 0 || deleting) return;
    const targets = deleteTargets;
    setDeleting(true);
    setErr(null);
    try {
      const results = await Promise.all(
        targets.map(async (t) => {
          const res = await fetch(`/api/shop/san-pham/${t.id}`, {
            method: "DELETE",
          });
          return { id: t.id, ok: res.ok };
        }),
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setErr(
          failed.length === targets.length
            ? "Không xóa được sản phẩm."
            : `Đã xóa một phần — ${failed.length} sản phẩm lỗi.`,
        );
      }
      const removed = new Set(results.filter((r) => r.ok).map((r) => r.id));
      if (removed.size > 0) {
        setDrafts((prev) => {
          const next = { ...prev };
          for (const id of removed) delete next[id];
          return next;
        });
        setProducts((prev) => prev.filter((p) => !removed.has(p.id)));
        setSelectedIds((prev) => prev.filter((id) => !removed.has(id)));
        setDeleteTargets([]);
        await load({ silent: true });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function saveRow(p: ShopSanPham): Promise<boolean> {
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
    if (!Number.isFinite(tonNum)) {
      setErr("Tồn kho không hợp lệ.");
      return false;
    }
    const giaRaw = draft.gia.trim();
    const giaNum = giaRaw ? parseGiaInput(giaRaw) : null;
    if (giaRaw && giaNum == null) {
      setErr("Giá bán không hợp lệ.");
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
    const nextGia = giaNum ?? oldGia;
    const nextGiaGiam = giaGiamRaw ? giaGiamNum : null;
    if (giaGiamRaw && nextGia == null) {
      setErr("Cần có giá bán trước khi nhập giá giảm.");
      return false;
    }
    if (
      nextGia != null &&
      nextGiaGiam != null &&
      nextGiaGiam > nextGia
    ) {
      setErr("Giá giảm không được cao hơn giá bán.");
      return false;
    }
    const giaChanged =
      (giaNum != null && giaNum !== oldGia) ||
      (giaGiamRaw ? giaGiamNum !== oldGiaGiam : oldGiaGiam != null);

    setSavingId(p.id);
    setErr(null);
    try {
      const patchBody: Record<string, unknown> = {
        ten: tenTrim,
        phanLoai: draft.phanLoai.trim() || null,
        phanLoai2: draft.phanLoai2.trim() || null,
        dangBan: draft.dangBan,
        noiBat: draft.noiBat,
      };
      if (draft.anhId !== undefined) {
        patchBody.anhId = draft.anhId;
      }
      const patchRes = await fetch(`/api/shop/san-pham/${p.id}`, {
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

      if (tonNum !== bt.soLuongTon) {
        const tonRes = await fetch(`/api/shop/san-pham/${p.id}`, {
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

      if (giaChanged && nextGia != null) {
        const ok = await saveGiaForBienThe(bt.id, {
          gia: nextGia,
          giaGiam: nextGiaGiam,
        });
        if (!ok) return false;
      }

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      await load({ silent: true });
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
            const res = await fetch(`/api/shop/san-pham/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productPatch),
            });
            return res.ok;
          }),
        );
        if (results.some((ok) => !ok)) {
          setErr("Một số sản phẩm không lưu được.");
          await load({ silent: true });
          return;
        }
      }

      if (applyTon && tonNum != null) {
        const tonResults = await Promise.all(
          targets.map(async (p) => {
            const bt = p.bienThe[0];
            if (!bt) return false;
            const res = await fetch(`/api/shop/san-pham/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "upsertBienThe",
                bienTheId: bt.id,
                nhan: bt.nhan || "Mặc định",
                soLuongTon: tonNum,
              }),
            });
            return res.ok;
          }),
        );
        if (tonResults.some((ok) => !ok)) {
          setErr("Một số sản phẩm không lưu được tồn kho.");
          await load({ silent: true });
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
        const res = await fetch(`/api/shop/bang-gia/${targetBang}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dong }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setErr(json?.error ?? "Không lưu được giá hàng loạt.");
          await load({ silent: true });
          return;
        }
      }

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[source.id];
        for (const p of targets) delete next[p.id];
        return next;
      });
      await load({ silent: true });
    } finally {
      setBulkApplying(false);
    }
  }

  async function pickRowThumb(p: ShopSanPham, file: File) {
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId || !json.url) {
        setErr(json?.error ?? "Không tải ảnh được.");
        return;
      }
      patchDraft(
        p.id,
        { anhId: json.imageId, anhUrl: json.url },
        baseDraftForProduct(p),
      );
    } finally {
      setUploading(false);
    }
  }

  function renderLoaiColHeader(truc: 1 | 2) {
    const label = truc === 1 ? nhanPhanLoai : nhanPhanLoai2;
    const draft = truc === 1 ? nhanPhanLoaiDraft : nhanPhanLoai2Draft;
    const setDraft =
      truc === 1 ? setNhanPhanLoaiDraft : setNhanPhanLoai2Draft;
    const placeholder =
      truc === 1
        ? SHOP_NHAN_PHAN_LOAI_DEFAULT
        : SHOP_NHAN_PHAN_LOAI_2_DEFAULT;
    const options = truc === 1 ? categoryOptions : categoryOptions2;
    const selected = truc === 1 ? filterLoai : filterLoai2;
    const hasNone = truc === 1 ? hasUncategorized : hasUncategorized2;
    const open = filterMenuOpen === truc;
    const renameAria =
      truc === 1 ? "Đổi tên cột phân loại" : "Đổi tên cột phân loại 2";

    return (
      <th scope="col" className="shop-grid-col-loai">
        <div className="shop-grid-col-filter" data-shop-filter-menu>
          {khoEditing ? (
            <input
              className="shop-grid-col-rename"
              value={draft}
              maxLength={40}
              disabled={savingNhanLoai}
              aria-label={renameAria}
              title="Đổi tên cột này"
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void saveNhanPhanLoai(truc)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          ) : null}
          <button
            type="button"
            className={`shop-grid-filter-btn${selected.length > 0 ? " is-active" : ""}${open ? " is-open" : ""}${khoEditing ? " is-icon" : ""}`}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={`Lọc theo ${label.toLowerCase()}`}
            title={`Lọc theo ${label.toLowerCase()}`}
            onClick={() =>
              setFilterMenuOpen((cur) => (cur === truc ? null : truc))
            }
          >
            {!khoEditing ? <span>{label}</span> : null}
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
                  onChange={() => toggleFilterLoai(truc, "all")}
                />
                <span>Tất cả</span>
              </label>
              {options.map((c) => (
                <label key={c} className="shop-filter-dropdown-opt">
                  <input
                    type="checkbox"
                    checked={selected.includes(c)}
                    onChange={() => toggleFilterLoai(truc, c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
              {hasNone ? (
                <label className="shop-filter-dropdown-opt">
                  <input
                    type="checkbox"
                    checked={selected.includes("__none__")}
                    onChange={() => toggleFilterLoai(truc, "__none__")}
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

  if (loading) {
    return (
      <div className="shop-dash">
        <ShopDashTabs active="kho" />
        <div className="shop-dash-loading" aria-busy="true">
          <Loader2 className="shop-spin" size={20} aria-hidden />
          Đang tải…
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="shop-dash">
        <h1>Quản lý kho hàng</h1>
        <p>
          Chức năng bán hàng đang tắt. Bật trong{" "}
          <strong>Cài đặt tài khoản → Bán hàng</strong>, hoặc{" "}
          <Link href="/">về trang chủ</Link> rồi mở menu tài khoản.
        </p>
      </div>
    );
  }

  return (
    <div className="shop-dash">
      <ShopDashTabs active="kho" />

      {err ? <p className="shop-dash-err">{err}</p> : null}

      <section className="shop-dash-card">
        <div className="shop-dash-kho-head">
          <div className="shop-dash-kho-title-row">
            <h2>
              Kho hàng (
              {filteredProducts.length}
              {filterLoai.length > 0 || filterLoai2.length > 0
                ? ` / ${products.length}`
                : ""}
              )
            </h2>
          </div>
          {khoEditing && selectedIds.length > 0 ? (
            <div
              className="shop-kho-bulk"
              role="toolbar"
              aria-label="Sửa hàng loạt"
            >
              <span className="shop-kho-bulk-count">
                Đã chọn <strong>{selectedIds.length}</strong>
              </span>
              {(() => {
                const source = lastEditedId
                  ? products.find((p) => p.id === lastEditedId)
                  : null;
                const changed = source ? getChangedDraftPatch(source) : null;
                if (!source || !changed) {
                  return (
                    <span className="shop-kho-bulk-hint">
                      Sửa một dòng → chọn dòng khác → bấm Áp dụng trên ô đã sửa
                    </span>
                  );
                }
                const tenHien =
                  getDraft(source).ten.trim() || source.ten || "…";
                return (
                  <span className="shop-kho-bulk-hint">
                    Theo «{tenHien}»: {describeChangedFields(changed)} — bấm
                    Áp dụng trên ô cam
                  </span>
                );
              })()}
              <button
                type="button"
                className="shop-don-bulk-btn"
                disabled={bulkApplying || deleting}
                onClick={() => {
                  const items = products
                    .filter((p) => selectedIdSet.has(p.id))
                    .map((p) => ({ id: p.id, ten: p.ten }));
                  if (items.length > 0) setDeleteTargets(items);
                }}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
                Xóa
              </button>
              <button
                type="button"
                className="shop-don-bulk-btn"
                disabled={bulkApplying}
                onClick={clearSelection}
              >
                Bỏ chọn
              </button>
            </div>
          ) : null}
          <div className="shop-kho-toolbar">
            <div className="shop-kho-bang-gia" role="group" aria-label="Bảng giá">
              <div
                className="shop-kho-bang-gia-dropdown"
                data-shop-bang-gia-menu
              >
                <button
                  type="button"
                  className={`shop-kho-bang-gia-trigger${bangGiaMenuOpen ? " is-open" : ""}`}
                  aria-expanded={bangGiaMenuOpen}
                  aria-haspopup="listbox"
                  aria-label="Bảng giá đang dùng"
                  title="Bảng giá quyết định đơn vị tiền khi sửa giá"
                  disabled={saving}
                  onClick={() => {
                    setBangGiaMenuOpen((o) => {
                      if (o) setRenamingBangId(null);
                      return !o;
                    });
                  }}
                >
                  <span>
                    {priceLists.length === 0
                      ? "Chưa có bảng giá"
                      : (() => {
                          const bg =
                            priceLists.find((b) => b.id === bangGiaId) ??
                            priceLists[0];
                          return bg
                            ? `${bg.ten} · ${bg.tienTe}`
                            : "Chọn bảng giá";
                        })()}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
                </button>
                {bangGiaMenuOpen ? (
                  <div
                    className="shop-kho-bang-gia-panel"
                    role="listbox"
                    aria-label="Chọn bảng giá"
                  >
                    {priceLists.map((b) => (
                      <div
                        key={b.id}
                        className={`shop-kho-bang-gia-opt-row${b.id === bangGiaId ? " is-active" : ""}${renamingBangId === b.id ? " is-renaming" : ""}`}
                      >
                        {renamingBangId === b.id ? (
                          <form
                            className="shop-kho-bang-gia-rename"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void renameBangGia(
                                b.id,
                                renameBangDraft,
                                renameBangTienTe,
                              );
                            }}
                          >
                            <input
                              className="shop-kho-bang-gia-rename-ten"
                              value={renameBangDraft}
                              autoFocus
                              disabled={saving}
                              aria-label="Tên bảng giá"
                              placeholder="Tên bảng giá"
                              onChange={(e) =>
                                setRenameBangDraft(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setRenamingBangId(null);
                                }
                              }}
                            />
                            <ShopTienTeSelect
                              value={renameBangTienTe}
                              knownCodes={knownTienTe}
                              disabled={saving}
                              onChange={setRenameBangTienTe}
                              aria-label="Đơn vị tiền tệ"
                              title="Mã tiền tệ của bảng giá"
                            />
                            <button
                              type="submit"
                              disabled={saving || !renameBangDraft.trim()}
                              aria-label="Lưu bảng giá"
                              title="Lưu"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              aria-label="Hủy"
                              title="Hủy"
                              onClick={() => setRenamingBangId(null)}
                            >
                              <X size={14} strokeWidth={2} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              type="button"
                              role="option"
                              aria-selected={b.id === bangGiaId}
                              className={`shop-kho-bang-gia-opt${b.id === bangGiaId ? " is-active" : ""}`}
                              onClick={() => {
                                setBangGiaId(b.id);
                                setDrafts({});
                                setBangGiaMenuOpen(false);
                              }}
                            >
                              <span className="shop-kho-bang-gia-opt-name">
                                {b.ten}
                              </span>
                              <span className="shop-kho-bang-gia-opt-meta">
                                {b.tienTe} · {b.dong.length} dòng
                              </span>
                            </button>
                            <button
                              type="button"
                              className="shop-kho-bang-gia-rename-btn"
                              disabled={saving}
                              aria-label={`Sửa ${b.ten}`}
                              title="Sửa tên và tiền tệ"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingBangId(b.id);
                                setRenameBangDraft(b.ten);
                                setRenameBangTienTe(b.tienTe);
                              }}
                            >
                              <Pencil size={13} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="shop-kho-bang-gia-rename-btn is-danger"
                              disabled={saving}
                              aria-label={`Xóa ${b.ten}`}
                              title="Xóa bảng giá"
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeBangGia(b.id);
                              }}
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="shop-kho-bang-gia-panel-actions">
                      <button
                        type="button"
                        className="shop-kho-bang-gia-action"
                        disabled={saving}
                        onClick={() => {
                          setBangGiaMenuOpen(false);
                          setRenamingBangId(null);
                          void createBangGia();
                        }}
                      >
                        <Plus size={14} strokeWidth={2.25} aria-hidden />
                        Tạo bảng giá
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              {priceLists.length > 0 ? (
                <span
                  className="shop-tien-te-badge"
                  title="Đơn vị tiền tệ của bảng đang chọn — sửa trong dropdown"
                >
                  {currentTienTe()}
                </span>
              ) : null}
            </div>
            <div className="shop-kho-toolbar-actions">
              {khoEditing ? (
                <>
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
                  <button
                    type="button"
                    className="shop-kho-add-btn"
                    disabled={saving || uploading}
                    onClick={() => void createBlankProduct()}
                  >
                    {saving ? (
                      <Loader2 className="shop-spin" size={15} />
                    ) : (
                      <Plus size={15} strokeWidth={2.25} aria-hidden />
                    )}
                    Thêm
                  </button>
                  <button
                    type="button"
                    className="shop-kho-add-images-btn"
                    disabled={saving || uploading}
                    title="Thêm hàng loạt từ ảnh"
                    aria-label="Thêm hàng loạt từ ảnh"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus size={15} strokeWidth={2} aria-hidden />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={`shop-dash-kho-edit-btn${nhomPanelTruc != null ? " is-active" : ""}`}
                aria-pressed={nhomPanelTruc != null}
                aria-haspopup="dialog"
                title="Quản lý thẻ phân loại — đặt tên nhóm và mô tả ngắn"
                onClick={() => {
                  if (nhomPanelTruc != null) closeNhomPanel();
                  else openNhomPanel();
                }}
              >
                <Tags size={15} strokeWidth={2} aria-hidden />
                Thẻ phân loại
              </button>
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
                    Sửa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="shop-grid-wrap">
          <table className={`shop-grid${khoEditing ? "" : " shop-grid--readonly"}`}>
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
                <th
                  scope="col"
                  className="shop-grid-col-feature"
                  title={`Tối đa ${SHOP_FEATURE_MAX} sản phẩm ngôi sao`}
                >
                  <span className="shop-grid-col-feature-head">
                    <Star size={14} strokeWidth={2.25} aria-hidden />
                    <span className="shop-feature-count">
                      {featureCount}/{SHOP_FEATURE_MAX}
                    </span>
                  </span>
                </th>
                {renderLoaiColHeader(1)}
                {renderLoaiColHeader(2)}
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
                  Giá bán
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
                  <td colSpan={khoEditing ? 11 : 9}>
                    {products.length === 0
                      ? khoEditing
                        ? "Chưa có sản phẩm — bấm Thêm để tạo dòng trống."
                        : "Chưa có sản phẩm — bấm Sửa để thêm."
                      : "Không có sản phẩm trong nhóm này."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, rowIndex) => {
                  const bt = p.bienThe[0];
                  const draft = getDraft(p);
                  const dirty = isRowDirty(p);
                  const displayAnh =
                    draft.anhId !== undefined ? draft.anhUrl : p.anhUrl;
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
                    applyTargetCount > 0;
                  const firstChangedField = (
                    [
                      "anhId",
                      "ten",
                      "noiBat",
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
                      className={`shop-grid-row${dirty && khoEditing ? " is-dirty" : ""}${!dangBanHienThi ? " is-ngung-ban" : ""}${isSelected && khoEditing ? " is-selected" : ""}${isBulkSource && changedFields ? " is-bulk-source" : ""}`}
                    >
                      {khoEditing ? (
                        <td
                          className="shop-grid-col-check"
                          onClick={(e) => {
                            if (rowSaving || bulkApplying || deleting) return;
                            /* Click padding ô — input tự xử lý qua onChange. */
                            if ((e.target as HTMLElement).closest("input")) {
                              return;
                            }
                            applySelect(p.id, rowIndex, e.shiftKey);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={rowSaving || bulkApplying || deleting}
                            aria-label={`Chọn ${p.ten}`}
                            onMouseDown={(e) => {
                              shiftHeldRef.current = e.shiftKey;
                            }}
                            onChange={() => {
                              applySelect(
                                p.id,
                                rowIndex,
                                shiftHeldRef.current,
                              );
                              shiftHeldRef.current = false;
                            }}
                          />
                        </td>
                      ) : null}
                      <td
                        className={`shop-grid-col-thumb${cellChanged("anhId")}`}
                        title={
                          cellChanged("anhId")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("anhId")}
                        {!khoEditing ? (
                          <div
                            className={`shop-grid-readonly-thumb${displayAnh ? "" : " is-empty"}`}
                          >
                            {displayAnh ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={displayAnh} alt="" />
                            ) : (
                              "—"
                            )}
                          </div>
                        ) : (
                        <div
                          className={`shop-thumb-pick${thumbMenuKey === p.id ? " is-open" : ""}`}
                          data-thumb-menu={p.id}
                          tabIndex={0}
                          onPaste={(e) => {
                            if (uploading || rowSaving) return;
                            const file =
                              imageFilesFromClipboard(e.clipboardData)[0];
                            if (!file) return;
                            e.preventDefault();
                            e.stopPropagation();
                            void pickRowThumb(p, file);
                          }}
                        >
                          <input
                            id={rowFileId}
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploading || rowSaving}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) void pickRowThumb(p, f);
                              setThumbMenuKey(null);
                            }}
                          />
                          <div
                            className={`shop-thumb-frame${displayAnh ? " has-img" : ""}`}
                          >
                            {displayAnh ? (
                              <button
                                type="button"
                                className="shop-thumb-img-btn"
                                disabled={uploading || rowSaving}
                                aria-label="Tùy chọn ảnh"
                                aria-expanded={thumbMenuKey === p.id}
                                title="Tùy chọn ảnh"
                                onClick={() =>
                                  setThumbMenuKey((k) =>
                                    k === p.id ? null : p.id,
                                  )
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={displayAnh} alt="" />
                              </button>
                            ) : uploading || rowSaving ? (
                              <Loader2 className="shop-spin" size={18} />
                            ) : (
                              <button
                                type="button"
                                className="shop-thumb-placeholder shop-thumb-placeholder--pick"
                                aria-label="Tùy chọn ảnh"
                                aria-expanded={thumbMenuKey === p.id}
                                title="Tùy chọn ảnh"
                                disabled={uploading || rowSaving}
                                onClick={() =>
                                  setThumbMenuKey((k) =>
                                    k === p.id ? null : p.id,
                                  )
                                }
                              >
                                Ảnh
                              </button>
                            )}
                            {displayAnh ? (
                              <button
                                type="button"
                                className="shop-thumb-clear"
                                aria-label="Xóa ảnh"
                                title="Xóa ảnh"
                                disabled={uploading || rowSaving}
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
                          {thumbMenuKey === p.id ? (
                            <div
                              className="shop-thumb-acts"
                              role="toolbar"
                              aria-label="Thao tác ảnh"
                            >
                              <label
                                htmlFor={rowFileId}
                                className="shop-thumb-act"
                                aria-label="Chọn ảnh từ máy"
                                title="Đổi ảnh"
                              >
                                <ImagePlus size={14} strokeWidth={2} />
                              </label>
                              <button
                                type="button"
                                className="shop-thumb-act"
                                disabled={uploading || rowSaving}
                                onClick={() => {
                                  void (async () => {
                                    const file =
                                      await readImageFileFromClipboard();
                                    if (!file) {
                                      setErr(
                                        "Không đọc được ảnh từ bộ nhớ tạm. Hãy copy ảnh rồi thử lại, hoặc Ctrl+V khi focus ô ảnh.",
                                      );
                                      return;
                                    }
                                    void pickRowThumb(p, file);
                                    setThumbMenuKey(null);
                                  })();
                                }}
                                aria-label="Dán ảnh từ bộ nhớ tạm"
                                title="Dán ảnh"
                              >
                                <ClipboardPaste size={14} strokeWidth={2} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-name${cellChanged("ten")}`}
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
                        className={`shop-grid-col-feature${cellChanged("noiBat")}`}
                        title={
                          cellChanged("noiBat")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("noiBat")}
                        {!khoEditing ? (
                          p.noiBat ? (
                            <span
                              className="shop-feature-badge"
                              title="Ngôi sao"
                              aria-label="Ngôi sao"
                            >
                              <Star size={13} strokeWidth={2.25} fill="currentColor" aria-hidden />
                            </span>
                          ) : (
                            <span className="shop-grid-readonly-val">—</span>
                          )
                        ) : (
                          <label
                            className={`shop-feature-toggle${
                              !draft.noiBat && featureCount >= SHOP_FEATURE_MAX
                                ? " is-capped"
                                : ""
                            }`}
                            title={
                              !draft.noiBat && featureCount >= SHOP_FEATURE_MAX
                                ? `Đã đủ ${SHOP_FEATURE_MAX} ngôi sao — bỏ chọn một mục khác trước`
                                : draft.noiBat
                                  ? "Bỏ ngôi sao"
                                  : "Gắn ngôi sao"
                            }
                          >
                            <input
                              type="checkbox"
                              checked={draft.noiBat}
                              disabled={
                                rowSaving ||
                                (!draft.noiBat &&
                                  featureCount >= SHOP_FEATURE_MAX)
                              }
                              aria-label={`Ngôi sao ${p.ten}`}
                              onChange={(e) => {
                                const next = e.target.checked;
                                if (next) {
                                  const others = products.filter((x) => {
                                    if (x.id === p.id) return false;
                                    const d = drafts[x.id];
                                    return d ? d.noiBat : x.noiBat === true;
                                  }).length;
                                  if (others >= SHOP_FEATURE_MAX) {
                                    setErr(
                                      `Chỉ được gắn ngôi sao tối đa ${SHOP_FEATURE_MAX} sản phẩm.`,
                                    );
                                    return;
                                  }
                                }
                                setErr(null);
                                patchDraft(
                                  p.id,
                                  { noiBat: next },
                                  baseDraftForProduct(p),
                                );
                              }}
                            />
                            <Star
                              size={14}
                              strokeWidth={2.25}
                              fill={draft.noiBat ? "currentColor" : "none"}
                              aria-hidden
                            />
                          </label>
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-loai${cellChanged("phanLoai")}`}
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
                        className={`shop-grid-col-loai${cellChanged("phanLoai2")}`}
                        title={
                          cellChanged("phanLoai2")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
                        }
                      >
                        {cellApplyBtn("phanLoai2")}
                        {!khoEditing ? (
                          <span className="shop-grid-readonly-val">
                            {p.phanLoai2?.trim() || "—"}
                          </span>
                        ) : (
                        <ShopPhanLoaiInput
                          className="shop-phan-loai-inline"
                          value={draft.phanLoai2}
                          options={categoryOptions2}
                          placeholder="—"
                          aria-label={`${nhanPhanLoai2} ${p.ten}`}
                          disabled={rowSaving}
                          onChange={(v) =>
                            patchDraft(
                              p.id,
                              { phanLoai2: v },
                              baseDraftForProduct(p),
                            )
                          }
                        />
                        )}
                      </td>
                      <td
                        className={`shop-grid-col-ton${cellChanged("ton")}`}
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
                        title={
                          cellChanged("gia")
                            ? "Ô đã sửa — sẽ áp dụng khi bấm Áp dụng"
                            : undefined
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
                              aria-label={`Giá bán ${p.ten} (${currentTienTe()})`}
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
                      <td className="shop-grid-col-actions">
                        <div className="shop-grid-actions">
                          {dirty ? (
                            <button
                              type="button"
                              className="shop-btn-save"
                              disabled={rowSaving || uploading}
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
                            disabled={rowSaving || deleting || bulkApplying}
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

      {nhomPanelTruc != null && typeof document !== "undefined"
        ? createPortal(
            (() => {
              const truc = nhomPanelTruc;
              const label = truc === 1 ? nhanPhanLoai : nhanPhanLoai2;
              const list = nhomsByTruc[truc];
              const renameDraft =
                truc === 1 ? nhanPhanLoaiDraft : nhanPhanLoai2Draft;
              const renamePlaceholder =
                truc === 1
                  ? SHOP_NHAN_PHAN_LOAI_DEFAULT
                  : SHOP_NHAN_PHAN_LOAI_2_DEFAULT;
              return (
                <div
                  className="shop-kho-nhom-backdrop"
                  role="presentation"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) closeNhomPanel();
                  }}
                >
                  <div
                    className="shop-kho-nhom-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="shop-kho-nhom-title"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <header className="shop-kho-nhom-dialog-head">
                      <h3 id="shop-kho-nhom-title">Thẻ phân loại</h3>
                      <button
                        type="button"
                        className="shop-kho-nhom-dialog-close"
                        aria-label="Đóng"
                        onClick={closeNhomPanel}
                      >
                        <X size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </header>

                    <div
                      className="shop-kho-nhom-tabs"
                      role="tablist"
                      aria-label="Chọn thẻ phân loại"
                    >
                      <button
                        type="button"
                        role="tab"
                        id="shop-kho-nhom-tab-1"
                        aria-controls="shop-kho-nhom-panel"
                        aria-selected={truc === 1}
                        className={`shop-kho-nhom-tab${truc === 1 ? " is-active" : ""}`}
                        onClick={() => selectNhomPanelTab(1)}
                      >
                        {nhanPhanLoai}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="shop-kho-nhom-tab-2"
                        aria-controls="shop-kho-nhom-panel"
                        aria-selected={truc === 2}
                        className={`shop-kho-nhom-tab${truc === 2 ? " is-active" : ""}`}
                        onClick={() => selectNhomPanelTab(2)}
                      >
                        {nhanPhanLoai2}
                      </button>
                    </div>

                    <div
                      className="shop-kho-nhom-panel"
                      role="tabpanel"
                      id="shop-kho-nhom-panel"
                      aria-labelledby={`shop-kho-nhom-tab-${truc}`}
                    >
                      <label className="shop-kho-nhom-rename">
                        <span className="shop-kho-nhom-rename-label">
                          Đổi tên thẻ
                        </span>
                        <input
                          type="text"
                          className="shop-kho-nhom-rename-input"
                          value={renameDraft}
                          maxLength={40}
                          disabled={savingNhanLoai}
                          placeholder={renamePlaceholder}
                          aria-label={`Đổi tên thẻ ${label}`}
                          onChange={(e) => {
                            if (truc === 1) setNhanPhanLoaiDraft(e.target.value);
                            else setNhanPhanLoai2Draft(e.target.value);
                          }}
                          onBlur={() => void saveNhanPhanLoai(truc)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      </label>

                      {list.length > 0 || draftingNhom ? (
                        <ul className="shop-kho-nhom-list">
                          {draftingNhom ? (
                            <li className="shop-kho-nhom-row is-open is-draft">
                              <div className="shop-kho-nhom-row-toggle is-static">
                                <input
                                  type="text"
                                  className="shop-kho-nhom-name-input"
                                  value={newNhomNhan}
                                  maxLength={40}
                                  autoFocus
                                  disabled={creatingNhom}
                                  placeholder={`Tên ${label.toLowerCase()}`}
                                  aria-label={`Tên ${label.toLowerCase()} mới`}
                                  onChange={(e) =>
                                    setNewNhomNhan(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void createLoaiHang(truc);
                                    } else if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelDraftNhom();
                                    }
                                  }}
                                  onBlur={() => {
                                    window.setTimeout(() => {
                                      const active = document.activeElement;
                                      if (
                                        active?.closest(
                                          ".shop-kho-nhom-row.is-draft",
                                        )
                                      ) {
                                        return;
                                      }
                                      if (newNhomNhan.trim()) {
                                        void createLoaiHang(truc);
                                      } else {
                                        cancelDraftNhom();
                                      }
                                    }, 0);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="shop-kho-nhom-draft-cancel"
                                  aria-label="Hủy dòng mới"
                                  disabled={creatingNhom}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={cancelDraftNhom}
                                >
                                  <X size={14} strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                              <div className="shop-kho-nhom-row-body">
                                <ShopNhomMoTaField
                                  value={newNhomMoTa}
                                  disabled={creatingNhom}
                                  placeholder="Mô tả ngắn (tuỳ chọn)"
                                  aria-label="Mô tả ngắn loại hàng mới"
                                  rows={2}
                                  onChange={setNewNhomMoTa}
                                />
                              </div>
                            </li>
                          ) : null}
                          {list.map((n) => {
                            const open = expandedNhomId === n.id;
                            return (
                              <li
                                key={n.id}
                                className={`shop-kho-nhom-row${open ? " is-open" : ""}`}
                              >
                                <button
                                  type="button"
                                  className="shop-kho-nhom-row-toggle"
                                  aria-expanded={open}
                                  aria-controls={`shop-kho-nhom-mota-${n.id}`}
                                  id={`shop-kho-nhom-toggle-${n.id}`}
                                  onClick={() =>
                                    setExpandedNhomId((cur) =>
                                      cur === n.id ? null : n.id,
                                    )
                                  }
                                >
                                  <span className="shop-kho-nhom-name">
                                    {n.nhan}
                                  </span>
                                  <ChevronDown
                                    size={16}
                                    strokeWidth={2}
                                    className="shop-kho-nhom-row-chevron"
                                    aria-hidden
                                  />
                                </button>
                                {open ? (
                                  <div
                                    className="shop-kho-nhom-row-body"
                                    id={`shop-kho-nhom-mota-${n.id}`}
                                    role="region"
                                    aria-labelledby={`shop-kho-nhom-toggle-${n.id}`}
                                  >
                                    <ShopNhomMoTaField
                                      value={nhomMoTaDrafts[n.id] ?? ""}
                                      disabled={savingNhomId === n.id}
                                      aria-label={`Mô tả ${n.nhan}`}
                                      onChange={(next) =>
                                        setNhomMoTaDrafts((d) => ({
                                          ...d,
                                          [n.id]: next,
                                        }))
                                      }
                                      onBlur={() => void saveNhomMoTa(n.id)}
                                    />
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="shop-kho-nhom-empty">
                          Chưa có {label.toLowerCase()}. Bấm + để thêm.
                        </p>
                      )}

                      <button
                        type="button"
                        className="shop-kho-nhom-add-btn"
                        disabled={creatingNhom || draftingNhom}
                        aria-label={`Thêm ${label.toLowerCase()}`}
                        title={`Thêm ${label.toLowerCase()}`}
                        onClick={startDraftNhom}
                      >
                        {creatingNhom ? (
                          <Loader2 size={16} className="shop-spin" aria-hidden />
                        ) : (
                          <Plus size={16} strokeWidth={2.25} aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })(),
            document.body,
          )
        : null}

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
    </div>
  );
}


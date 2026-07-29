"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  ListFilter,
  Loader2,
  Package,
  PackageCheck,
  X,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import {
  fetchDonHangCached,
  peekDonHang,
} from "@/lib/shop/client-fetch-cache";
import {
  SHOP_DON_NHAC_GIO,
  SHOP_TRANG_THAI_DON_LABEL,
  type ShopDonHang,
  type ShopLoaiDon,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";

import { exportDonsToViettelPostXlsx } from "@/lib/shop/export-viettelpost";

import { ShopDashTabs } from "./ShopDashTabs";
import { ShopDonDetailModal } from "./ShopDonDetailModal";
import "./shop-dashboard.css";

const LOAI_DON_SHORT: Record<ShopLoaiDon, string> = {
  mua_ngay: "Đã thanh toán",
  dat_truoc_nhan_su_kien: "Thanh toán sau",
};

/** Tab quản lý theo trạng thái đơn. `null` = tất cả. */
type DonTab = "can_xu_ly" | "hoan_thanh" | "huy" | "tat_ca";

const DON_TAB_ORDER: DonTab[] = ["can_xu_ly", "hoan_thanh", "huy", "tat_ca"];

const DON_TAB_LABEL: Record<DonTab, string> = {
  can_xu_ly: "Cần xử lý",
  hoan_thanh: "Hoàn thành",
  huy: "Đã hủy",
  tat_ca: "Tất cả",
};

const DON_TAB_STATUSES: Record<DonTab, ShopTrangThaiDon[] | null> = {
  // `da_giao_tai_su_kien` vẫn cần shop chủ động gán «hoàn thành» → xếp ở đây.
  can_xu_ly: ["cho_xac_nhan", "da_nhan_tien", "da_giao_tai_su_kien"],
  hoan_thanh: ["hoan_thanh"],
  huy: ["huy"],
  tat_ca: null,
};

/** Trạng thái đơn có thể chuyển sang «hoàn thành». */
function canComplete(d: ShopDonHang): boolean {
  return d.trangThai === "da_nhan_tien" || d.trangThai === "da_giao_tai_su_kien";
}

type BulkAction = "prep" | "export";

const BULK_ACTION_VERB: Record<BulkAction, string> = {
  prep: "chuẩn bị",
  export: "xuất Excel",
};

function formatDonTime(iso: string): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const date = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return `${time} ${date}`;
  } catch {
    return iso;
  }
}

function tongSoLuong(d: ShopDonHang): number {
  return d.dong.reduce((sum, line) => sum + line.soLuong, 0);
}

/** Tuổi đơn `cho_xac_nhan` + mức nhắc (aging) — nền tảng nhắc, seller tự xử lý. */
function donAging(
  d: ShopDonHang,
): { label: string; level: "ok" | "warn" | "overdue" } | null {
  if (d.trangThai !== "cho_xac_nhan") return null;
  const ageH = (Date.now() - new Date(d.taoLuc).getTime()) / 3_600_000;
  const days = Math.floor(ageH / 24);
  const label =
    days >= 1
      ? `${days} ngày`
      : ageH >= 1
        ? `${Math.floor(ageH)} giờ`
        : "mới";
  const level: "ok" | "warn" | "overdue" =
    ageH >= SHOP_DON_NHAC_GIO ? "overdue" : ageH >= 24 ? "warn" : "ok";
  return { label, level };
}

const PREP_LOAI_ALL = "__all__";
const PREP_LOAI_KHAC = "Chưa phân loại";

type PrepLine = {
  key: string;
  ten: string;
  nhan: string | null;
  soLuong: number;
  anhUrl: string | null;
  phanLoai: string;
  /** Đơn chứa mẫu này + SL trong từng đơn. */
  dons: Array<{ idDon: string; soLuong: number }>;
};

function prepLineKey(
  line: Pick<ShopDonHang["dong"][number], "idBienThe" | "tenSnapshot" | "nhanSnapshot">,
): string {
  const nhanRaw = line.nhanSnapshot?.trim() || "";
  const nhan = nhanRaw && nhanRaw !== "Mặc định" ? nhanRaw : null;
  return `${line.idBienThe ?? line.tenSnapshot}::${nhan ?? ""}`;
}

function aggregatePrepLines(dons: ShopDonHang[]): PrepLine[] {
  const map = new Map<string, PrepLine>();
  for (const d of dons) {
    for (const line of d.dong) {
      const nhanRaw = line.nhanSnapshot?.trim() || "";
      const nhan =
        nhanRaw && nhanRaw !== "Mặc định" ? nhanRaw : null;
      const phanLoai = line.phanLoai?.trim() || PREP_LOAI_KHAC;
      const key = prepLineKey(line);
      const prev = map.get(key);
      if (prev) {
        prev.soLuong += line.soLuong;
        if (!prev.anhUrl && line.anhUrl) prev.anhUrl = line.anhUrl;
        const hit = prev.dons.find((x) => x.idDon === d.id);
        if (hit) hit.soLuong += line.soLuong;
        else prev.dons.push({ idDon: d.id, soLuong: line.soLuong });
      } else {
        map.set(key, {
          key,
          ten: line.tenSnapshot,
          nhan,
          soLuong: line.soLuong,
          anhUrl: line.anhUrl ?? null,
          phanLoai,
          dons: [{ idDon: d.id, soLuong: line.soLuong }],
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => {
    const byLoai = a.phanLoai.localeCompare(b.phanLoai, "vi");
    if (byLoai !== 0) return byLoai;
    const byName = a.ten.localeCompare(b.ten, "vi");
    if (byName !== 0) return byName;
    return (a.nhan ?? "").localeCompare(b.nhan ?? "", "vi");
  });
}

function groupPrepByLoai(lines: PrepLine[]): Array<{
  loai: string;
  lines: PrepLine[];
  tong: number;
}> {
  const map = new Map<string, PrepLine[]>();
  for (const line of lines) {
    const list = map.get(line.phanLoai) ?? [];
    list.push(line);
    map.set(line.phanLoai, list);
  }
  return [...map.entries()]
    .map(([loai, groupLines]) => ({
      loai,
      lines: groupLines,
      tong: groupLines.reduce((s, l) => s + l.soLuong, 0),
    }))
    .sort((a, b) => a.loai.localeCompare(b.loai, "vi"));
}

function formatTimeRange(dons: ShopDonHang[]): string {
  if (dons.length === 0) return "—";
  const times = dons
    .map((d) => new Date(d.taoLuc).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (times.length === 0) return "—";
  const from = formatDonTime(new Date(times[0]!).toISOString());
  const to = formatDonTime(new Date(times[times.length - 1]!).toISOString());
  return from === to ? from : `${from} → ${to}`;
}

export function ShopDonClient() {
  const { openChat } = useCinsChat();
  // Seed state from hover-prefetch cache — avoids full spinner on tab switch
  const [cachedItems] = useState<ShopDonHang[] | null>(() => peekDonHang());
  const [items, setItems] = useState<ShopDonHang[]>(cachedItems ?? []);
  const [loading, setLoading] = useState(cachedItems === null);
  const [err, setErr] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tab, setTab] = useState<DonTab>("can_xu_ly");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** Bulk action đang chờ user chọn đơn (khi bấm lúc chưa chọn gì). */
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [completeErr, setCompleteErr] = useState<string | null>(null);
  /** Đơn đang hoàn thành lẻ (nút trong hàng) — tách khỏi bulk. */
  const [rowCompletingId, setRowCompletingId] = useState<string | null>(null);
  const [prepOpen, setPrepOpen] = useState(false);
  const [prepLoaiFilter, setPrepLoaiFilter] = useState<Set<string>>(new Set());
  const [prepSelectOpen, setPrepSelectOpen] = useState(false);
  const prepSelectRef = useRef<HTMLDivElement>(null);
  const [prepExpandedKey, setPrepExpandedKey] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const lastSelectIndexRef = useRef<number | null>(null);
  const shiftHeldRef = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const load = useCallback(async (opts?: { force?: boolean }) => {
    // If we have cached data (from hover prefetch), refresh silently in bg
    const suppress = !opts?.force && cachedItems !== null;
    if (!suppress) { setLoading(true); setErr(null); }
    try {
      const data = await fetchDonHangCached(opts?.force ? { force: true } : undefined);
      setItems(data);
    } catch {
      setErr("Không tải đơn.");
    } finally {
      if (!suppress) setLoading(false);
    }
  // cachedItems is stable (useState initializer runs once)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedDons = useMemo(
    () => items.filter((d) => selectedIdSet.has(d.id)),
    [items, selectedIdSet],
  );

  const visibleItems = useMemo(() => {
    const statuses = DON_TAB_STATUSES[tab];
    if (!statuses) return items;
    const set = new Set(statuses);
    return items.filter((d) => set.has(d.trangThai));
  }, [items, tab]);

  const tabCounts = useMemo(() => {
    const counts: Record<DonTab, number> = {
      can_xu_ly: 0,
      hoan_thanh: 0,
      huy: 0,
      tat_ca: items.length,
    };
    for (const d of items) {
      if (
        d.trangThai === "cho_xac_nhan" ||
        d.trangThai === "da_nhan_tien" ||
        d.trangThai === "da_giao_tai_su_kien"
      ) {
        counts.can_xu_ly += 1;
      } else if (d.trangThai === "hoan_thanh") {
        counts.hoan_thanh += 1;
      } else if (d.trangThai === "huy") {
        counts.huy += 1;
      }
    }
    return counts;
  }, [items]);

  /** Đơn «đã nhận tiền» đang hiển thị — quick-select cho chuẩn bị/hoàn thành. */
  const paidVisible = useMemo(
    () => visibleItems.filter((d) => d.trangThai === "da_nhan_tien"),
    [visibleItems],
  );

  const prepLines = useMemo(
    () => aggregatePrepLines(selectedDons),
    [selectedDons],
  );

  const prepLoaiOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of prepLines) {
      counts.set(line.phanLoai, (counts.get(line.phanLoai) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([loai, count]) => ({ loai, count }))
      .sort((a, b) => a.loai.localeCompare(b.loai, "vi"));
  }, [prepLines]);

  const prepGroups = useMemo(() => {
    const filtered =
      prepLoaiFilter.size === 0
        ? prepLines
        : prepLines.filter((l) => prepLoaiFilter.has(l.phanLoai));
    return groupPrepByLoai(filtered);
  }, [prepLines, prepLoaiFilter]);

  const prepTongSp = useMemo(
    () => prepGroups.reduce((sum, g) => sum + g.tong, 0),
    [prepGroups],
  );

  const prepLoaiCount = useMemo(
    () => prepGroups.reduce((sum, g) => sum + g.lines.length, 0),
    [prepGroups],
  );

  const selectedDonById = useMemo(
    () => new Map(selectedDons.map((d) => [d.id, d])),
    [selectedDons],
  );

  useEffect(() => {
    if (!prepExpandedKey) return;
    if (!prepLines.some((l) => l.key === prepExpandedKey)) {
      setPrepExpandedKey(null);
    }
  }, [prepExpandedKey, prepLines]);

  useEffect(() => {
    if (!prepSelectOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!prepSelectRef.current?.contains(e.target as Node)) {
        setPrepSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [prepSelectOpen]);

  const closePrep = useCallback(() => {
    setPrepOpen(false);
    setPrepExpandedKey(null);
    setPrepLoaiFilter(new Set());
  }, []);

  const togglePrepLoai = useCallback((loai: string) => {
    setPrepLoaiFilter((prev) => {
      const next = new Set(prev);
      if (next.has(loai)) next.delete(loai);
      else next.add(loai);
      return next;
    });
  }, []);

  const togglePrepExpand = useCallback((key: string) => {
    setPrepExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  const resolvePrepDons = useCallback(
    (line: PrepLine) =>
      line.dons
        .map((hit) => {
          const don = selectedDonById.get(hit.idDon);
          if (!don) return null;
          return { don, soLuong: hit.soLuong };
        })
        .filter((x): x is { don: ShopDonHang; soLuong: number } => x != null)
        .sort(
          (a, b) =>
            new Date(a.don.taoLuc).getTime() - new Date(b.don.taoLuc).getTime(),
        ),
    [selectedDonById],
  );

  const allSelected =
    visibleItems.length > 0 && visibleItems.every((d) => selectedIdSet.has(d.id));

  const applySelect = useCallback(
    (id: string, index: number, shiftKey: boolean, checked: boolean) => {
      setSelectedIds((prev) => {
        if (shiftKey && lastSelectIndexRef.current != null) {
          const a = Math.min(lastSelectIndexRef.current, index);
          const b = Math.max(lastSelectIndexRef.current, index);
          const next = new Set(prev);
          for (let i = a; i <= b; i++) {
            const row = visibleItems[i];
            if (row) next.add(row.id);
          }
          return [...next];
        }
        if (checked) {
          return prev.includes(id) ? prev : [...prev, id];
        }
        return prev.filter((x) => x !== id);
      });
      if (!shiftKey) lastSelectIndexRef.current = index;
    },
    [visibleItems],
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (visibleItems.length > 0 && visibleItems.every((d) => prev.includes(d.id))) {
        lastSelectIndexRef.current = null;
        return [];
      }
      return visibleItems.map((d) => d.id);
    });
  }, [visibleItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    lastSelectIndexRef.current = null;
    setPendingBulk(null);
    closePrep();
  }, [closePrep]);

  /* Đổi tab = ngữ cảnh chọn khác nhau → reset lựa chọn + prompt. */
  useEffect(() => {
    setSelectedIds([]);
    lastSelectIndexRef.current = null;
    setPendingBulk(null);
    setCompleteErr(null);
    setExportErr(null);
  }, [tab]);

  const openPrep = useCallback(() => {
    setPrepLoaiFilter(new Set());
    setPrepExpandedKey(null);
    setPrepOpen(true);
  }, []);

  const exportDons = useCallback(
    async (dons: ShopDonHang[]) => {
      if (dons.length === 0 || exporting) return;
      setExporting(true);
      setExportErr(null);
      try {
        await exportDonsToViettelPostXlsx(dons);
      } catch {
        setExportErr("Không xuất được file. Thử lại.");
      } finally {
        setExporting(false);
      }
    },
    [exporting],
  );

  /** Hoàn thành một đơn ngay trong hàng (không cần chọn / mở modal). */
  const completeOne = useCallback(
    async (d: ShopDonHang) => {
      if (!canComplete(d) || rowCompletingId) return;
      setRowCompletingId(d.id);
      setCompleteErr(null);
      try {
        const res = await fetch(`/api/shop/don/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "hoan_thanh" }),
        });
        const json = (await res.json().catch(() => null)) as {
          don?: ShopDonHang;
          error?: string;
        } | null;
        if (res.ok && json?.don) {
          const updated = json.don;
          setItems((prev) =>
            prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)),
          );
          setSelectedIds((prev) => prev.filter((id) => id !== updated.id));
        } else {
          setCompleteErr(json?.error ?? "Không hoàn thành được đơn.");
        }
      } catch {
        setCompleteErr("Không hoàn thành được đơn.");
      } finally {
        setRowCompletingId(null);
      }
    },
    [rowCompletingId],
  );

  /** Bấm 1 nút bulk: có chọn thì chạy; chưa chọn thì mở prompt yêu cầu chọn đơn. */
  const runBulk = useCallback(
    (action: BulkAction) => {
      setExportErr(null);
      setCompleteErr(null);
      if (selectedIds.length === 0) {
        setPendingBulk(action);
        return;
      }
      setPendingBulk(null);
      if (action === "prep") {
        openPrep();
      } else if (action === "export") {
        void exportDons(selectedDons);
      }
    },
    [selectedIds.length, selectedDons, openPrep, exportDons],
  );

  /** Quick-select trong prompt: chọn nhóm đơn rồi chạy luôn action đang chờ. */
  const quickSelect = useCallback(
    (kind: "paid" | "visible") => {
      const source = kind === "paid" ? paidVisible : visibleItems;
      const ids = source.map((d) => d.id);
      if (ids.length === 0) return;
      const action = pendingBulk;
      setSelectedIds(ids);
      lastSelectIndexRef.current = null;
      setPendingBulk(null);
      if (action === "prep") {
        openPrep();
      } else if (action === "export") {
        void exportDons(source);
      }
    },
    [paidVisible, visibleItems, pendingBulk, openPrep, exportDons],
  );

  useEffect(() => {
    if (!prepOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailId != null) return;
      closePrep();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prepOpen, closePrep, detailId]);

  if (loading) {
    return (
      <div className="shop-dash">
        <ShopDashTabs active="don" />
        <div className="shop-dash-loading" aria-busy="true">
          <Loader2 className="shop-spin" size={20} aria-hidden />
          Đang tải…
        </div>
      </div>
    );
  }

  const hasSelection = selectedIds.length > 0;
  const bulkBar = (
    <div className="shop-don-bulk" role="toolbar" aria-label="Thao tác đơn hàng loạt">
      <div className="shop-don-bulk-head">
        <span className="shop-don-bulk-count">
          {hasSelection ? (
            <>
              Đã chọn <strong>{selectedIds.length}</strong> đơn
            </>
          ) : (
            "Chưa chọn đơn"
          )}
        </span>
        {hasSelection ? (
          <button
            type="button"
            className="shop-don-bulk-clear"
            onClick={clearSelection}
          >
            <X size={14} strokeWidth={2.4} aria-hidden />
            Bỏ chọn
          </button>
        ) : null}
      </div>
      <div className="shop-don-bulk-actions">
        <button
          type="button"
          className="shop-don-bulk-btn is-primary"
          title="Mở danh sách chuẩn bị hàng"
          onClick={() => runBulk("prep")}
        >
          <PackageCheck size={15} strokeWidth={2.2} aria-hidden />
          Chuẩn bị
        </button>
        <button
          type="button"
          className="shop-don-bulk-btn"
          disabled={exporting}
          title="Xuất file Excel theo mẫu ViettelPost"
          onClick={() => runBulk("export")}
        >
          {exporting ? (
            <Loader2 size={15} className="shop-spin" aria-hidden />
          ) : (
            <FileSpreadsheet size={15} strokeWidth={2.2} aria-hidden />
          )}
          Xuất Excel
        </button>
      </div>

      {pendingBulk ? (
        <div className="shop-don-bulk-prompt" role="group">
          <p className="shop-don-bulk-prompt-title">
            Chọn đơn cần {BULK_ACTION_VERB[pendingBulk]}:
          </p>
          <div className="shop-don-bulk-prompt-opts">
            {paidVisible.length > 0 ? (
              <button
                type="button"
                className="shop-don-bulk-prompt-btn"
                onClick={() => quickSelect("paid")}
              >
                Đơn đã nhận tiền ({paidVisible.length})
              </button>
            ) : null}
            <button
              type="button"
              className="shop-don-bulk-prompt-btn"
              disabled={visibleItems.length === 0}
              onClick={() => quickSelect("visible")}
            >
              Tất cả đang hiển thị ({visibleItems.length})
            </button>
            <button
              type="button"
              className="shop-don-bulk-prompt-btn ghost"
              onClick={() => setPendingBulk(null)}
            >
              Để tôi tự chọn
            </button>
          </div>
          <p className="shop-don-bulk-prompt-hint">
            Hoặc tích chọn từng đơn trong bảng bên dưới.
          </p>
        </div>
      ) : null}

      {exportErr ? (
        <span className="shop-don-bulk-err" role="alert">
          {exportErr}
        </span>
      ) : null}
      {completeErr ? (
        <span className="shop-don-bulk-err" role="alert">
          {completeErr}
        </span>
      ) : null}
    </div>
  );

  const statusTabs = (
    <div className="shop-don-status-tabs" role="tablist" aria-label="Lọc theo trạng thái đơn">
      {DON_TAB_ORDER.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          className={`shop-don-status-tab${tab === t ? " is-active" : ""}`}
          onClick={() => setTab(t)}
        >
          {DON_TAB_LABEL[t]}
          <span className="shop-don-status-tab-count">{tabCounts[t]}</span>
        </button>
      ))}
    </div>
  );

  const prepPortal =
    portalReady && prepOpen
      ? createPortal(
          <div
            className="shop-don-prep"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePrep();
            }}
          >
            <div
              className="shop-don-prep-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-don-prep-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="shop-don-prep-hdr">
                <div>
                  <p className="shop-don-prep-kicker">
                    {selectedDons.length} đơn · {formatTimeRange(selectedDons)}
                  </p>
                  <h3 id="shop-don-prep-title">Danh sách chuẩn bị</h3>
                </div>
                <button
                  type="button"
                  className="shop-don-prep-close"
                  aria-label="Đóng"
                  onClick={closePrep}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </header>

              {prepLines.length === 0 ? (
                <p className="shop-dash-hint">Không có mặt hàng trong các đơn đã chọn.</p>
              ) : (
                <>
                  {prepLoaiOptions.length > 1 ? (
                    <div className="shop-don-prep-select" ref={prepSelectRef}>
                      <button
                        type="button"
                        className={`shop-don-prep-select-btn${prepLoaiFilter.size > 0 ? " is-active" : ""}`}
                        aria-haspopup="listbox"
                        aria-expanded={prepSelectOpen}
                        onClick={() => setPrepSelectOpen((o) => !o)}
                      >
                        <ListFilter size={13} strokeWidth={2} aria-hidden />
                        {prepLoaiFilter.size === 0
                          ? "Tất cả loại"
                          : prepLoaiFilter.size === 1
                            ? [...prepLoaiFilter][0]
                            : `${prepLoaiFilter.size} loại`}
                        <ChevronDown
                          size={12}
                          strokeWidth={2.5}
                          aria-hidden
                          className={prepSelectOpen ? "is-open" : ""}
                        />
                      </button>
                      {prepSelectOpen ? (
                        <div
                          className="shop-don-prep-select-menu"
                          role="listbox"
                          aria-multiselectable="true"
                          aria-label="Lọc theo loại hàng"
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={prepLoaiFilter.size === 0}
                            className={`shop-don-prep-select-opt${prepLoaiFilter.size === 0 ? " is-checked" : ""}`}
                            onClick={() => {
                              setPrepLoaiFilter(new Set());
                              setPrepSelectOpen(false);
                            }}
                          >
                            <span className="shop-don-prep-select-check">
                              {prepLoaiFilter.size === 0 ? (
                                <Check size={11} strokeWidth={3} aria-hidden />
                              ) : null}
                            </span>
                            Tất cả
                            <span className="shop-don-prep-select-count">
                              {prepLines.length}
                            </span>
                          </button>
                          {prepLoaiOptions.map(({ loai, count }) => (
                            <button
                              key={loai}
                              type="button"
                              role="option"
                              aria-selected={prepLoaiFilter.has(loai)}
                              className={`shop-don-prep-select-opt${prepLoaiFilter.has(loai) ? " is-checked" : ""}`}
                              onClick={() => togglePrepLoai(loai)}
                            >
                              <span className="shop-don-prep-select-check">
                                {prepLoaiFilter.has(loai) ? (
                                  <Check
                                    size={11}
                                    strokeWidth={3}
                                    aria-hidden
                                  />
                                ) : null}
                              </span>
                              {loai}
                              <span className="shop-don-prep-select-count">
                                {count}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="shop-don-prep-table-wrap">
                    {prepGroups.map((group) => (
                      <section
                        key={group.loai}
                        className="shop-don-prep-group"
                      >
                        <header className="shop-don-prep-group-hdr">
                          <h4>{group.loai}</h4>
                          <span>×{group.tong}</span>
                        </header>
                        <table className="shop-don-prep-table">
                          <tbody>
                            {group.lines.map((line) => {
                              const expanded = prepExpandedKey === line.key;
                              const dons = expanded
                                ? resolvePrepDons(line)
                                : [];
                              return (
                                <Fragment key={line.key}>
                                  <tr
                                    className={
                                      expanded
                                        ? "shop-don-prep-row is-open"
                                        : "shop-don-prep-row"
                                    }
                                  >
                                    <td
                                      colSpan={2}
                                      className="shop-don-prep-row-cell"
                                    >
                                      <button
                                        type="button"
                                        className="shop-don-prep-row-btn"
                                        aria-expanded={expanded}
                                        onClick={() =>
                                          togglePrepExpand(line.key)
                                        }
                                      >
                                        <span className="shop-don-prep-item">
                                          <span
                                            className={`shop-don-prep-thumb${line.anhUrl ? "" : " is-empty"}`}
                                            aria-hidden
                                          >
                                            {line.anhUrl ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={line.anhUrl}
                                                alt=""
                                                loading="lazy"
                                              />
                                            ) : (
                                              <Package
                                                size={16}
                                                strokeWidth={1.8}
                                              />
                                            )}
                                          </span>
                                          <span className="shop-don-prep-item-copy">
                                            <span className="shop-don-prep-name">
                                              {line.ten}
                                            </span>
                                            {line.nhan ? (
                                              <span className="shop-don-prep-var">
                                                {line.nhan}
                                              </span>
                                            ) : null}
                                            <span className="shop-don-prep-hint">
                                              {line.dons.length} đơn
                                            </span>
                                          </span>
                                        </span>
                                        <span className="shop-don-prep-row-end">
                                          <span className="shop-don-prep-col-qty">
                                            ×{line.soLuong}
                                          </span>
                                          <ChevronDown
                                            className={`shop-don-prep-chevron${expanded ? " is-open" : ""}`}
                                            size={16}
                                            strokeWidth={2.2}
                                            aria-hidden
                                          />
                                        </span>
                                      </button>
                                    </td>
                                  </tr>
                                  {expanded ? (
                                    <tr className="shop-don-prep-expand-row">
                                      <td
                                        colSpan={2}
                                        className="shop-don-prep-expand-cell"
                                      >
                                        {dons.length === 0 ? (
                                          <p className="shop-don-prep-expand-empty">
                                            Không còn đơn nào cho mẫu này.
                                          </p>
                                        ) : (
                                          <ul className="shop-don-prep-don-list">
                                            {dons.map(({ don, soLuong }) => (
                                              <li key={don.id}>
                                                <button
                                                  type="button"
                                                  className="shop-don-prep-don-btn"
                                                  onClick={() =>
                                                    setDetailId(don.id)
                                                  }
                                                >
                                                  <span className="shop-don-prep-don-main">
                                                    <span className="shop-don-prep-don-ma">
                                                      {don.maDon ??
                                                        don.id.slice(0, 8)}
                                                    </span>
                                                    <span className="shop-don-prep-don-meta">
                                                      {don.muaTen?.trim() ||
                                                        "—"}
                                                      {" · "}
                                                      {formatDonTime(
                                                        don.taoLuc,
                                                      )}
                                                    </span>
                                                  </span>
                                                  <span className="shop-don-prep-don-side">
                                                    <span
                                                      className={`shop-status shop-status--${don.trangThai}`}
                                                    >
                                                      {
                                                        SHOP_TRANG_THAI_DON_LABEL[
                                                          don.trangThai
                                                        ]
                                                      }
                                                    </span>
                                                    <span className="shop-don-prep-col-qty">
                                                      ×{soLuong}
                                                    </span>
                                                  </span>
                                                </button>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </td>
                                    </tr>
                                  ) : null}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    ))}
                  </div>
                  <div className="shop-don-prep-foot">
                    <span>
                      {prepLoaiCount} mặt hàng
                      {prepGroups.length > 1
                        ? ` · ${prepGroups.length} loại`
                        : ""}
                      {" · tổng "}
                      <strong>×{prepTongSp}</strong>
                      {" · bấm hàng để xổ đơn"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shop-dash">
      <ShopDashTabs active="don" />

      {err ? <p className="shop-dash-err">{err}</p> : null}

      <div className="shop-don-toolbar">
        {statusTabs}
        {bulkBar}
      </div>

      {items.length === 0 ? (
        <p className="shop-dash-hint">Chưa có đơn nào.</p>
      ) : visibleItems.length === 0 ? (
        <p className="shop-dash-hint">Không có đơn ở mục này.</p>
      ) : (
        <div className="shop-grid-wrap">
          <table className="shop-grid shop-don-sheet">
            <thead>
              <tr>
                <th scope="col" className="shop-don-col-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Chọn tất cả đơn đang hiển thị"
                    onChange={toggleSelectAll}
                  />
                </th>
                <th scope="col" className="shop-don-col-time">
                  Thời gian
                </th>
                <th scope="col" className="shop-don-col-ma">
                  Mã đơn
                </th>
                <th scope="col" className="shop-don-col-tt">
                  Tình trạng
                </th>
                <th scope="col" className="shop-don-col-mua">
                  Người mua
                </th>
                <th scope="col" className="shop-don-col-loai">
                  Loại
                </th>
                <th scope="col" className="shop-don-col-sp">
                  SP
                </th>
                <th scope="col" className="shop-don-col-tong">
                  Tổng
                </th>
                <th scope="col" className="shop-don-col-act">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((d, index) => {
                const isSelected = selectedIdSet.has(d.id);
                return (
                  <tr
                    key={d.id}
                    className={`shop-grid-row shop-don-sheet-row${
                      d.loaiDon === "mua_ngay" ? " is-paid" : ""
                    }${isSelected ? " is-selected" : ""}`}
                    tabIndex={0}
                    onClick={() => setDetailId(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailId(d.id);
                      }
                    }}
                  >
                    <td
                      className="shop-don-col-check"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`Chọn đơn ${d.maDon ?? d.id.slice(0, 8)}`}
                        onMouseDown={(e) => {
                          shiftHeldRef.current = e.shiftKey;
                        }}
                        onChange={(e) => {
                          e.stopPropagation();
                          applySelect(
                            d.id,
                            index,
                            shiftHeldRef.current,
                            e.target.checked,
                          );
                          shiftHeldRef.current = false;
                        }}
                      />
                    </td>
                    <td className="shop-don-col-time">
                      {formatDonTime(d.taoLuc)}
                    </td>
                    <td className="shop-don-col-ma">
                      <span className="shop-dash-ma">{d.maDon ?? "—"}</span>
                    </td>
                    <td className="shop-don-col-tt">
                      <span className={`shop-status shop-status--${d.trangThai}`}>
                        {SHOP_TRANG_THAI_DON_LABEL[d.trangThai]}
                      </span>
                      {(() => {
                        const aging = donAging(d);
                        if (!aging || aging.level === "ok") return null;
                        return (
                          <span
                            className={`shop-don-age shop-don-age--${aging.level}`}
                            title={
                              aging.level === "overdue"
                                ? "Chờ quá lâu — nên xác nhận hoặc hủy"
                                : "Đơn chờ đã lâu — cần đối soát"
                            }
                          >
                            {aging.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="shop-don-col-mua">
                      {d.muaTen?.trim() || "—"}
                    </td>
                    <td className="shop-don-col-loai">
                      {LOAI_DON_SHORT[d.loaiDon]}
                    </td>
                    <td className="shop-don-col-sp">{tongSoLuong(d)}</td>
                    <td className="shop-don-col-tong">
                      {d.tongTien.toLocaleString("vi-VN")} {d.tienTe}
                    </td>
                    <td
                      className="shop-don-col-act"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {canComplete(d) ? (
                        <button
                          type="button"
                          className="shop-don-row-done"
                          disabled={rowCompletingId === d.id}
                          onClick={() => void completeOne(d)}
                          title="Đánh dấu đơn đã hoàn thành"
                        >
                          {rowCompletingId === d.id ? (
                            <Loader2
                              size={13}
                              className="shop-spin"
                              aria-hidden
                            />
                          ) : (
                            <CheckCircle2
                              size={13}
                              strokeWidth={2.2}
                              aria-hidden
                            />
                          )}
                          Hoàn thành
                        </button>
                      ) : (
                        <span className="shop-don-row-act-empty">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="shop-don-select-hint">
            Giữ <kbd>Shift</kbd> khi chọn ô để chọn hàng loạt.
          </p>
        </div>
      )}

      <ShopDonDetailModal
        donId={detailId}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        viewerRole="seller"
        onDonChange={(don) => {
          setItems((prev) =>
            prev.map((it) => (it.id === don.id ? { ...it, ...don } : it)),
          );
        }}
        onOpenChat={(userId) => {
          void openChat({ targetUserId: userId });
        }}
      />

      {prepPortal}
    </div>
  );
}

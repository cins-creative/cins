"use client";

import {
  Check,
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
  type ShopDonHang,
  type ShopTrangThaiDon,
} from "@/lib/shop/types";
import {
  detectDvvcTuLink,
  SHOP_DVVC_OPTIONS,
  SHOP_VAN_CHUYEN_MA_MAX,
} from "@/lib/shop/van-chuyen";

import {
  exportDonsToCsv,
  exportDonsToViettelPostXlsx,
} from "@/lib/shop/export-viettelpost";

import { ShopDonDetailModal } from "./ShopDonDetailModal";
import "./shop-dashboard.css";

function donHinhThucShort(hinh: ShopDonHang["hinhThucGiao"]): string {
  if (hinh === "online") return "ĐVVC (buyer trả ship)";
  if (hinh === "tai_su_kien") return "Tại sự kiện";
  return "Gặp trực tiếp";
}

/** Lời nhắn buyer → seller (bỏ dòng hệ thống hóa đơn). */
function donGhiChuSeller(ghiChu: string | null | undefined): string {
  return (ghiChu ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("Hóa đơn thanh toán:"))
    .join(" ")
    .trim();
}

const VAN_CHUYEN_EDITABLE: ShopTrangThaiDon[] = [
  "da_nhan_tien",
  "cho_lay_hang",
  "dang_giao",
  "da_giao_tai_su_kien",
];

function canEditVanChuyen(trangThai: ShopTrangThaiDon): boolean {
  return VAN_CHUYEN_EDITABLE.includes(trangThai);
}

/** Tab lọc theo bước pipeline (khớp cột Act). `null` = tất cả. */
type DonTab =
  | "cho_xac_nhan"
  | "dang_soan"
  | "cho_lay_hang"
  | "dang_giao"
  | "hoan_thanh"
  | "huy"
  | "tat_ca";

const DON_TAB_ORDER: DonTab[] = [
  "cho_xac_nhan",
  "dang_soan",
  "cho_lay_hang",
  "dang_giao",
  "hoan_thanh",
  "huy",
  "tat_ca",
];

/** 5 bước tiến độ đơn — render dạng mũi tên. */
const DON_TAB_PIPELINE: DonTab[] = [
  "cho_xac_nhan",
  "dang_soan",
  "cho_lay_hang",
  "dang_giao",
  "hoan_thanh",
];

/** Bộ lọc ngoài pipeline. */
const DON_TAB_SIDE: DonTab[] = ["huy", "tat_ca"];

/** Nhãn ngắn — khớp hành động Act / trạng thái đơn. */
const DON_TAB_LABEL: Record<DonTab, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  dang_soan: "Đang soạn",
  cho_lay_hang: "Chờ lấy hàng",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  huy: "Hủy / trả",
  tat_ca: "Tất cả",
};

const DON_TAB_STATUSES: Record<DonTab, ShopTrangThaiDon[] | null> = {
  cho_xac_nhan: ["cho_xac_nhan"],
  dang_soan: ["da_nhan_tien", "da_giao_tai_su_kien"],
  cho_lay_hang: ["cho_lay_hang"],
  dang_giao: ["dang_giao"],
  hoan_thanh: ["hoan_thanh"],
  huy: ["huy", "hoan_tra"],
  tat_ca: null,
};

type DonActOption = {
  action: string;
  label: string;
  danger?: boolean;
};

/** Các bước shop quyết: nhận tiền → hoàn thành (tự ship ngoài CINs). */
function donActOptions(d: ShopDonHang): DonActOption[] {
  switch (d.trangThai) {
    case "cho_xac_nhan":
      return [
        {
          action:
            d.loaiDon === "dat_truoc_nhan_su_kien"
              ? "da_giao_tai_su_kien"
              : "da_nhan_tien",
          label: "Xác nhận đã nhận tiền",
        },
      ];
    case "da_nhan_tien":
    case "cho_lay_hang":
    case "dang_giao":
      return [{ action: "hoan_thanh", label: "Hoàn thành" }];
    case "da_giao_tai_su_kien":
      return [{ action: "hoan_thanh", label: "Hoàn thành" }];
    default:
      return [];
  }
}

/**
 * Cột bảng = thanh toán (2 trạng thái chính).
 * Pipeline (chờ lấy / đang giao…) nằm ở tab lọc phía trên — không lặp lại ở đây.
 */
function donThanhToanBadge(d: ShopDonHang): {
  key: "cho_xac_nhan" | "da_nhan_tien" | "huy" | "hoan_tra";
  label: string;
} {
  if (d.trangThai === "cho_xac_nhan" || d.trangThai === "nhap") {
    return { key: "cho_xac_nhan", label: "Chờ xác nhận" };
  }
  if (d.trangThai === "huy") {
    return { key: "huy", label: "Đã hủy" };
  }
  if (d.trangThai === "hoan_tra") {
    return { key: "hoan_tra", label: "Hoàn trả" };
  }
  return { key: "da_nhan_tien", label: "Đã nhận tiền" };
}

type BulkAction = "prep" | "export" | "export_csv";

const BULK_ACTION_VERB: Record<BulkAction, string> = {
  prep: "chuẩn bị",
  export: "xuất Excel Viettel",
  export_csv: "xuất CSV",
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
  const [tab, setTab] = useState<DonTab>("cho_xac_nhan");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** Bulk action đang chờ user chọn đơn (khi bấm lúc chưa chọn gì). */
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [completeErr, setCompleteErr] = useState<string | null>(null);
  /** Đơn đang hoàn thành lẻ (nút trong hàng) — tách khỏi bulk. */
  const [rowCompletingId, setRowCompletingId] = useState<string | null>(null);
  const [actMenuOpenId, setActMenuOpenId] = useState<string | null>(null);
  const [vcBusyId, setVcBusyId] = useState<string | null>(null);
  const vcSkipBlurRef = useRef(false);
  const actMenuRef = useRef<HTMLDivElement>(null);
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
    const counts = Object.fromEntries(
      DON_TAB_ORDER.map((t) => [t, t === "tat_ca" ? items.length : 0]),
    ) as Record<DonTab, number>;
    for (const d of items) {
      for (const t of DON_TAB_ORDER) {
        if (t === "tat_ca") continue;
        const statuses = DON_TAB_STATUSES[t];
        if (statuses?.includes(d.trangThai)) counts[t] += 1;
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

  useEffect(() => {
    if (!actMenuOpenId) return;
    function handleOutside(e: MouseEvent) {
      if (!actMenuRef.current?.contains(e.target as Node)) {
        setActMenuOpenId(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActMenuOpenId(null);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [actMenuOpenId]);

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
    async (dons: ShopDonHang[], kind: "xlsx" | "csv" = "xlsx") => {
      if (dons.length === 0 || exporting) return;
      setExporting(true);
      setExportErr(null);
      try {
        if (kind === "csv") {
          exportDonsToCsv(dons);
        } else {
          await exportDonsToViettelPostXlsx(dons);
        }
      } catch {
        setExportErr("Không xuất được file. Thử lại.");
      } finally {
        setExporting(false);
      }
    },
    [exporting],
  );

  /** Bước tiếp theo trên hàng (xác nhận / lấy hàng / giao / hoàn thành / hoàn trả). */
  const actOne = useCallback(
    async (d: ShopDonHang, action: string) => {
      if (rowCompletingId) return;
      setRowCompletingId(d.id);
      setCompleteErr(null);
      try {
        const res = await fetch(`/api/shop/don/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
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
          setCompleteErr(json?.error ?? "Không cập nhật được đơn.");
        }
      } catch {
        setCompleteErr("Không cập nhật được đơn.");
      } finally {
        setRowCompletingId(null);
      }
    },
    [rowCompletingId],
  );

  const saveVanChuyen = useCallback(
    async (
      d: ShopDonHang,
      next: { ma: string; dvvc: string },
    ) => {
      const ma = next.ma.trim();
      const dvvc = next.dvvc.trim();
      const prevMa = d.vanChuyenMa?.trim() || "";
      const prevDvvc = d.vanChuyenDvvc?.trim() || "";
      if (ma === prevMa && dvvc === prevDvvc) return;
      if (vcBusyId) return;
      setVcBusyId(d.id);
      setCompleteErr(null);
      const prev = d;
      try {
        const res = await fetch(`/api/shop/don/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cap_nhat_van_chuyen",
            ma,
            dvvc,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          don?: ShopDonHang;
          error?: string;
        } | null;
        if (res.ok && json?.don) {
          const updated = json.don;
          setItems((cur) =>
            cur.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)),
          );
        } else {
          setItems((cur) =>
            cur.map((it) => (it.id === prev.id ? prev : it)),
          );
          setCompleteErr(json?.error ?? "Không lưu được mã vận đơn.");
        }
      } catch {
        setItems((cur) => cur.map((it) => (it.id === prev.id ? prev : it)));
        setCompleteErr("Không lưu được mã vận đơn.");
      } finally {
        setVcBusyId(null);
      }
    },
    [vcBusyId],
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
        void exportDons(selectedDons, "xlsx");
      } else if (action === "export_csv") {
        void exportDons(selectedDons, "csv");
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
        void exportDons(source, "xlsx");
      } else if (action === "export_csv") {
        void exportDons(source, "csv");
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
      <div className="shop-dash-loading" aria-busy="true">
        <Loader2 className="shop-spin" size={20} aria-hidden />
        Đang tải…
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
          title="Xuất Excel theo mẫu ViettelPost (upload web VTP)"
          onClick={() => runBulk("export")}
        >
          {exporting ? (
            <Loader2 size={15} className="shop-spin" aria-hidden />
          ) : (
            <FileSpreadsheet size={15} strokeWidth={2.2} aria-hidden />
          )}
          Xuất Excel
        </button>
        <button
          type="button"
          className="shop-don-bulk-btn"
          disabled={exporting}
          title="Xuất CSV chung (họ tên, SĐT, địa chỉ, hàng)"
          onClick={() => runBulk("export_csv")}
        >
          {exporting ? (
            <Loader2 size={15} className="shop-spin" aria-hidden />
          ) : (
            <FileSpreadsheet size={15} strokeWidth={2.2} aria-hidden />
          )}
          CSV
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
    <div
      className="shop-don-status-tabs"
      role="tablist"
      aria-label="Lọc theo trạng thái đơn"
    >
      <div className="shop-don-status-steps" aria-label="Tiến độ đơn">
        {DON_TAB_PIPELINE.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={[
              "shop-don-status-step",
              i === 0 ? "is-first" : "",
              i === DON_TAB_PIPELINE.length - 1 ? "is-last" : "",
              tab === t ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setTab(t)}
          >
            <span className="shop-don-status-step-label">
              {DON_TAB_LABEL[t]}
            </span>
            <span className="shop-don-status-tab-count">{tabCounts[t]}</span>
          </button>
        ))}
      </div>
      <div className="shop-don-status-side">
        {DON_TAB_SIDE.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`shop-don-status-side-tab${tab === t ? " is-active" : ""}${t === "huy" ? " is-huy" : ""}`}
            onClick={() => setTab(t)}
          >
            {DON_TAB_LABEL[t]}
            <span className="shop-don-status-tab-count">{tabCounts[t]}</span>
          </button>
        ))}
      </div>
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
                                                      className={`shop-status shop-status--${donThanhToanBadge(don).key}`}
                                                    >
                                                      {
                                                        donThanhToanBadge(don)
                                                          .label
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
    <>
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
                  Thanh toán
                </th>
                <th scope="col" className="shop-don-col-mua">
                  Người mua
                </th>
                <th scope="col" className="shop-don-col-note">
                  Ghi chú
                </th>
                <th scope="col" className="shop-don-col-loai">
                  Giao / loại
                </th>
                <th scope="col" className="shop-don-col-dvvc">
                  ĐVVC
                </th>
                <th scope="col" className="shop-don-col-vc">
                  Mã vận đơn
                </th>
                <th scope="col" className="shop-don-col-sp">
                  SP
                </th>
                <th scope="col" className="shop-don-col-tong">
                  Tổng
                </th>
                <th scope="col" className="shop-don-col-act">
                  Tiếp theo
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
                      {(() => {
                        const pay = donThanhToanBadge(d);
                        return (
                          <span
                            className={`shop-status shop-status--${pay.key}`}
                          >
                            {pay.label}
                          </span>
                        );
                      })()}
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
                    <td className="shop-don-col-note">
                      {(() => {
                        const note = donGhiChuSeller(d.ghiChu);
                        if (!note) {
                          return <span className="shop-don-note-empty">—</span>;
                        }
                        return (
                          <span className="shop-don-note" title={note}>
                            {note}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="shop-don-col-loai">
                      <span className="shop-don-giao-loai">
                        <span
                          className={`shop-don-giao shop-don-giao--${d.hinhThucGiao ?? "truc_tiep"}`}
                        >
                          {donHinhThucShort(d.hinhThucGiao)}
                        </span>
                      </span>
                    </td>
                    <td
                      className="shop-don-col-dvvc"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const editable = canEditVanChuyen(d.trangThai);
                        const busy = vcBusyId === d.id;
                        const dvvc =
                          d.vanChuyenDvvc?.trim() ||
                          detectDvvcTuLink(d.vanChuyenLink) ||
                          "";
                        const ma = d.vanChuyenMa?.trim() || "";
                        if (!editable) {
                          return (
                            <span className="shop-don-vc-ro">
                              {dvvc || "—"}
                            </span>
                          );
                        }
                        return (
                          <select
                            className="shop-don-dvvc-select"
                            value={dvvc}
                            disabled={busy}
                            aria-label={`ĐVVC đơn ${d.maDon ?? d.id.slice(0, 8)}`}
                            onChange={(e) => {
                              const nextDvvc = e.target.value;
                              void saveVanChuyen(d, {
                                ma,
                                dvvc: nextDvvc,
                              });
                            }}
                          >
                            <option value="">Chọn ĐVVC</option>
                            {SHOP_DVVC_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td
                      className="shop-don-col-vc"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const editable = canEditVanChuyen(d.trangThai);
                        const busy = vcBusyId === d.id;
                        const ma = d.vanChuyenMa?.trim() || "";
                        const dvvc =
                          d.vanChuyenDvvc?.trim() ||
                          detectDvvcTuLink(d.vanChuyenLink) ||
                          "";
                        if (!editable) {
                          if (!ma) {
                            return (
                              <span
                                className="shop-don-vc-empty"
                                title={
                                  d.trangThai === "cho_xac_nhan"
                                    ? "Xác nhận đơn trước khi cập nhật vận chuyển"
                                    : undefined
                                }
                              >
                                —
                              </span>
                            );
                          }
                          return (
                            <span className="shop-don-vc-ro" title={ma}>
                              {ma}
                            </span>
                          );
                        }
                        return (
                          <form
                            className="shop-don-vc-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.elements.namedItem(
                                "vc",
                              ) as HTMLInputElement | null;
                              vcSkipBlurRef.current = true;
                              void saveVanChuyen(d, {
                                ma: input?.value ?? "",
                                dvvc,
                              });
                            }}
                          >
                            <input
                              key={`${d.id}:${ma}`}
                              name="vc"
                              type="text"
                              inputMode="text"
                              autoComplete="off"
                              className="shop-don-vc-input"
                              defaultValue={ma}
                              maxLength={SHOP_VAN_CHUYEN_MA_MAX}
                              placeholder="Mã vận đơn…"
                              disabled={busy}
                              title={
                                d.trangThai === "da_nhan_tien" ||
                                d.trangThai === "cho_lay_hang"
                                  ? "Lưu mã + ĐVVC sẽ chuyển đơn sang Đang giao"
                                  : undefined
                              }
                              aria-label={`Mã vận đơn ${d.maDon ?? d.id.slice(0, 8)}`}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  vcSkipBlurRef.current = true;
                                  e.currentTarget.value = ma;
                                  e.currentTarget.blur();
                                }
                              }}
                              onBlur={(e) => {
                                if (busy) return;
                                if (vcSkipBlurRef.current) {
                                  vcSkipBlurRef.current = false;
                                  return;
                                }
                                void saveVanChuyen(d, {
                                  ma: e.currentTarget.value,
                                  dvvc,
                                });
                              }}
                            />
                            {busy ? (
                              <Loader2
                                size={12}
                                className="shop-spin"
                                aria-hidden
                              />
                            ) : null}
                          </form>
                        );
                      })()}
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
                      {(() => {
                        const opts = donActOptions(d);
                        if (opts.length === 0) {
                          return (
                            <span className="shop-don-row-act-empty">—</span>
                          );
                        }
                        const busy = rowCompletingId === d.id;
                        const open = actMenuOpenId === d.id;
                        /* Một bước: nút thẳng. Nhiều bước: menu. */
                        if (opts.length === 1) {
                          const only = opts[0];
                          return (
                            <button
                              type="button"
                              className={`shop-don-act-primary${only.danger ? " is-danger" : ""}`}
                              disabled={busy}
                              aria-label={only.label}
                              onClick={() => void actOne(d, only.action)}
                            >
                              {busy ? (
                                <Loader2
                                  size={13}
                                  className="shop-spin"
                                  aria-hidden
                                />
                              ) : null}
                              {only.label}
                            </button>
                          );
                        }
                        return (
                          <div
                            className="shop-don-act-dd"
                            ref={open ? actMenuRef : undefined}
                          >
                            <button
                              type="button"
                              className={`shop-don-act-dd-btn${open ? " is-open" : ""}`}
                              disabled={busy}
                              aria-haspopup="listbox"
                              aria-expanded={open}
                              aria-label={`Bước tiếp theo đơn ${d.maDon ?? d.id}`}
                              onClick={() =>
                                setActMenuOpenId((cur) =>
                                  cur === d.id ? null : d.id,
                                )
                              }
                            >
                              {busy ? (
                                <Loader2
                                  size={13}
                                  className="shop-spin"
                                  aria-hidden
                                />
                              ) : null}
                              <span className="shop-don-act-dd-label">
                                Chọn bước
                              </span>
                              <ChevronDown
                                size={12}
                                strokeWidth={2.5}
                                aria-hidden
                                className={open ? "is-open" : ""}
                              />
                            </button>
                            {open && !busy ? (
                              <div
                                className="shop-don-act-dd-menu"
                                role="listbox"
                                aria-label="Chọn bước tiếp theo"
                              >
                                {opts.map((opt) => (
                                  <button
                                    key={opt.action}
                                    type="button"
                                    role="option"
                                    className={`shop-don-act-dd-opt${opt.danger ? " is-danger" : ""}`}
                                    onClick={() => {
                                      setActMenuOpenId(null);
                                      void actOne(d, opt.action);
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
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
    </>
  );
}

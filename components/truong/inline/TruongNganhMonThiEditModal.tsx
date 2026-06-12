"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MonThiThumb } from "@/components/truong/MonThiThumb";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { MonThiCatalogItem } from "@/lib/truong/calc-draft";
import {
  catalogAllowedForKhoiList,
  findKhoiThiMatchingMonSet,
} from "@/lib/truong/khoi-thi-match";
import { defaultThangDiemForHeSo } from "@/lib/truong/calc";
import {
  candidateCauHinhYears,
  cloneCauHinhForYear,
  createEmptyCauHinhDraft,
  resolveCauHinhFromClientCache,
} from "@/lib/truong/cau-hinh-tinh-diem";
import {
  readTruongInlineError,
  truongInlineFetch,
} from "@/lib/truong/inline-api";
import {
  groupMonThiCatalog,
  type KhoiThiCatalogItem,
} from "@/lib/truong/mon-thi-catalog";
import { fetchTruongCatalogBundle } from "@/lib/truong/truong-catalog-fetch";
import {
  inferSlotLoai,
  isArtsKhoiMa,
  monThiItemsForKhoiPreset,
} from "@/lib/truong/to-hop-mon-catalog";
import type { TruongCauHinhMon, TruongCauHinhTinhDiem } from "@/lib/truong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  programId: string;
  year: number;
  nganhTitle: string;
  /** Cache SSR toàn trang (mọi năm đã prefetch). */
  cauHinhCache?: Record<string, TruongCauHinhTinhDiem>;
  onApply: (config: TruongCauHinhTinhDiem) => void;
};

type RowDraft = {
  rowKey: string;
  mon: TruongCauHinhMon;
};

function newRowKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function configToRows(cfg: TruongCauHinhTinhDiem): RowDraft[] {
  return cfg.mon.map((mon) => ({
    rowKey: newRowKey(),
    mon: { ...mon },
  }));
}

function rowsToConfig(
  base: TruongCauHinhTinhDiem,
  rows: RowDraft[],
  heSo: Record<string, string>,
): TruongCauHinhTinhDiem {
  const mon = rows.map((r, idx) => {
    const id = r.mon.id_mon_thi;
    const hsRaw = heSo[id];
    const hs =
      hsRaw !== undefined && hsRaw !== ""
        ? parseFloat(hsRaw)
        : r.mon.he_so;
    const he_so = Number.isNaN(hs) ? r.mon.he_so : hs;
    return {
      ...r.mon,
      he_so,
      thang_diem: defaultThangDiemForHeSo(he_so),
      so_thu_tu: idx,
    };
  });
  return { ...base, mon };
}

function khoiOptionLabel(k: KhoiThiCatalogItem): string {
  const tail = k.formula || k.ten_to_hop;
  return tail ? `${k.ma_to_hop} · ${tail}` : k.ma_to_hop;
}

function buildRowsForKhoi(
  khoi: KhoiThiCatalogItem,
  catalog: MonThiCatalogItem[],
  heSoLookup: Record<string, string>,
): RowDraft[] {
  return monThiItemsForKhoiPreset(khoi, catalog).map((item, idx) => {
    const hsRaw = heSoLookup[item.id] ?? "1";
    const he_so = parseFloat(hsRaw) || 1;
    return {
      rowKey: newRowKey(),
      mon: {
        id_mon_thi: item.id,
        ten: item.ten,
        loai: item.loai,
        ma: item.ma ?? null,
        thumbnail_id: item.thumbnail_id ?? null,
        thumbnail_url: item.thumbnail_url ?? null,
        he_so,
        thang_diem: defaultThangDiemForHeSo(he_so),
        thoi_gian_phut: null,
        so_thu_tu: idx,
        ghi_chu: null,
      },
    };
  });
}

function flattenRowsForSave(
  selectedKhoiIds: Set<string>,
  rowsByKhoi: Record<string, RowDraft[]>,
  manualRows: RowDraft[],
): RowDraft[] {
  if (!selectedKhoiIds.size) return manualRows;
  const seen = new Set<string>();
  const out: RowDraft[] = [];
  for (const khoiId of selectedKhoiIds) {
    for (const row of rowsByKhoi[khoiId] ?? []) {
      if (seen.has(row.mon.id_mon_thi)) continue;
      seen.add(row.mon.id_mon_thi);
      out.push(row);
    }
  }
  return out;
}

function KhoiMultiSelectDropdown({
  artsKhoi,
  thptKhoi,
  selectedIds,
  onToggle,
  disabled,
}: {
  artsKhoi: KhoiThiCatalogItem[];
  thptKhoi: KhoiThiCatalogItem[];
  selectedIds: Set<string>;
  onToggle: (khoiId: string, checked: boolean) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const summary = useMemo(() => {
    if (!selectedIds.size) return "Chọn khối thi…";
    const labels = [...artsKhoi, ...thptKhoi]
      .filter((k) => selectedIds.has(k.id))
      .map((k) => k.ma_to_hop);
    return labels.join(" · ");
  }, [artsKhoi, thptKhoi, selectedIds]);

  return (
    <div className="tdh-khoi-multiselect" ref={rootRef}>
      <button
        type="button"
        className={`tdh-khoi-multiselect-trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tdh-khoi-multiselect-value">{summary}</span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>
      {open ? (
        <div className="tdh-khoi-multiselect-panel" role="listbox" aria-multiselectable>
          {artsKhoi.length > 0 ? (
            <div className="tdh-khoi-multiselect-group">
              <div className="tdh-khoi-multiselect-group-label">
                Khối năng khiếu (H · V · N)
              </div>
              {artsKhoi.map((k) => (
                <label key={k.id} className="tdh-khoi-multiselect-option">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(k.id)}
                    onChange={(e) => onToggle(k.id, e.target.checked)}
                  />
                  <span>{khoiOptionLabel(k)}</span>
                </label>
              ))}
            </div>
          ) : null}
          {thptKhoi.length > 0 ? (
            <div className="tdh-khoi-multiselect-group">
              <div className="tdh-khoi-multiselect-group-label">
                Khối THPT (A · C · D · …)
              </div>
              {thptKhoi.map((k) => (
                <label key={k.id} className="tdh-khoi-multiselect-option">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(k.id)}
                    onChange={(e) => onToggle(k.id, e.target.checked)}
                  />
                  <span>{khoiOptionLabel(k)}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MonThiCatalogOptions({
  catalog,
  filtered,
  loaiFilter,
  groupByLoai,
  usedMonIds,
  currentId,
  currentLabel,
}: {
  catalog: MonThiCatalogItem[];
  filtered: MonThiCatalogItem[];
  loaiFilter: string;
  groupByLoai: boolean;
  usedMonIds: Set<string>;
  currentId: string;
  currentLabel: string;
}) {
  const showOrphan =
    Boolean(currentId) && !filtered.some((c) => c.id === currentId);

  if (groupByLoai && loaiFilter === "all") {
    const groups = groupMonThiCatalog(filtered);
    return (
      <>
        {showOrphan ? (
          <option value={currentId}>{currentLabel}</option>
        ) : null}
        {groups.map((g) => (
          <optgroup key={g.loaiKey} label={g.label}>
            {g.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ten}
                {usedMonIds.has(c.id) && c.id !== currentId
                  ? " (đang dùng)"
                  : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </>
    );
  }

  return (
    <>
      {showOrphan ? (
        <option value={currentId}>{currentLabel}</option>
      ) : null}
      {filtered.map((c) => (
        <option key={c.id} value={c.id}>
          {c.ten}
          {usedMonIds.has(c.id) && c.id !== currentId ? " (đang dùng)" : ""}
        </option>
      ))}
    </>
  );
}

export function TruongNganhMonThiEditModal({
  open,
  onClose,
  orgId,
  programId,
  year,
  nganhTitle,
  cauHinhCache = {},
  onApply,
}: Props) {
  const [baseConfig, setBaseConfig] = useState<TruongCauHinhTinhDiem | null>(
    null,
  );
  const [rowsByKhoi, setRowsByKhoi] = useState<Record<string, RowDraft[]>>({});
  const [manualRows, setManualRows] = useState<RowDraft[]>([]);
  const [heSo, setHeSo] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<MonThiCatalogItem[]>([]);
  const [khoiCatalog, setKhoiCatalog] = useState<KhoiThiCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedKhoiIds, setSelectedKhoiIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeKhoiId, setActiveKhoiId] = useState<string | null>(null);
  const initialKhoiSyncedRef = useRef(false);

  const syncFromConfig = useCallback((cfg: TruongCauHinhTinhDiem | null) => {
    if (!cfg) {
      setBaseConfig(null);
      setRowsByKhoi({});
      setManualRows([]);
      setHeSo({});
      return;
    }
    setBaseConfig(cfg);
    if (!cfg.mon.length) {
      setRowsByKhoi({});
      setManualRows([]);
      setHeSo({});
      return;
    }
    setManualRows(configToRows(cfg));
    setRowsByKhoi({});
    const hs: Record<string, string> = {};
    for (const m of cfg.mon) {
      hs[m.id_mon_thi] = String(m.he_so);
    }
    setHeSo(hs);
  }, []);

  useEffect(() => {
    if (!open) {
      initialKhoiSyncedRef.current = false;
      setSelectedKhoiIds(new Set());
      setActiveKhoiId(null);
      setRowsByKhoi({});
      return;
    }
    setError(null);
    setCatalogLoading(true);
    void fetchTruongCatalogBundle(orgId)
      .then(({ mon, khoi }) => {
        setCatalog(mon);
        setKhoiCatalog(khoi);
      })
      .catch(() => {
        setCatalog([]);
        setKhoiCatalog([]);
      })
      .finally(() => setCatalogLoading(false));
  }, [open, orgId]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function fetchYearConfig(nam: number) {
      const params = new URLSearchParams({
        nam: String(nam),
        nganh: programId,
      });
      const res = await fetch(
        `/api/truong/${encodeURIComponent(orgId)}/cau-hinh-tinh-diem?${params}`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { config?: TruongCauHinhTinhDiem };
      const cfg = json.config ?? null;
      return cfg?.mon.length ? cfg : null;
    }

    async function load() {
      setError(null);

      const cached = resolveCauHinhFromClientCache(
        cauHinhCache,
        programId,
        year,
      );
      if (cached) {
        if (!cancelled) syncFromConfig(cached);
        return;
      }

      setLoading(true);

      const years = candidateCauHinhYears(year);
      const results = await Promise.all(
        years.map(async (y) => ({ y, cfg: await fetchYearConfig(y) })),
      );
      if (cancelled) return;

      for (const y of years) {
        const hit = results.find((r) => r.y === y && r.cfg);
        if (hit?.cfg) {
          syncFromConfig(cloneCauHinhForYear(hit.cfg, programId, year));
          return;
        }
      }

      syncFromConfig(createEmptyCauHinhDraft(programId, year));
    }

    void load()
      .catch(() => {
        if (!cancelled) {
          syncFromConfig(null);
          setError("Lỗi kết nối khi tải môn thi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, cauHinhCache, orgId, programId, year, syncFromConfig]);

  const saveRows = useMemo(
    () => flattenRowsForSave(selectedKhoiIds, rowsByKhoi, manualRows),
    [selectedKhoiIds, rowsByKhoi, manualRows],
  );

  const selectedKhoiList = useMemo(
    () => khoiCatalog.filter((k) => selectedKhoiIds.has(k.id)),
    [khoiCatalog, selectedKhoiIds],
  );

  const activeKhoi = useMemo(
    () =>
      activeKhoiId
        ? (khoiCatalog.find((k) => k.id === activeKhoiId) ?? null)
        : null,
    [khoiCatalog, activeKhoiId],
  );

  const displayRows = useMemo(() => {
    if (selectedKhoiIds.size && activeKhoiId) {
      return rowsByKhoi[activeKhoiId] ?? [];
    }
    return manualRows;
  }, [selectedKhoiIds, activeKhoiId, rowsByKhoi, manualRows]);

  const displayUsedMonIds = useMemo(
    () => new Set(displayRows.map((r) => r.mon.id_mon_thi)),
    [displayRows],
  );

  const matchingKhoiList = useMemo(
    () =>
      findKhoiThiMatchingMonSet(
        khoiCatalog,
        saveRows.map((r) => r.mon.id_mon_thi),
        catalog,
      ),
    [khoiCatalog, saveRows, catalog],
  );

  useEffect(() => {
    if (!open || catalogLoading || !catalog.length || !khoiCatalog.length) {
      return;
    }
    if (initialKhoiSyncedRef.current || !manualRows.length) return;
    initialKhoiSyncedRef.current = true;

    const monIds = manualRows.map((r) => r.mon.id_mon_thi);
    const matching = findKhoiThiMatchingMonSet(
      khoiCatalog,
      monIds,
      catalog,
    );

    if (!matching.length) return;

    const hs = { ...heSo };
    for (const row of manualRows) {
      hs[row.mon.id_mon_thi] = String(row.mon.he_so);
    }

    const nextRowsByKhoi: Record<string, RowDraft[]> = {};
    for (const khoi of matching) {
      nextRowsByKhoi[khoi.id] = buildRowsForKhoi(khoi, catalog, hs);
    }

    setSelectedKhoiIds(new Set(matching.map((k) => k.id)));
    setRowsByKhoi(nextRowsByKhoi);
    setManualRows([]);
    setActiveKhoiId(matching[0]?.id ?? null);
  }, [open, catalogLoading, catalog, khoiCatalog, manualRows, heSo]);

  useEffect(() => {
    if (!selectedKhoiIds.size) {
      setActiveKhoiId(null);
      return;
    }
    if (!activeKhoiId || !selectedKhoiIds.has(activeKhoiId)) {
      setActiveKhoiId([...selectedKhoiIds][0] ?? null);
    }
  }, [selectedKhoiIds, activeKhoiId]);

  const filteredCatalog = useMemo(() => {
    if (activeKhoi) return catalogAllowedForKhoiList([activeKhoi], catalog);
    if (selectedKhoiList.length) {
      return catalogAllowedForKhoiList(selectedKhoiList, catalog);
    }
    return catalog;
  }, [catalog, activeKhoi, selectedKhoiList]);

  const addCandidates = filteredCatalog.filter(
    (c) => !displayUsedMonIds.has(c.id),
  );
  const groupPickByLoai = !activeKhoi;

  const thptKhoi = useMemo(
    () => khoiCatalog.filter((k) => !isArtsKhoiMa(k.ma_to_hop)),
    [khoiCatalog],
  );
  const artsKhoi = useMemo(
    () => khoiCatalog.filter((k) => isArtsKhoiMa(k.ma_to_hop)),
    [khoiCatalog],
  );

  function catalogForRow(row: RowDraft, index: number): MonThiCatalogItem[] {
    if (!activeKhoi) return catalog;
    const slot = activeKhoi.slots[index];
    const slotLoai = slot
      ? inferSlotLoai(slot.ten_slot, slot.loai)
      : row.mon.loai?.trim().toLowerCase() ?? null;

    if (slotLoai) {
      return catalog.filter(
        (c) => (c.loai?.trim().toLowerCase() ?? "") === slotLoai,
      );
    }
    return filteredCatalog;
  }

  function patchDisplayRows(updater: (prev: RowDraft[]) => RowDraft[]) {
    if (selectedKhoiIds.size && activeKhoiId) {
      setRowsByKhoi((prev) => ({
        ...prev,
        [activeKhoiId]: updater(prev[activeKhoiId] ?? []),
      }));
      return;
    }
    setManualRows(updater);
  }

  function toggleKhoi(khoiId: string, checked: boolean) {
    const next = new Set(selectedKhoiIds);
    if (checked) next.add(khoiId);
    else next.delete(khoiId);
    setSelectedKhoiIds(next);

    if (checked) {
      const khoi = khoiCatalog.find((k) => k.id === khoiId);
      if (khoi && catalog.length) {
        setRowsByKhoi((prev) => ({
          ...prev,
          [khoiId]: buildRowsForKhoi(khoi, catalog, heSo),
        }));
      }
      setActiveKhoiId(khoiId);
      setManualRows([]);
    } else {
      setRowsByKhoi((prev) => {
        const copy = { ...prev };
        delete copy[khoiId];
        return copy;
      });
      if (activeKhoiId === khoiId) {
        setActiveKhoiId([...next][0] ?? null);
      }
      if (!next.size && saveRows.length) {
        setManualRows(saveRows);
      }
    }
  }

  function migrateMonDraftKeys(
    prevId: string,
    nextId: string,
    otherPrevId: string | null,
  ) {
    if (!prevId || prevId === nextId) return;
    setHeSo((prev) => {
      const next = { ...prev };
      const rowHs = next[prevId];
      const otherHs =
        otherPrevId && otherPrevId !== nextId ? next[otherPrevId] : undefined;
      delete next[prevId];
      if (otherPrevId) delete next[nextId];
      if (rowHs !== undefined) next[nextId] = rowHs;
      if (otherPrevId && otherHs !== undefined) next[otherPrevId] = otherHs;
      return next;
    });
  }

  function replaceMonAt(index: number, catalogId: string) {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) return;
    const rows = displayRows;
    const prevId = rows[index]?.mon.id_mon_thi;
    if (!prevId || catalogId === prevId) return;

    const otherIdx = rows.findIndex(
      (r, i) => i !== index && r.mon.id_mon_thi === catalogId,
    );
    const otherPrevId =
      otherIdx >= 0 ? rows[otherIdx]?.mon.id_mon_thi ?? null : null;

    patchDisplayRows((prev) =>
      prev.map((r, i) => {
        if (i === index) {
          return {
            ...r,
            mon: {
              ...r.mon,
              id_mon_thi: item.id,
              ten: item.ten,
              loai: item.loai,
              ma: item.ma ?? null,
              thumbnail_id: item.thumbnail_id ?? null,
              thumbnail_url: item.thumbnail_url ?? null,
            },
          };
        }
        if (i === otherIdx && otherIdx >= 0) {
          const prevItem = catalog.find((c) => c.id === prevId);
          if (!prevItem) return r;
          return {
            ...r,
            mon: {
              ...r.mon,
              id_mon_thi: prevItem.id,
              ten: prevItem.ten,
              loai: prevItem.loai,
              ma: prevItem.ma ?? null,
              thumbnail_id: prevItem.thumbnail_id ?? null,
              thumbnail_url: prevItem.thumbnail_url ?? null,
            },
          };
        }
        return r;
      }),
    );

    migrateMonDraftKeys(prevId, catalogId, otherPrevId);
  }

  function removeRow(index: number) {
    const rows = displayRows;
    if (rows.length <= 1) return;
    const id = rows[index]?.mon.id_mon_thi;
    patchDisplayRows((prev) => prev.filter((_, i) => i !== index));
    if (id) {
      setHeSo((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function setHeSoAt(index: number, raw: string) {
    const row = displayRows[index];
    if (!row) return;
    const id = row.mon.id_mon_thi;
    const hs = raw.trim() === "" ? NaN : parseFloat(raw);
    setHeSo((prev) => ({ ...prev, [id]: raw }));
    if (!Number.isNaN(hs)) {
      patchDisplayRows((prev) =>
        prev.map((r, i) =>
          i === index
            ? {
                ...r,
                mon: {
                  ...r.mon,
                  he_so: hs,
                  thang_diem: defaultThangDiemForHeSo(hs),
                },
              }
            : r,
        ),
      );
    }
  }

  function addMonFromCatalog(catalogId: string) {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item || displayUsedMonIds.has(item.id) || !baseConfig) return;
    const mon: TruongCauHinhMon = {
      id_mon_thi: item.id,
      ten: item.ten,
      loai: item.loai,
      ma: item.ma ?? null,
      thumbnail_id: item.thumbnail_id ?? null,
      thumbnail_url: item.thumbnail_url ?? null,
      he_so: 1,
      thang_diem: defaultThangDiemForHeSo(1),
      thoi_gian_phut: null,
      so_thu_tu: displayRows.length,
      ghi_chu: null,
    };
    patchDisplayRows((prev) => [...prev, { rowKey: newRowKey(), mon }]);
    setHeSo((prev) => ({ ...prev, [item.id]: "1" }));
  }

  async function handleApply() {
    if (!baseConfig || !saveRows.length || saving) return;
    const draft = rowsToConfig(baseConfig, saveRows, heSo);
    setSaving(true);
    setError(null);
    try {
      const res = await truongInlineFetch(orgId, "/cau-hinh-tinh-diem", {
        method: "PUT",
        body: JSON.stringify({
          nam: year,
          nganh: programId,
          mon: draft.mon,
        }),
      });
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      const json = (await res.json()) as { config?: TruongCauHinhTinhDiem };
      if (!json.config?.mon.length) {
        setError("Đã lưu nhưng không đọc lại được cấu hình.");
        return;
      }
      onApply(json.config);
      onClose();
    } catch {
      setError("Lỗi kết nối khi lưu môn thi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-add-year-mon-modal"
      labelledBy="tdh-add-year-mon-title"
    >
      <h3 id="tdh-add-year-mon-title" className="tdh-inline-modal-title">
        Môn thi — {nganhTitle} ({year})
      </h3>
      {matchingKhoiList.length > 0 && selectedKhoiList.length === 0 ? (
        <p className="tdh-add-year-mon-khoi">
          <span className="cins-meta">Khối phù hợp</span>{" "}
          {matchingKhoiList.map((k) => k.ma_to_hop).join(", ")}
        </p>
      ) : null}

      {loading ? (
        <p className="tdh-placeholder">Đang tải môn thi…</p>
      ) : baseConfig ? (
        <>
          {khoiCatalog.length > 0 ? (
            <div className="tdh-calc-mon-khoi-filter">
              <div className="tdh-calc-mon-khoi-label">
                Khối thi áp dụng
                <span className="tdh-calc-mon-khoi-label-note">
                  (chọn nhiều — mỗi khối có bảng môn riêng)
                </span>
              </div>
              <KhoiMultiSelectDropdown
                artsKhoi={artsKhoi}
                thptKhoi={thptKhoi}
                selectedIds={selectedKhoiIds}
                onToggle={toggleKhoi}
                disabled={catalogLoading}
              />
            </div>
          ) : null}
          {selectedKhoiList.length > 1 ? (
            <div
              className="tdh-calc-mon-khoi-tabs"
              role="tablist"
              aria-label="Khối thi đang chỉnh"
            >
              {selectedKhoiList.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  className={`tdh-calc-mon-khoi-tab${activeKhoiId === k.id ? " is-active" : ""}`}
                  aria-selected={activeKhoiId === k.id}
                  onClick={() => setActiveKhoiId(k.id)}
                >
                  {k.ma_to_hop}
                </button>
              ))}
            </div>
          ) : activeKhoi ? (
            <p className="tdh-calc-mon-khoi-active-label">
              Môn thi khối{" "}
              <span className="tdh-calc-mon-khoi-chip">{activeKhoi.ma_to_hop}</span>
            </p>
          ) : null}
          <div className="tdh-calc-mon-table tdh-calc-mon-table--edit">
            <div
              className="tdh-calc-mon-row tdh-calc-mon-row--head"
              aria-hidden="true"
            >
              <span className="tdh-calc-mon-col-label tdh-calc-mon-col-thumb">
                Ảnh
              </span>
              <span className="tdh-calc-mon-col-label">Môn thi</span>
              <span className="tdh-calc-mon-col-label">Hệ số</span>
              <span className="tdh-calc-mon-col-actions" />
            </div>
            {displayRows.map((row, index) => (
              <div key={row.rowKey} className="tdh-calc-mon-row">
                <MonThiThumb
                  className="tdh-calc-mon-thumb"
                  ten={row.mon.ten}
                  loai={row.mon.loai}
                  ma={row.mon.ma}
                  thumbnail_id={row.mon.thumbnail_id}
                  thumbnail_url={row.mon.thumbnail_url}
                />
                <select
                  className="tdh-calc-mon-select"
                  value={row.mon.id_mon_thi}
                  onChange={(e) => replaceMonAt(index, e.target.value)}
                  aria-label={`Môn thi ${index + 1}`}
                  disabled={catalogLoading || !catalog.length}
                >
                  <MonThiCatalogOptions
                    catalog={catalog}
                    filtered={catalogForRow(row, index)}
                    loaiFilter="all"
                    groupByLoai={groupPickByLoai}
                    usedMonIds={displayUsedMonIds}
                    currentId={row.mon.id_mon_thi}
                    currentLabel={row.mon.ten}
                  />
                </select>
                <input
                  type="number"
                  className="tdh-calc-mon-heso"
                  min={0}
                  step={0.5}
                  value={heSo[row.mon.id_mon_thi] ?? String(row.mon.he_so)}
                  onChange={(e) => setHeSoAt(index, e.target.value)}
                  aria-label={`Hệ số ${row.mon.ten}`}
                  title={
                    (Number(heSo[row.mon.id_mon_thi] ?? row.mon.he_so) || 0) >= 2
                      ? "Hệ số 2 → thang điểm 20"
                      : "Hệ số 1 → thang điểm 10"
                  }
                />
                <button
                  type="button"
                  className="tdh-calc-mon-remove"
                  onClick={() => removeRow(index)}
                  disabled={displayRows.length <= 1}
                  aria-label="Xóa môn"
                  title="Xóa môn"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {addCandidates.length > 0 ? (
            <div className="tdh-calc-mon-add">
              <select
                className="tdh-calc-mon-select"
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) addMonFromCatalog(id);
                }}
                aria-label="Thêm môn từ danh mục"
                disabled={catalogLoading}
              >
                <option value="">— Thêm môn —</option>
                {groupPickByLoai ? (
                  groupMonThiCatalog(addCandidates).map((g) => (
                    <optgroup key={g.loaiKey} label={g.label}>
                      {g.items.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.ten}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : (
                  addCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ten}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : null}
        </>
      ) : null}

      {error ? <p className="tdh-add-year-error">{error}</p> : null}

      <div className="tdh-inline-modal-actions">
        <button
          type="button"
          className="tdh-inline-btn ghost"
          onClick={onClose}
          disabled={saving}
        >
          Hủy
        </button>
        <button
          type="button"
          className="tdh-inline-btn primary"
          onClick={() => void handleApply()}
          disabled={!baseConfig || saveRows.length === 0 || saving}
          title={
            saveRows.length === 0
              ? "Thêm ít nhất một môn từ danh mục"
              : undefined
          }
        >
          {saving ? "Đang lưu…" : "Áp dụng"}
        </button>
      </div>
    </TruongInlineModal>
  );
}

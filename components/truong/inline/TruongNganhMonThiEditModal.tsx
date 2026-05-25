"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MonThiThumb } from "@/components/truong/MonThiThumb";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import type { MonThiCatalogItem } from "@/lib/truong/calc-draft";
import {
  distinctMonThiLoai,
  filterMonThiCatalog,
  groupMonThiCatalog,
  labelMonThiLoai,
} from "@/lib/truong/mon-thi-catalog";
import { defaultThangDiemForHeSo } from "@/lib/truong/calc";
import {
  cauHinhMonThiCacheKey,
  cloneCauHinhForYear,
  createEmptyCauHinhDraft,
  pickCauHinhFromCache,
  pickPriorYearCauHinhFromCache,
} from "@/lib/truong/cau-hinh-tinh-diem";
import {
  readTruongInlineError,
  truongInlineFetch,
} from "@/lib/truong/inline-api";
import { monThiDauVaoFromConfig } from "@/lib/truong/mon-thi-dau-vao";
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

function MonThiCatalogOptions({
  catalog,
  filtered,
  loaiFilter,
  usedMonIds,
  currentId,
  currentLabel,
}: {
  catalog: MonThiCatalogItem[];
  filtered: MonThiCatalogItem[];
  loaiFilter: string;
  usedMonIds: Set<string>;
  currentId: string;
  currentLabel: string;
}) {
  const showOrphan =
    Boolean(currentId) && !filtered.some((c) => c.id === currentId);

  if (loaiFilter === "all") {
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
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [heSo, setHeSo] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<MonThiCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaiFilter, setLoaiFilter] = useState<string>("all");

  const syncFromConfig = useCallback((cfg: TruongCauHinhTinhDiem | null) => {
    if (!cfg) {
      setBaseConfig(null);
      setRows([]);
      setHeSo({});
      return;
    }
    setBaseConfig(cfg);
    if (!cfg.mon.length) {
      setRows([]);
      setHeSo({});
      return;
    }
    setRows(configToRows(cfg));
    const hs: Record<string, string> = {};
    for (const m of cfg.mon) {
      hs[m.id_mon_thi] = String(m.he_so);
    }
    setHeSo(hs);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoaiFilter("all");
    setCatalogLoading(true);
    void fetch(`/api/truong/${encodeURIComponent(orgId)}/mon-thi-catalog`)
      .then(async (res) => {
        if (!res.ok) return [];
        const json = (await res.json()) as { items?: MonThiCatalogItem[] };
        return json.items ?? [];
      })
      .then((items) => setCatalog(items))
      .catch(() => setCatalog([]))
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
      setLoading(true);
      setError(null);

      const exactCached = cauHinhCache[cauHinhMonThiCacheKey(programId, year)];
      if (exactCached?.mon.length) {
        if (!cancelled) {
          syncFromConfig(cloneCauHinhForYear(exactCached, programId, year));
        }
        return;
      }

      const priorCached = pickPriorYearCauHinhFromCache(
        cauHinhCache,
        programId,
        year,
      );
      if (priorCached) {
        if (!cancelled) {
          syncFromConfig(cloneCauHinhForYear(priorCached, programId, year));
        }
        return;
      }

      let cfg = await fetchYearConfig(year);
      if (cancelled) return;

      if (cfg) {
        syncFromConfig(cloneCauHinhForYear(cfg, programId, year));
        return;
      }

      for (const y of [year - 1, year - 2, year - 3, year + 1]) {
        if (y < 2000 || y > 2100) continue;
        cfg = await fetchYearConfig(y);
        if (cancelled) return;
        if (cfg) {
          syncFromConfig(cloneCauHinhForYear(cfg, programId, year));
          return;
        }
      }

      const nearestCached = pickCauHinhFromCache(
        cauHinhCache,
        programId,
        year,
      );
      if (nearestCached) {
        syncFromConfig(
          cloneCauHinhForYear(nearestCached.config, programId, year),
        );
        return;
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

  const usedMonIds = new Set(rows.map((r) => r.mon.id_mon_thi));
  const loaiKeys = useMemo(() => distinctMonThiLoai(catalog), [catalog]);
  const filteredCatalog = useMemo(
    () => filterMonThiCatalog(catalog, loaiFilter),
    [catalog, loaiFilter],
  );
  const addCandidates = filteredCatalog.filter((c) => !usedMonIds.has(c.id));

  const { khoiLabel } = monThiDauVaoFromConfig(baseConfig);

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
    const prevId = rows[index]?.mon.id_mon_thi;
    if (!prevId || catalogId === prevId) return;

    const otherIdx = rows.findIndex(
      (r, i) => i !== index && r.mon.id_mon_thi === catalogId,
    );
    const otherPrevId =
      otherIdx >= 0 ? rows[otherIdx]?.mon.id_mon_thi ?? null : null;

    setRows((prev) =>
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
    if (rows.length <= 1) return;
    const id = rows[index]?.mon.id_mon_thi;
    setRows((prev) => prev.filter((_, i) => i !== index));
    if (id) {
      setHeSo((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function setHeSoAt(index: number, raw: string) {
    const row = rows[index];
    if (!row) return;
    const id = row.mon.id_mon_thi;
    const hs = raw.trim() === "" ? NaN : parseFloat(raw);
    setHeSo((prev) => ({ ...prev, [id]: raw }));
    if (!Number.isNaN(hs)) {
      setRows((prev) =>
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
    if (!item || usedMonIds.has(item.id) || !baseConfig) return;
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
      so_thu_tu: rows.length,
      ghi_chu: null,
    };
    setRows((prev) => [...prev, { rowKey: newRowKey(), mon }]);
    setHeSo((prev) => ({ ...prev, [item.id]: "1" }));
  }

  async function handleApply() {
    if (!baseConfig || !rows.length || saving) return;
    const draft = rowsToConfig(baseConfig, rows, heSo);
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
      {khoiLabel ? (
        <p className="tdh-add-year-mon-khoi">
          <span className="cins-meta">Khối</span> {khoiLabel}
        </p>
      ) : null}

      {loading ? (
        <p className="tdh-placeholder">Đang tải môn thi…</p>
      ) : baseConfig ? (
        <>
          {loaiKeys.length > 0 ? (
            <div
              className="tdh-calc-mon-loai-filter"
              role="tablist"
              aria-label="Lọc loại môn"
            >
              <button
                type="button"
                role="tab"
                aria-selected={loaiFilter === "all"}
                className={`tdh-calc-mon-loai-chip${loaiFilter === "all" ? " is-active" : ""}`}
                onClick={() => setLoaiFilter("all")}
              >
                Tất cả
              </button>
              {loaiKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={loaiFilter === key}
                  className={`tdh-calc-mon-loai-chip${loaiFilter === key ? " is-active" : ""}`}
                  onClick={() => setLoaiFilter(key)}
                >
                  {labelMonThiLoai(key === "__khac__" ? null : key)}
                </button>
              ))}
            </div>
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
            {rows.map((row, index) => (
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
                    filtered={filteredCatalog}
                    loaiFilter={loaiFilter}
                    usedMonIds={usedMonIds}
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
                  disabled={rows.length <= 1}
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
                {loaiFilter === "all" ? (
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
          disabled={!baseConfig || rows.length === 0 || saving}
          title={
            rows.length === 0
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

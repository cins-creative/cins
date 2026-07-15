"use client";

import { Check, Loader2, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import {
  CONG_DONG_CATEGORY_MAX,
  CONG_DONG_LINH_VUC_MAX,
} from "@/lib/cong-dong/constants";
import type {
  CongDongCategory,
  CongDongLinhVuc,
} from "@/lib/cong-dong/types";

type Props = {
  linhVucs: CongDongLinhVuc[];
  onLinhVucsChange: (next: CongDongLinhVuc[]) => void;
  nganhs: CongDongCategory[];
  onNganhsChange: (next: CongDongCategory[]) => void;
  disabled?: boolean;
  hint?: string;
};

type TabId = "linh_vuc" | "nganh_dao_tao";

const TABS: { id: TabId; label: string }[] = [
  { id: "linh_vuc", label: "Lĩnh vực" },
  { id: "nganh_dao_tao", label: "Ngành" },
];

const NGANH_FETCH_LIMIT = 80;

export function CongDongTopicPicker({
  linhVucs,
  onLinhVucsChange,
  nganhs,
  onNganhsChange,
  disabled = false,
  hint,
}: Props) {
  const baseId = useId();
  const [tab, setTab] = useState<TabId>("linh_vuc");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<CongDongLinhVuc[]>([]);
  const [nganhCatalog, setNganhCatalog] = useState<CongDongCategory[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const selectedLvIds = useMemo(
    () => new Set(linhVucs.map((v) => v.id)),
    [linhVucs],
  );
  const selectedNganhIds = useMemo(
    () => new Set(nganhs.map((v) => v.id)),
    [nganhs],
  );
  const atMaxLv = linhVucs.length >= CONG_DONG_LINH_VUC_MAX;
  const atMaxNganh = nganhs.length >= CONG_DONG_CATEGORY_MAX;

  const loadLinhVuc = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/cong-dong/linh-vuc/catalog");
      const json = (await res.json().catch(() => null)) as {
        items?: CongDongLinhVuc[];
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Không tải được lĩnh vực.");
      }
      setCatalog(json?.items ?? []);
    } catch (e) {
      setCatalog([]);
      setErr(e instanceof Error ? e.message : "Không tải được lĩnh vực.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNganh = useCallback(async (q: string) => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("loai", "nganh_dao_tao");
      params.set("limit", String(NGANH_FETCH_LIMIT));
      const res = await fetch(
        `/api/cong-dong/category-articles/search?${params.toString()}`,
      );
      const json = (await res.json().catch(() => null)) as {
        items?: CongDongCategory[];
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Không tải được ngành.");
      }
      setNganhCatalog(
        (json?.items ?? []).filter((i) => i.loaiBaiViet === "nganh_dao_tao"),
      );
    } catch (e) {
      setNganhCatalog([]);
      setErr(e instanceof Error ? e.message : "Không tải được ngành.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "linh_vuc") return;
    void loadLinhVuc();
  }, [tab, loadLinhVuc]);

  useEffect(() => {
    if (tab !== "nganh_dao_tao") return;
    const t = window.setTimeout(() => {
      void loadNganh(query);
    }, query.trim() ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [tab, query, loadNganh]);

  const visibleLinhVuc = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.ten.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  function toggleLinhVuc(item: CongDongLinhVuc) {
    if (disabled) return;
    if (selectedLvIds.has(item.id)) {
      onLinhVucsChange(linhVucs.filter((v) => v.id !== item.id));
      return;
    }
    if (atMaxLv) return;
    onLinhVucsChange([...linhVucs, item]);
  }

  function toggleNganh(item: CongDongCategory) {
    if (disabled) return;
    if (selectedNganhIds.has(item.id)) {
      onNganhsChange(nganhs.filter((v) => v.id !== item.id));
      return;
    }
    if (atMaxNganh) return;
    onNganhsChange([...nganhs, item]);
  }

  const meta =
    tab === "linh_vuc"
      ? `${linhVucs.length}/${CONG_DONG_LINH_VUC_MAX} lĩnh vực`
      : `${nganhs.length}/${CONG_DONG_CATEGORY_MAX} ngành`;

  return (
    <div className="cd-topic-picker">
      {hint ? <p className="cd-topic-picker-hint">{hint}</p> : null}

      {(linhVucs.length > 0 || nganhs.length > 0) && !disabled ? (
        <div className="cd-topic-picker-selected" aria-label="Đã chọn">
          {linhVucs.map((item) => (
            <button
              key={`lv-${item.id}`}
              type="button"
              className="cd-topic-picker-chip"
              aria-label={`Bỏ lĩnh vực ${item.ten}`}
              onClick={() => toggleLinhVuc(item)}
            >
              {item.mauAccent ? (
                <span
                  className="cd-topic-picker-chip-dot"
                  style={{ background: item.mauAccent }}
                  aria-hidden
                />
              ) : null}
              <span className="cd-topic-picker-chip-label">{item.ten}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ))}
          {nganhs.map((item) => (
            <button
              key={`ng-${item.id}`}
              type="button"
              className="cd-topic-picker-chip cd-topic-picker-chip--nganh"
              aria-label={`Bỏ ngành ${item.tieuDe}`}
              onClick={() => toggleNganh(item)}
            >
              <span className="cd-topic-picker-chip-label">{item.tieuDe}</span>
              <X size={12} strokeWidth={2.4} aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      <div className="cd-topic-picker-tabs" role="tablist" aria-label="Loại chủ đề">
        {TABS.map((t) => {
          const selected = tab === t.id;
          const count =
            t.id === "linh_vuc" ? linhVucs.length : nganhs.length;
          const max =
            t.id === "linh_vuc"
              ? CONG_DONG_LINH_VUC_MAX
              : CONG_DONG_CATEGORY_MAX;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              className={`cd-topic-picker-tab${selected ? " is-active" : ""}`}
              onClick={() => {
                setTab(t.id);
                setQuery("");
                setErr(null);
              }}
            >
              {t.label}
              <span className="cd-topic-picker-tab-count">
                {count}/{max}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="cd-topic-picker-panel"
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
      >
        <label className="cd-topic-picker-search" htmlFor={`${baseId}-q`}>
          <Search size={15} strokeWidth={2} aria-hidden />
          <input
            id={`${baseId}-q`}
            type="search"
            value={query}
            placeholder={
              tab === "linh_vuc" ? "Lọc lĩnh vực…" : "Lọc ngành…"
            }
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading ? (
            <Loader2
              size={15}
              className="cd-category-picker-spin"
              aria-hidden
            />
          ) : null}
        </label>

        <p className="cd-topic-picker-meta">
          {meta}
          {tab === "linh_vuc" && atMaxLv && !disabled
            ? " — đã đủ."
            : null}
          {tab === "nganh_dao_tao" && atMaxNganh && !disabled
            ? " — đã đủ."
            : null}
        </p>

        {err ? (
          <p className="cd-topic-picker-empty" role="alert">
            {err}
          </p>
        ) : loading &&
          (tab === "linh_vuc" ? catalog.length === 0 : nganhCatalog.length === 0) ? (
          <p className="cd-topic-picker-empty">
            <Loader2 size={14} className="cd-category-picker-spin" aria-hidden />
            Đang tải…
          </p>
        ) : tab === "linh_vuc" ? (
          visibleLinhVuc.length === 0 ? (
            <p className="cd-topic-picker-empty">
              {query.trim()
                ? "Không thấy lĩnh vực khớp."
                : "Chưa có lĩnh vực trong catalog."}
            </p>
          ) : (
            <div
              className="cd-topic-picker-grid"
              role="group"
              aria-label="Chọn lĩnh vực"
            >
              {visibleLinhVuc.map((item) => {
                const selected = selectedLvIds.has(item.id);
                const blocked = !selected && atMaxLv;
                return (
                  <label
                    key={item.id}
                    className={`cd-topic-picker-cell${selected ? " is-selected" : ""}${blocked || disabled ? " is-disabled" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled || blocked}
                      onChange={() => toggleLinhVuc(item)}
                    />
                    <span
                      className={`cd-topic-picker-check${selected ? " is-on" : ""}`}
                      aria-hidden
                    >
                      {selected ? (
                        <Check size={11} strokeWidth={2.5} />
                      ) : null}
                    </span>
                    {item.mauAccent ? (
                      <span
                        className="cd-topic-picker-dot"
                        style={{ background: item.mauAccent }}
                        aria-hidden
                      />
                    ) : null}
                    <span className="cd-topic-picker-cell-title">{item.ten}</span>
                  </label>
                );
              })}
            </div>
          )
        ) : nganhCatalog.length === 0 ? (
          <p className="cd-topic-picker-empty">
            {query.trim()
              ? "Không thấy ngành khớp."
              : "Chưa có ngành trong catalog."}
          </p>
        ) : (
          <div
            className="cd-topic-picker-grid"
            role="group"
            aria-label="Chọn ngành đào tạo"
          >
            {nganhCatalog.map((item) => {
              const selected = selectedNganhIds.has(item.id);
              const blocked = !selected && atMaxNganh;
              return (
                <label
                  key={item.id}
                  className={`cd-topic-picker-cell${selected ? " is-selected" : ""}${blocked || disabled ? " is-disabled" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled || blocked}
                    onChange={() => toggleNganh(item)}
                  />
                  <span
                    className={`cd-topic-picker-check${selected ? " is-on" : ""}`}
                    aria-hidden
                  >
                    {selected ? (
                      <Check size={11} strokeWidth={2.5} />
                    ) : null}
                  </span>
                  <span className="cd-topic-picker-cell-title">
                    {item.tieuDe}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MonThiThumb } from "@/components/truong/MonThiThumb";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { cauHinhMonThiCacheKey } from "@/lib/truong/cau-hinh-tinh-diem";
import {
  PHUONG_THUC_ENUM_OPTIONS,
  type CalcPhuongThucOption,
} from "@/lib/truong/phuong-thuc";
import type { CalcConfigDraft } from "@/lib/truong/calc-draft";
import type { TruongCauHinhTinhDiem } from "@/lib/truong/types";

export type { CalcConfigDraft } from "@/lib/truong/calc-draft";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  year: number;
  phuongThucOptions: CalcPhuongThucOption[];
  initial?: CalcConfigDraft | null;
  onApply: (draft: CalcConfigDraft) => void;
};

export function TruongCalcConfigModal({
  open,
  onClose,
  orgId,
  year,
  phuongThucOptions,
  initial,
  onApply,
}: Props) {
  const inline = useTruongInlineEdit();

  const options = useMemo(() => {
    if (phuongThucOptions.length > 0) return phuongThucOptions;
    return PHUONG_THUC_ENUM_OPTIONS.map((o) => ({
      id: o.value,
      ten_phuong_thuc: o.value,
      chi_tieu_phuong_thuc: null,
      ap_dung_tat_ca_nganh: null,
      id_cau_hinh_khoi: null,
      tieu_chi: null,
      label: o.label,
    }));
  }, [phuongThucOptions]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeKhoiId, setActiveKhoiId] = useState<string | null>(null);
  const [config, setConfig] = useState<TruongCauHinhTinhDiem | null>(null);
  const [heSo, setHeSo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const ids = new Set(initial?.selectedPhuongThucIds ?? []);
    if (!ids.size && options[0]) ids.add(options[0].id);
    setSelectedIds(ids);
    setConfig(initial?.config ?? null);
    const hs: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial?.heSoOverrides ?? {})) {
      hs[k] = String(v);
    }
    if (initial?.config) {
      for (const m of initial.config.mon) {
        if (hs[m.id_mon_thi] === undefined) hs[m.id_mon_thi] = String(m.he_so);
      }
    }
    setHeSo(hs);
    setActiveKhoiId(initial?.config?.id ?? null);
    setError(null);
  }, [open, initial, options]);

  const khoiCandidates = useMemo(() => {
    const ids = new Set<string>();
    for (const id of selectedIds) {
      const pt = options.find((o) => o.id === id);
      if (pt?.id_cau_hinh_khoi) ids.add(pt.id_cau_hinh_khoi);
    }
    return [...ids];
  }, [selectedIds, options]);

  const applyConfig = useCallback((cfg: TruongCauHinhTinhDiem | null) => {
    if (!cfg?.mon.length) {
      setConfig(null);
      return false;
    }
    setConfig(cfg);
    setActiveKhoiId(cfg.id);
    setHeSo((prev) => {
      const next = { ...prev };
      for (const m of cfg.mon) {
        if (next[m.id_mon_thi] === undefined) {
          next[m.id_mon_thi] = String(m.he_so);
        }
      }
      return next;
    });
    setError(null);
    return true;
  }, []);

  const pickFromServerCache = useCallback((): TruongCauHinhTinhDiem | null => {
    const cache = inline?.cauHinhMonThiByKey;
    if (!cache) return null;
    const suffix = `:${year}`;
    for (const [key, cfg] of Object.entries(cache)) {
      if (key.endsWith(suffix) && cfg.mon.length) return cfg;
    }
    const firstProg = inline?.programs[0];
    if (firstProg) {
      const keyed = cache[cauHinhMonThiCacheKey(firstProg.id, year)];
      if (keyed?.mon.length) return keyed;
    }
    return null;
  }, [inline?.cauHinhMonThiByKey, inline?.programs, year]);

  const loadKhoi = useCallback(
    async (khoiId: string | null) => {
      if (!orgId || !year) return;
      setLoading(true);
      setError(null);

      const cached = pickFromServerCache();
      if (cached && !khoiId) {
        applyConfig(cached);
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({ nam: String(year) });
        if (khoiId) params.set("khoi", khoiId);
        else {
          const firstProg = inline?.programs[0];
          if (firstProg?.id) params.set("nganh", firstProg.id);
        }
        const res = await fetch(
          `/api/truong/${encodeURIComponent(orgId)}/cau-hinh-tinh-diem?${params}`,
        );
        if (!res.ok) {
          if (pickFromServerCache() && applyConfig(pickFromServerCache())) {
            return;
          }
          setConfig(null);
          setError(
            khoiId
              ? "Không tải được cấu hình khối."
              : `Chưa có khối thi cho năm ${year}. Chạy supabase/sql/org-truong-migrate-cau-hinh-mts-live-org.sql (hoặc seed org_cau_hinh_khoi cho trường này), rồi gắn id_cau_hinh_khoi vào org_phuong_thuc_xet_tuyen nếu cần.`,
          );
          return;
        }
        const json = (await res.json()) as { config?: TruongCauHinhTinhDiem };
        const cfg = json.config ?? null;
        if (cfg && cfg.mon.length === 0) {
          setConfig(null);
          setError(
            `Khối thi đã có (id ${cfg.id.slice(0, 8)}…) nhưng chưa có môn trong org_cau_hinh_mon. Chạy seed SQL hoặc thêm môn + hệ số trong Supabase.`,
          );
          return;
        }
        if (!applyConfig(cfg)) {
          setError(
            `Khối thi đã có (id ${cfg?.id?.slice(0, 8) ?? "…"}) nhưng chưa có môn trong org_cau_hinh_mon.`,
          );
        }
      } catch {
        if (pickFromServerCache() && applyConfig(pickFromServerCache())) {
          return;
        }
        setConfig(null);
        setError("Lỗi kết nối khi tải cấu hình.");
      } finally {
        setLoading(false);
      }
    },
    [orgId, year, inline?.programs, pickFromServerCache, applyConfig],
  );

  useEffect(() => {
    if (!open) return;
    const preferred = khoiCandidates[0] ?? null;
    void loadKhoi(preferred);
  }, [open, khoiCandidates, loadKhoi]);

  function togglePhuongThuc(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApply() {
    if (!config || !config.mon.length) {
      setError("Cần ít nhất một môn với hệ số để áp dụng công thức.");
      return;
    }
    const heSoOverrides: Record<string, number> = {};
    for (const m of config.mon) {
      const raw = heSo[m.id_mon_thi];
      const n = raw !== undefined && raw !== "" ? parseFloat(raw) : m.he_so;
      if (!Number.isNaN(n)) heSoOverrides[m.id_mon_thi] = n;
    }
    onApply({
      config,
      heSoOverrides,
      selectedPhuongThucIds: [...selectedIds],
    });
    onClose();
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-calc-config-modal"
      labelledBy="tdh-calc-config-title"
    >
      <h3 id="tdh-calc-config-title" className="tdh-inline-modal-title">
        Cấu hình tính điểm — {year}
      </h3>
      <p className="tdh-calc-config-lead">
        Chọn một hoặc nhiều phương thức xét tuyển, sau đó nhập hệ số từng môn.
        Áp dụng sẽ cập nhật bảng tính bên phải và mục «Môn thi & tính điểm» ở
        mọi ngành (một cấu hình cho cả trường).
      </p>

      <section className="tdh-calc-config-section">
        <h4 className="tdh-calc-config-subtitle">Phương thức áp dụng</h4>
        <div className="tdh-calc-pt-grid" role="group" aria-label="Phương thức">
          {options.map((pt) => (
            <label key={pt.id} className="tdh-calc-pt-chip">
              <input
                type="checkbox"
                checked={selectedIds.has(pt.id)}
                onChange={() => togglePhuongThuc(pt.id)}
              />
              <span>{pt.label}</span>
              {pt.id_cau_hinh_khoi ? (
                <span className="tdh-calc-pt-meta">có khối</span>
              ) : null}
            </label>
          ))}
        </div>
      </section>

      {khoiCandidates.length > 1 ? (
        <label className="tdh-inline-field">
          <span>Khối tính điểm</span>
          <select
            value={activeKhoiId ?? ""}
            onChange={(e) => void loadKhoi(e.target.value || null)}
          >
            {khoiCandidates.map((kid) => (
              <option key={kid} value={kid}>
                Khối {kid.slice(0, 8)}…
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loading ? (
        <p className="tdh-placeholder">Đang tải môn thi…</p>
      ) : config && config.mon.length > 0 ? (
        <section className="tdh-calc-config-section">
          <h4 className="tdh-calc-config-subtitle">
            Hệ số môn (thang {config.quy_ve_thang})
          </h4>
          <div className="tdh-calc-mon-table tdh-calc-mon-table--with-thumb">
            {config.mon.map((m) => (
              <div key={m.id_mon_thi} className="tdh-calc-mon-row">
                <MonThiThumb
                  className="tdh-calc-mon-thumb"
                  ten={m.ten}
                  loai={m.loai}
                  ma={m.ma}
                  thumbnail_id={m.thumbnail_id}
                  thumbnail_url={m.thumbnail_url}
                />
                <span className="tdh-calc-mon-name">{m.ten}</span>
                <span className="tdh-calc-mon-scale">/{m.thang_diem}</span>
                <input
                  type="number"
                  className="tdh-calc-mon-heso"
                  min={0}
                  step={0.5}
                  value={heSo[m.id_mon_thi] ?? String(m.he_so)}
                  onChange={(e) =>
                    setHeSo((prev) => ({
                      ...prev,
                      [m.id_mon_thi]: e.target.value,
                    }))
                  }
                  aria-label={`Hệ số ${m.ten}`}
                />
              </div>
            ))}
          </div>
          <p className="tdh-calc-formula-hint">
            Điểm = Σ(điểm nhập × hệ số) / Σ(thang × hệ số) × {config.quy_ve_thang}
          </p>
        </section>
      ) : null}

      {error ? <p className="tdh-calc-config-error">{error}</p> : null}

      <div className="tdh-inline-modal-actions">
        <button
          type="button"
          className="tdh-inline-btn ghost"
          onClick={onClose}
        >
          Hủy
        </button>
        <button
          type="button"
          className="tdh-inline-btn primary"
          onClick={handleApply}
          disabled={!config?.mon.length}
        >
          Áp dụng cho toàn trường
        </button>
      </div>
    </TruongInlineModal>
  );
}

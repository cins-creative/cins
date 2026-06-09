"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  applyCalcDraftMonList,
  type MonThiCatalogItem,
} from "@/lib/truong/calc-draft";
import { cauHinhMonThiCacheKey } from "@/lib/truong/cau-hinh-tinh-diem";

import { MonThiThumb } from "@/components/truong/MonThiThumb";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { evaluateAdmissionScore } from "@/lib/truong/admission-calc-eval";
import { formatDiemChuan } from "@/lib/truong/diem-chuan";
import {
  computeAdmissionScore,
  effectiveThangDiemForCalc,
  maxWeightedAdmissionScore,
} from "@/lib/truong/calc";
import { monThiDauVaoFromConfig } from "@/lib/truong/mon-thi-dau-vao";
import { enrichMonThiFromCatalog } from "@/lib/truong/mon-thi-catalog";
import type { CalcPhuongThucOption } from "@/lib/truong/phuong-thuc";
import type { TruongCauHinhMon, TruongCauHinhTinhDiem } from "@/lib/truong/types";

function calcMonChipLabel(m: TruongCauHinhMon): string {
  return m.he_so !== 1 ? `${m.ten} ×${m.he_so}` : m.ten;
}

type NganhOption = {
  label: string;
  id?: string;
  threshold: number;
};

type Props = {
  title?: string;
  orgId?: string;
  selectedYear?: number;
  nganhOptions?: NganhOption[];
  phuongThucOptions?: CalcPhuongThucOption[];
  /** false khi nhúng trong modal (không bọc calc-card) */
  showCard?: boolean;
};

const DEFAULT_OPTIONS: NganhOption[] = [
  { label: "Ngành mục tiêu", threshold: 25 },
];

export function TruongAdmissionCalc({
  title = "Tính điểm xét tuyển",
  orgId,
  selectedYear,
  nganhOptions,
  phuongThucOptions: _phuongThucOptions = [],
  showCard = true,
}: Props) {
  const id = useId();
  const inline = useTruongInlineEdit();
  const isEditing = inline?.isEditing ?? false;

  const options = nganhOptions?.length ? nganhOptions : DEFAULT_OPTIONS;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [config, setConfig] = useState<TruongCauHinhTinhDiem | null>(null);
  const [monCatalog, setMonCatalog] = useState<MonThiCatalogItem[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const draft =
    selectedYear != null ? inline?.getCalcDraft(selectedYear) ?? null : null;

  const selected = options[selectedIdx] ?? options[0]!;
  const selectedNganhId = selected.id;
  const activeConfig = draft?.config ?? config;
  const serverCacheRef = useRef(inline?.cauHinhMonThiByKey);
  serverCacheRef.current = inline?.cauHinhMonThiByKey;
  const fetchGenRef = useRef(0);

  const khoiFallbackId =
    _phuongThucOptions.find((p) => p.id_cau_hinh_khoi)?.id_cau_hinh_khoi ??
    null;

  const threshold =
    selected.threshold > 0
      ? selected.threshold
      : (activeConfig?.diem_san_xet_tuyen ?? 0);

  const loadConfig = useCallback(async () => {
    if (!orgId || !selectedYear) {
      setConfig(null);
      return;
    }
    if (isEditing && draft) return;

    if (selectedNganhId) {
      const cacheKey = cauHinhMonThiCacheKey(selectedNganhId, selectedYear);
      const cached = serverCacheRef.current?.[cacheKey];
      if (cached?.mon.length) {
        setConfig(cached);
        if (!isEditing) setInputs({});
        setLoading(false);
        return;
      }
    }

    const gen = ++fetchGenRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        nam: String(selectedYear),
      });
      if (selectedNganhId) {
        params.set("nganh", selectedNganhId);
      } else if (khoiFallbackId) {
        params.set("khoi", khoiFallbackId);
      }

      const res = await fetch(
        `/api/truong/${encodeURIComponent(orgId)}/cau-hinh-tinh-diem?${params}`,
      );
      if (gen !== fetchGenRef.current) return;

      if (!res.ok) {
        setConfig(null);
        return;
      }
      const json = (await res.json()) as { config?: TruongCauHinhTinhDiem };
      if (gen !== fetchGenRef.current) return;

      setConfig(json.config ?? null);
      if (!isEditing) setInputs({});
    } catch {
      if (gen === fetchGenRef.current) setConfig(null);
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, [
    orgId,
    selectedYear,
    selectedNganhId,
    khoiFallbackId,
    isEditing,
    draft,
  ]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!orgId?.trim()) {
      setMonCatalog([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/truong/${encodeURIComponent(orgId)}/mon-thi-catalog`)
      .then(async (res) => {
        if (!res.ok) return [];
        const json = (await res.json()) as { items?: MonThiCatalogItem[] };
        return json.items ?? [];
      })
      .then((items) => {
        if (!cancelled) setMonCatalog(items);
      })
      .catch(() => {
        if (!cancelled) setMonCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const monList = useMemo(
    () => applyCalcDraftMonList(activeConfig, draft),
    [activeConfig, draft],
  );

  const displayMonList = useMemo(
    () => enrichMonThiFromCatalog(monList, monCatalog),
    [monList, monCatalog],
  );

  const maxScoreHint = useMemo(
    () =>
      displayMonList.length ? maxWeightedAdmissionScore(displayMonList) : null,
    [displayMonList],
  );

  const khoiLabel = useMemo(
    () => monThiDauVaoFromConfig(activeConfig).khoiLabel,
    [activeConfig],
  );

  const computed = useMemo(() => {
    if (!activeConfig || !monList.length) return null;
    const numeric: Record<string, number> = {};
    for (const m of monList) {
      const raw = inputs[m.id_mon_thi];
      if (raw === undefined || raw === "") continue;
      const n = parseFloat(raw);
      if (!Number.isNaN(n)) numeric[m.id_mon_thi] = n;
    }
    return computeAdmissionScore(
      activeConfig,
      numeric,
      draft?.heSoOverrides,
    );
  }, [activeConfig, monList, inputs, draft?.heSoOverrides]);

  const result = evaluateAdmissionScore(computed?.score ?? null, threshold);

  function openConfigModal() {
    if (selectedYear != null) inline?.openCalcConfigModal(selectedYear);
  }

  const body = (
    <>
        <select
          className="calc-select"
          value={String(selectedIdx)}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          aria-label="Chọn ngành mục tiêu"
        >
          {options.map((opt, i) => (
            <option key={`${opt.label}-${i}`} value={i}>
              {opt.label}
              {opt.threshold > 0
                ? ` (${formatDiemChuan(opt.threshold)})`
                : ""}
            </option>
          ))}
        </select>

        {loading ? (
          <p className="tdh-placeholder" style={{ margin: "12px 0" }}>
            Đang tải cấu hình khối…
          </p>
        ) : displayMonList.length > 0 ? (
          <div className="calc-mon-thi-block">
            {khoiLabel ? (
              <p className="nganh-mon-thi-khoi">
                <span className="cins-meta">Khối</span> {khoiLabel}
              </p>
            ) : null}
            <ul className="nganh-mon-thi-list" aria-label="Nhập điểm từng môn">
              {displayMonList.map((m) => {
                const thang = effectiveThangDiemForCalc(m);
                return (
                <li key={m.id_mon_thi} className="nganh-mon-thi-chip">
                  <MonThiThumb
                    className="nganh-mon-thi-chip-thumb"
                    ten={m.ten}
                    loai={m.loai}
                    ma={m.ma ?? null}
                    thumbnail_id={m.thumbnail_id ?? null}
                    thumbnail_url={m.thumbnail_url ?? null}
                  />
                  <span className="nganh-mon-thi-chip-label">
                    {calcMonChipLabel(m)}
                  </span>
                  <label className="calc-mon-thi-score-wrap">
                    <span className="sr-only">Điểm {m.ten}</span>
                    <input
                      id={`${id}-${m.id_mon_thi}`}
                      className="calc-mon-thi-score"
                      type="number"
                      min={0}
                      max={thang}
                      step={0.25}
                      placeholder={`0–${thang}`}
                      value={inputs[m.id_mon_thi] ?? ""}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          [m.id_mon_thi]: e.target.value,
                        }))
                      }
                    />
                  </label>
                </li>
              );
              })}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            className={`calc-inputs calc-inputs-placeholder${isEditing ? " calc-inputs-editable" : ""}`}
            onClick={isEditing ? openConfigModal : undefined}
            disabled={!isEditing}
          >
            <ul className="nganh-mon-thi-list calc-mon-thi-list--demo" aria-hidden>
              <li className="nganh-mon-thi-chip">
                <MonThiThumb
                  className="nganh-mon-thi-chip-thumb"
                  ten="Hình họa"
                  loai={null}
                  ma={null}
                  thumbnail_id={null}
                />
                <span className="nganh-mon-thi-chip-label">Hình họa ×2</span>
                <span className="calc-mon-thi-score calc-mon-thi-score--fake">
                  —
                </span>
              </li>
            </ul>
            <p className="tdh-placeholder calc-placeholder-text">
              {isEditing
                ? "Bấm để chọn phương thức xét tuyển và nhập hệ số môn."
                : `Chọn năm có cấu hình khối (ví dụ ${selectedYear ?? 2024}) để tính theo DB.`}
            </p>
          </button>
        )}

        {maxScoreHint != null ? (
          <p className="calc-note">
            Điểm tối đa: {maxScoreHint}
            {displayMonList.length > 0
              ? " — tổng (điểm × hệ số); ví dụ môn ×2: điểm 8 được tính 16 điểm."
              : null}
          </p>
        ) : null}

        <div className={`calc-result ${result.state}`}>
          <div className="calc-result-score">{result.score}</div>
          <div className="calc-result-label">{result.label}</div>
        </div>
    </>
  );

  if (!showCard) {
    return <div className="calc-body calc-body--modal">{body}</div>;
  }

  return (
    <div className="calc-card">
      <div className="calc-card-hdr">
        <span className="calc-hdr-title">{title}</span>
      </div>
      <div className="calc-body">{body}</div>
    </div>
  );
}
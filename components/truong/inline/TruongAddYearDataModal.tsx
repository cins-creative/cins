"use client";

import { useEffect, useRef, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { TruongNganhMonThiEditModal } from "@/components/truong/inline/TruongNganhMonThiEditModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  cauHinhMonThiCacheKey,
  cloneCauHinhForYear,
  pickPriorYearCauHinhFromCache,
} from "@/lib/truong/cau-hinh-tinh-diem";
import { formatMonThiShort } from "@/lib/truong/mon-thi-dau-vao";
import { useYearFilter } from "@/components/truong/YearFilterProvider";
import { defaultTruongNganhYear } from "@/lib/truong/diem-chuan";
import { mergeTuyenSinhIntoPrograms } from "@/lib/truong/merge-programs-tuyen-sinh";
import { truongInlineFetch, readTruongInlineError } from "@/lib/truong/inline-api";
import {
  enrichTuyenSinhRows,
  type TuyenSinhInsertPayload,
  type TuyenSinhInsertRawRow,
} from "@/lib/truong/tuyen-sinh-client";
import { diemChuanForYear } from "@/lib/truong/diem-chuan";
import {
  collectTruongYearTabs,
  isValidTruongYear,
  nextSuggestedTruongYear,
} from "@/lib/truong/year-tabs";
import type {
  TruongCauHinhTinhDiem,
  TruongNganhProgram,
  TruongTuyenSinhNamRow,
} from "@/lib/truong/types";

type RowDraft = {
  truongNganhId: string;
  tuyenSinhId: string | null;
  nganhTitle: string;
  hasExisting: boolean;
  include: boolean;
  chi_tieu: string;
  diem_chuan: string;
  thoi_gian_thang: string;
};

const EMPTY_DATA_LABEL = "Chưa có dữ liệu";

/** Ô số: trống hoặc 0 → hiển thị placeholder, không ghi 0 vào DB. */
function draftInputValue(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const n = Number(s);
  if (!Number.isNaN(n) && n === 0) return "";
  return raw;
}

function parseDraftNum(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n) || n === 0) return null;
  return n;
}

function rowPayload(r: RowDraft) {
  return {
    chi_tieu: parseDraftNum(r.chi_tieu),
    diem_chuan: parseDraftNum(r.diem_chuan),
    thoi_gian_thang: parseDraftNum(r.thoi_gian_thang),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
};

function findTuyenSinhForYear(
  tuyenSinh: TruongTuyenSinhNamRow[],
  truongNganhId: string,
  nam: number,
): TruongTuyenSinhNamRow | undefined {
  return tuyenSinh.find(
    (r) => r.truongNganhId === truongNganhId && Number(r.nam) === Number(nam),
  );
}

/** Gợi ý chỉ tiêu / điểm từ năm gần nhất (nhỏ hơn `nam`) đã có trong DB. */
function suggestFromPriorYear(
  tuyenSinh: TruongTuyenSinhNamRow[],
  truongNganhId: string,
  nam: number,
): { chi_tieu: string; diem_chuan: string } {
  const prior = tuyenSinh
    .filter((r) => r.truongNganhId === truongNganhId && Number(r.nam) < nam)
    .sort((a, b) => Number(b.nam) - Number(a.nam))[0];
  if (!prior) return { chi_tieu: "", diem_chuan: "" };
  return {
    chi_tieu:
      prior.chi_tieu != null && !Number.isNaN(prior.chi_tieu)
        ? String(prior.chi_tieu)
        : "",
    diem_chuan:
      prior.diem_chuan != null && !Number.isNaN(prior.diem_chuan)
        ? String(prior.diem_chuan)
        : "",
  };
}

function formatDraftNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "";
  return String(v);
}

function buildRows(
  programs: TruongNganhProgram[],
  tuyenSinh: TruongTuyenSinhNamRow[],
  nam: number,
): RowDraft[] {
  return programs.map((p) => {
    const tsRow = findTuyenSinhForYear(tuyenSinh, p.id, nam);
    const hasExisting = Boolean(tsRow);
    const prior = suggestFromPriorYear(tuyenSinh, p.id, nam);
    const chiFromProg = p.chiTieuByYear?.[String(nam)];
    const diemFromProg = diemChuanForYear(p, nam);

    return {
      truongNganhId: p.id,
      tuyenSinhId: tsRow?.id ?? null,
      nganhTitle: p.nganhTitle,
      hasExisting,
      include: true,
      chi_tieu: hasExisting
        ? formatDraftNum(tsRow?.chi_tieu)
        : prior.chi_tieu ||
          (chiFromProg != null && !Number.isNaN(chiFromProg)
            ? String(chiFromProg)
            : ""),
      diem_chuan: hasExisting
        ? formatDraftNum(tsRow?.diem_chuan)
        : prior.diem_chuan ||
          (diemFromProg != null ? String(diemFromProg) : ""),
      thoi_gian_thang:
        p.thoi_gian_thang != null ? String(p.thoi_gian_thang) : "",
    };
  });
}

/** Nhân bản môn thi từ năm trước vào cache phiên (chưa ghi DB cho đến khi bấm Áp dụng). */
function seedMonThiFromPriorYear(
  cache: Record<string, TruongCauHinhTinhDiem>,
  patch: (programId: string, year: number, config: TruongCauHinhTinhDiem) => void,
  programs: TruongNganhProgram[],
  nam: number,
) {
  for (const p of programs) {
    const key = cauHinhMonThiCacheKey(p.id, nam);
    if (cache[key]?.mon.length) continue;
    const prior = pickPriorYearCauHinhFromCache(cache, p.id, nam);
    if (!prior) continue;
    patch(p.id, nam, cloneCauHinhForYear(prior, p.id, nam));
  }
}

export function TruongAddYearDataModal({ open, onClose }: Props) {
  const ctx = useTruongInlineEdit();
  const { year: pageYear, yearOptions, setYear } = useYearFilter();
  const programs = ctx?.programs ?? [];
  const tuyenSinh = ctx?.tuyenSinh ?? [];

  const [nam, setNam] = useState(() => defaultTruongNganhYear());
  const [modalYears, setModalYears] = useState<number[]>([]);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearDraft, setNewYearDraft] = useState("");
  const [monThiEdit, setMonThiEdit] = useState<{
    truongNganhId: string;
    nganhTitle: string;
  } | null>(null);
  const didInitRef = useRef(false);

  const applyNam = (next: number) => {
    if (!isValidTruongYear(next)) return;
    setMonThiEdit(null);
    setNam(next);
    setRows(buildRows(programs, tuyenSinh, next));
    setModalYears((prev) => {
      if (prev.includes(next)) return prev;
      return [...prev, next].sort((a, b) => b - a);
    });
    if (ctx) {
      seedMonThiFromPriorYear(
        ctx.cauHinhMonThiByKey,
        ctx.patchCauHinhMonThi,
        programs,
        next,
      );
    }
  };

  function openAddYear() {
    setNewYearDraft(String(nextSuggestedTruongYear(modalYears, yearOptions)));
    setShowAddYear(true);
    setError(null);
  }

  function confirmAddYear() {
    const y = Number(newYearDraft.trim());
    if (!isValidTruongYear(y)) {
      setError("Năm phải từ 2000 đến 2100.");
      return;
    }
    applyNam(y);
    setShowAddYear(false);
    setError(null);
  }

  useEffect(() => {
    if (!open) {
      didInitRef.current = false;
      return;
    }
    if (!ctx) return;

    setModalYears(collectTruongYearTabs(tuyenSinh, yearOptions, pageYear));

    if (!didInitRef.current) {
      const tabs = collectTruongYearTabs(tuyenSinh, yearOptions, pageYear);
      const nextNam = tabs.includes(pageYear) ? pageYear : tabs[0] ?? pageYear;
      setNam(nextNam);
      setRows(buildRows(programs, tuyenSinh, nextNam));
      seedMonThiFromPriorYear(
        ctx.cauHinhMonThiByKey,
        ctx.patchCauHinhMonThi,
        programs,
        nextNam,
      );
      setShowAddYear(false);
      setNewYearDraft("");
      setMonThiEdit(null);
      setError(null);
      didInitRef.current = true;
    }
  }, [open, programs, tuyenSinh, yearOptions, pageYear]);

  useEffect(() => {
    if (!open || !didInitRef.current) return;
    setRows(buildRows(programs, tuyenSinh, nam));
  }, [open, programs, tuyenSinh, nam]);

  const cauHinhCache = ctx?.cauHinhMonThiByKey ?? {};
  const saveCount = rows.filter((r) => r.include).length;

  async function save() {
    if (!ctx) return;
    setSaving(true);
    setError(null);

    const selected = rows.filter((r) => r.include);
    const toInsert = selected.filter((r) => !r.hasExisting);
    const toUpdate = selected.filter((r) => r.hasExisting && r.tuyenSinhId);

    if (!selected.length) {
      setError("Chọn ít nhất một ngành để lưu.");
      setSaving(false);
      return;
    }

    const insertEntries: TuyenSinhInsertPayload[] = toInsert.map((r) => {
      const p = rowPayload(r);
      return {
        truongNganhId: r.truongNganhId,
        chi_tieu: p.chi_tieu,
        diem_chuan: p.diem_chuan,
        thoi_gian_thang:
          p.thoi_gian_thang != null && p.thoi_gian_thang > 0
            ? p.thoi_gian_thang
            : null,
      };
    });

    const prevTuyen = ctx.tuyenSinh;
    const prevPrograms = ctx.programs;

    const thangByProgram = new Map<string, number>();
    for (const r of selected) {
      const thang = rowPayload(r).thoi_gian_thang;
      if (thang != null && thang > 0) thangByProgram.set(r.truongNganhId, thang);
    }

    try {
      let nextTuyen = [...prevTuyen];

      for (const r of toUpdate) {
        const p = rowPayload(r);
        const res = await truongInlineFetch(
          ctx.orgId,
          `/tuyen-sinh/${r.tuyenSinhId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              chi_tieu: p.chi_tieu,
              diem_chuan: p.diem_chuan,
            }),
          },
        );
        if (!res.ok) {
          setError(await readTruongInlineError(res));
          return;
        }
        nextTuyen = nextTuyen.map((row) =>
          row.id === r.tuyenSinhId
            ? { ...row, chi_tieu: p.chi_tieu, diem_chuan: p.diem_chuan }
            : row,
        );
      }

      let insertedCount = 0;
      if (insertEntries.length) {
        const res = await truongInlineFetch(ctx.orgId, "/tuyen-sinh", {
          method: "POST",
          body: JSON.stringify({ nam, entries: insertEntries }),
        });
        if (!res.ok) {
          setError(await readTruongInlineError(res));
          return;
        }

        const json = (await res.json()) as {
          rows?: TuyenSinhInsertRawRow[];
        };
        const enriched = enrichTuyenSinhRows(json.rows ?? [], programs);
        insertedCount = enriched.length;
        nextTuyen = [...nextTuyen, ...enriched];
      }

      let nextPrograms = mergeTuyenSinhIntoPrograms(
        prevPrograms,
        nextTuyen.filter(
          (row) =>
            Number(row.nam) === nam &&
            selected.some((d) => d.truongNganhId === row.truongNganhId),
        ),
      );

      for (const [programId, thoi_gian_thang] of thangByProgram) {
        const res = await truongInlineFetch(ctx.orgId, `/nganh/${programId}`, {
          method: "PATCH",
          body: JSON.stringify({ thoi_gian_thang }),
        });
        if (!res.ok) {
          setError(await readTruongInlineError(res));
          return;
        }
        nextPrograms = nextPrograms.map((p) =>
          p.id === programId ? { ...p, thoi_gian_thang } : p,
        );
      }

      ctx.setTuyenSinh(nextTuyen);
      ctx.setPrograms(nextPrograms);
      setYear(nam);

      const parts: string[] = [];
      if (toUpdate.length) parts.push(`cập nhật ${toUpdate.length}`);
      if (insertedCount > 0) parts.push(`thêm ${insertedCount}`);
      ctx.showToast(
        `Đã lưu năm ${nam}${parts.length ? ` (${parts.join(", ")})` : ""} ngành`,
      );
      onClose();
    } catch {
      setError("Lỗi kết nối khi lưu.");
    } finally {
      setSaving(false);
    }
  }

  if (!ctx) return null;

  return (
    <TruongInlineModal
      open={open}
      onClose={onClose}
      className="tdh-add-year-modal"
      labelledBy="tdh-add-year-title"
    >
      <h3 id="tdh-add-year-title" className="tdh-inline-modal-title">
        Dữ liệu tuyển sinh theo năm
      </h3>
      <p className="tdh-add-year-lead">
        Chọn thẻ năm để sửa bảng hiện có, hoặc bấm + để thêm năm mới. Sửa chỉ
        tiêu / điểm chuẩn / thời gian học (tháng); bỏ chọn cột Lưu nếu không
        ghi dòng đó.
      </p>

      <div className="tdh-inline-field tdh-add-year-nam">
        <span className="tdh-add-year-nam-label">Năm</span>
        <div className="tdh-add-year-nam-row">
          <div className="tdh-add-year-tabs" role="tablist" aria-label="Năm">
            <button
              type="button"
              className="tdh-add-year-tab tdh-add-year-tab--add"
              aria-label="Thêm năm mới"
              aria-expanded={showAddYear}
              onClick={() => (showAddYear ? setShowAddYear(false) : openAddYear())}
            >
              +
            </button>
            {modalYears.map((y) => (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={nam === y}
                className={`tdh-add-year-tab${nam === y ? " is-active" : ""}`}
                onClick={() => applyNam(y)}
              >
                {y}
              </button>
            ))}
          </div>
          {showAddYear ? (
            <div className="tdh-add-year-new">
              <input
                type="number"
                min={2000}
                max={2100}
                value={newYearDraft}
                onChange={(e) => setNewYearDraft(e.target.value)}
                aria-label="Năm mới"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAddYear();
                  }
                }}
              />
              <button
                type="button"
                className="tdh-inline-btn primary"
                onClick={confirmAddYear}
              >
                Tạo bảng
              </button>
              <button
                type="button"
                className="tdh-inline-btn ghost"
                onClick={() => setShowAddYear(false)}
              >
                Hủy
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="tdh-add-year-table-wrap">
        <table className="tdh-add-year-table">
          <thead>
            <tr>
              <th scope="col">Lưu</th>
              <th scope="col">Ngành</th>
              <th scope="col">Môn thi</th>
              <th scope="col">Chỉ tiêu</th>
              <th scope="col">Điểm chuẩn</th>
              <th scope="col">Thời gian (tháng)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.truongNganhId}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.truongNganhId === row.truongNganhId
                            ? { ...r, include: e.target.checked }
                            : r,
                        ),
                      )
                    }
                    aria-label={`Lưu ${row.nganhTitle}`}
                  />
                </td>
                <td>
                  {row.nganhTitle}
                  {row.hasExisting ? (
                    <span className="tdh-add-year-exists">Đã có</span>
                  ) : null}
                </td>
                <td className="tdh-add-year-mon-cell">
                  <span
                    className={`tdh-add-year-mon-summary${
                      !cauHinhCache[
                        cauHinhMonThiCacheKey(row.truongNganhId, nam)
                      ]?.mon.length
                        ? " tdh-add-year-mon-summary--empty"
                        : ""
                    }`}
                  >
                    {(() => {
                      const cfg =
                        cauHinhCache[
                          cauHinhMonThiCacheKey(row.truongNganhId, nam)
                        ];
                      const short = formatMonThiShort(cfg);
                      return short === "—" ? EMPTY_DATA_LABEL : short;
                    })()}
                  </span>
                  <button
                    type="button"
                    className="tdh-inline-chip-btn"
                    disabled={!row.include}
                    onClick={() =>
                      setMonThiEdit({
                        truongNganhId: row.truongNganhId,
                        nganhTitle: row.nganhTitle,
                      })
                    }
                  >
                    Sửa
                  </button>
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    disabled={!row.include}
                    value={draftInputValue(row.chi_tieu)}
                    placeholder={EMPTY_DATA_LABEL}
                    aria-label={`Chỉ tiêu ${row.nganhTitle}`}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.truongNganhId === row.truongNganhId
                            ? { ...r, chi_tieu: e.target.value }
                            : r,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={!row.include}
                    value={draftInputValue(row.diem_chuan)}
                    placeholder={EMPTY_DATA_LABEL}
                    aria-label={`Điểm chuẩn ${row.nganhTitle}`}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.truongNganhId === row.truongNganhId
                            ? { ...r, diem_chuan: e.target.value }
                            : r,
                        ),
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    disabled={!row.include}
                    value={draftInputValue(row.thoi_gian_thang)}
                    placeholder={EMPTY_DATA_LABEL}
                    aria-label={`Thời gian học ${row.nganhTitle}`}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.truongNganhId === row.truongNganhId
                            ? { ...r, thoi_gian_thang: e.target.value }
                            : r,
                        ),
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="tdh-add-year-error">{error}</p> : null}

      {monThiEdit && ctx ? (
        <TruongNganhMonThiEditModal
          open
          onClose={() => setMonThiEdit(null)}
          orgId={ctx.orgId}
          programId={monThiEdit.truongNganhId}
          year={nam}
          nganhTitle={monThiEdit.nganhTitle}
          cauHinhCache={cauHinhCache}
          onApply={(config) => {
            ctx.patchCauHinhMonThi(monThiEdit.truongNganhId, nam, config);
            ctx.showToast(
              `Đã lưu môn thi ${monThiEdit.nganhTitle} (${nam}) vào cơ sở dữ liệu`,
            );
          }}
        />
      ) : null}

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
          onClick={() => void save()}
          disabled={saving || saveCount === 0}
        >
          {saving ? "Đang lưu…" : `Lưu năm ${nam} (${saveCount} ngành)`}
        </button>
      </div>
    </TruongInlineModal>
  );
}

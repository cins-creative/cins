"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { TruongNganhMonThiEditModal } from "@/components/truong/inline/TruongNganhMonThiEditModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { useYearFilter } from "@/components/truong/YearFilterProvider";
import {
  cauHinhMonThiCacheKey,
  pickPriorYearCauHinhFromCache,
} from "@/lib/truong/cau-hinh-tinh-diem";
import { formatMonThiShort } from "@/lib/truong/mon-thi-dau-vao";
import { mergeTuyenSinhIntoPrograms } from "@/lib/truong/merge-programs-tuyen-sinh";
import {
  HE_DAO_TAO_LABELS,
  HE_DAO_TAO_VALUES,
  normalizeHeDaoTao,
} from "@/lib/truong/he-dao-tao";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import {
  enrichTuyenSinhRows,
  type TuyenSinhInsertPayload,
  type TuyenSinhInsertRawRow,
} from "@/lib/truong/tuyen-sinh-client";
import {
  collectTruongYearTabs,
  isValidTruongYear,
  nextSuggestedTruongYear,
} from "@/lib/truong/year-tabs";
import type {
  TruongNganhProgram,
  TruongTuyenSinhNamRow,
} from "@/lib/truong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  prog: TruongNganhProgram;
  orgId: string;
  initialYear: number;
  onRemoved?: () => void;
};

type YearDraft = {
  chiTieu: string;
  diemChuan: string;
};

type ProgramDraft = {
  tenChuongTrinh: string;
  heDaoTao: string;
  thoiGianThang: string;
};

type YearDraftMap = Record<number, YearDraft>;

function formatDraftNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "";
  return String(v);
}

function parseDraftNum(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n) || n === 0) return null;
  return n;
}

function findTuyenSinhForYear(
  tuyenSinh: TruongTuyenSinhNamRow[],
  truongNganhId: string,
  nam: number,
) {
  return tuyenSinh.find(
    (r) => r.truongNganhId === truongNganhId && Number(r.nam) === Number(nam),
  );
}

function buildYearDraftFromRow(
  row: TruongTuyenSinhNamRow | undefined,
): YearDraft {
  return {
    chiTieu: formatDraftNum(row?.chi_tieu),
    diemChuan: formatDraftNum(row?.diem_chuan),
  };
}

function buildProgramDraft(prog: TruongNganhProgram): ProgramDraft {
  return {
    thoiGianThang: formatDraftNum(prog.thoi_gian_thang),
    heDaoTao: normalizeHeDaoTao(prog.he_dao_tao),
    tenChuongTrinh: prog.ten_chuong_trinh?.trim() ?? "",
  };
}

function cloneYearDraftMap(map: YearDraftMap): YearDraftMap {
  return Object.fromEntries(
    Object.entries(map).map(([y, draft]) => [Number(y), { ...draft }]),
  );
}

function yearDraftsEqual(a: YearDraft, b: YearDraft): boolean {
  return a.chiTieu === b.chiTieu && a.diemChuan === b.diemChuan;
}

function programDraftsEqual(a: ProgramDraft, b: ProgramDraft): boolean {
  return (
    a.heDaoTao === b.heDaoTao &&
    a.tenChuongTrinh === b.tenChuongTrinh &&
    a.thoiGianThang === b.thoiGianThang
  );
}

function buildInitialYearDrafts(
  tuyenSinh: TruongTuyenSinhNamRow[],
  progId: string,
  yearTabs: number[],
): YearDraftMap {
  const map: YearDraftMap = {};
  for (const y of yearTabs) {
    map[y] = buildYearDraftFromRow(findTuyenSinhForYear(tuyenSinh, progId, y));
  }
  return map;
}

export function TruongNganhProgramEditModal({
  open,
  onClose,
  prog,
  orgId,
  initialYear,
  onRemoved,
}: Props) {
  const ctx = useTruongInlineEdit();
  const { yearOptions, setYear: setPageYear } = useYearFilter();
  const [year, setYear] = useState(initialYear);
  const [yearDrafts, setYearDrafts] = useState<YearDraftMap>({});
  const [yearSnapshot, setYearSnapshot] = useState<YearDraftMap>({});
  const [programDraft, setProgramDraft] = useState<ProgramDraft>(() =>
    buildProgramDraft(prog),
  );
  const [programSnapshot, setProgramSnapshot] = useState<ProgramDraft>(() =>
    buildProgramDraft(prog),
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monThiOpen, setMonThiOpen] = useState(false);
  const [modalYearTabs, setModalYearTabs] = useState<number[]>([]);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearDraft, setNewYearDraft] = useState("");
  const [addYearError, setAddYearError] = useState<string | null>(null);

  const tuyenSinh = ctx?.tuyenSinh ?? [];
  const cauHinhCache = ctx?.cauHinhMonThiByKey ?? {};

  const activeYearDraft = yearDrafts[year] ?? { chiTieu: "", diemChuan: "" };

  const monThiConfig =
    cauHinhCache[cauHinhMonThiCacheKey(prog.id, year)] ??
    pickPriorYearCauHinhFromCache(cauHinhCache, prog.id, year);

  const dirtyYears = useMemo(
    () =>
      modalYearTabs.filter((y) => {
        const draft = yearDrafts[y];
        const snap = yearSnapshot[y];
        if (!draft || !snap) return false;
        return !yearDraftsEqual(draft, snap);
      }),
    [yearDrafts, yearSnapshot, modalYearTabs],
  );

  const programDirty = !programDraftsEqual(programDraft, programSnapshot);
  const hasUnsavedChanges = programDirty || dirtyYears.length > 0;

  useEffect(() => {
    if (!open) {
      setRemoveConfirm(false);
      setError(null);
      return;
    }
    setYear(initialYear);
    const initialTabs = collectTruongYearTabs(
      tuyenSinh,
      yearOptions,
      initialYear,
    );
    setModalYearTabs(initialTabs);
    setShowAddYear(false);
    setAddYearError(null);
    const initialYearDrafts = buildInitialYearDrafts(
      tuyenSinh,
      prog.id,
      initialTabs,
    );
    setYearDrafts(initialYearDrafts);
    setYearSnapshot(cloneYearDraftMap(initialYearDrafts));
    const initialProgram = buildProgramDraft(prog);
    setProgramDraft(initialProgram);
    setProgramSnapshot({ ...initialProgram });
    setError(null);
  }, [open, initialYear, prog, tuyenSinh, yearOptions]);

  function patchYearDraft(y: number, patch: Partial<YearDraft>) {
    setYearDrafts((prev) => {
      const current = prev[y] ?? { chiTieu: "", diemChuan: "" };
      return { ...prev, [y]: { ...current, ...patch } };
    });
  }

  function selectYear(nextYear: number) {
    setYearDrafts((prev) => {
      if (prev[nextYear]) return prev;
      return {
        ...prev,
        [nextYear]: buildYearDraftFromRow(
          findTuyenSinhForYear(tuyenSinh, prog.id, nextYear),
        ),
      };
    });
    setYearSnapshot((prev) => {
      if (prev[nextYear]) return prev;
      return {
        ...prev,
        [nextYear]: buildYearDraftFromRow(
          findTuyenSinhForYear(tuyenSinh, prog.id, nextYear),
        ),
      };
    });
    setYear(nextYear);
  }

  function openAddYear() {
    setNewYearDraft(
      String(nextSuggestedTruongYear(modalYearTabs, yearOptions)),
    );
    setShowAddYear(true);
    setAddYearError(null);
  }

  function confirmAddYear() {
    const y = Number(newYearDraft.trim());
    if (!isValidTruongYear(y)) {
      setAddYearError("Năm phải từ 2000 đến 2100.");
      return;
    }
    if (modalYearTabs.includes(y)) {
      setAddYearError("Năm này đã có trên tab.");
      selectYear(y);
      setShowAddYear(false);
      setAddYearError(null);
      return;
    }
    setModalYearTabs((prev) => [...prev, y].sort((a, b) => b - a));
    selectYear(y);
    setShowAddYear(false);
    setAddYearError(null);
  }

  async function save() {
    if (!ctx || saving) return;
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    const thoi_gian_thang = parseDraftNum(programDraft.thoiGianThang);
    const prevTuyen = ctx.tuyenSinh;
    const prevPrograms = ctx.programs;

    try {
      let nextTuyen = [...prevTuyen];

      for (const y of dirtyYears) {
        const draft = yearDrafts[y];
        if (!draft) continue;

        const chi_tieu = parseDraftNum(draft.chiTieu);
        const diem_chuan = parseDraftNum(draft.diemChuan);
        const tuyenRow = findTuyenSinhForYear(nextTuyen, prog.id, y);

        if (tuyenRow?.id) {
          const res = await truongInlineFetch(
            ctx.orgId,
            `/tuyen-sinh/${tuyenRow.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({ chi_tieu, diem_chuan }),
            },
          );
          if (!res.ok) {
            setError(await readTruongInlineError(res));
            return;
          }
          nextTuyen = nextTuyen.map((row) =>
            row.id === tuyenRow.id ? { ...row, chi_tieu, diem_chuan } : row,
          );
        } else {
          const entry: TuyenSinhInsertPayload = {
            truongNganhId: prog.id,
            chi_tieu,
            diem_chuan,
            thoi_gian_thang:
              thoi_gian_thang != null && thoi_gian_thang > 0
                ? thoi_gian_thang
                : null,
          };
          const res = await truongInlineFetch(ctx.orgId, "/tuyen-sinh", {
            method: "POST",
            body: JSON.stringify({ nam: y, entries: [entry] }),
          });
          if (!res.ok) {
            setError(await readTruongInlineError(res));
            return;
          }
          const json = (await res.json()) as { rows?: TuyenSinhInsertRawRow[] };
          const enriched = enrichTuyenSinhRows(json.rows ?? [], ctx.programs);
          nextTuyen = [...nextTuyen, ...enriched];
        }
      }

      let nextPrograms = mergeTuyenSinhIntoPrograms(
        prevPrograms,
        nextTuyen.filter((row) => row.truongNganhId === prog.id),
      );

      if (programDirty) {
        const programPatch: Record<string, unknown> = {};
        if (thoi_gian_thang != null && thoi_gian_thang > 0) {
          programPatch.thoi_gian_thang = thoi_gian_thang;
        }
        const ten = programDraft.tenChuongTrinh.trim();
        if (ten) programPatch.ten_chuong_trinh = ten;
        const he = programDraft.heDaoTao.trim();
        if (he) programPatch.he_dao_tao = he;

        if (Object.keys(programPatch).length) {
          const res = await truongInlineFetch(ctx.orgId, `/nganh/${prog.id}`, {
            method: "PATCH",
            body: JSON.stringify(programPatch),
          });
          if (!res.ok) {
            setError(await readTruongInlineError(res));
            return;
          }
          nextPrograms = nextPrograms.map((p) =>
            p.id === prog.id
              ? {
                  ...p,
                  thoi_gian_thang:
                    (programPatch.thoi_gian_thang as number | undefined) ??
                    p.thoi_gian_thang,
                  ten_chuong_trinh:
                    (programPatch.ten_chuong_trinh as string | undefined) ??
                    p.ten_chuong_trinh,
                  he_dao_tao:
                    (programPatch.he_dao_tao as string | undefined) ??
                    p.he_dao_tao,
                }
              : p,
          );
        }
      }

      ctx.setTuyenSinh(nextTuyen);
      ctx.setPrograms(nextPrograms);
      setYearSnapshot(cloneYearDraftMap(yearDrafts));
      setProgramSnapshot({ ...programDraft });
      setPageYear(year);

      const parts: string[] = [];
      if (dirtyYears.length) {
        parts.push(
          dirtyYears.length === 1
            ? `năm ${dirtyYears[0]}`
            : `${dirtyYears.length} năm`,
        );
      }
      if (programDirty) parts.push("thông tin chương trình");
      ctx.showToast(
        `Đã lưu «${prog.nganhTitle}»${parts.length ? ` (${parts.join(", ")})` : ""}`,
      );
      onClose();
    } catch {
      setError("Lỗi kết nối khi lưu ngành.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!ctx || !onRemoved || removing) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await truongInlineFetch(
        ctx.orgId,
        `/nganh/${encodeURIComponent(prog.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError(await readTruongInlineError(res));
        return;
      }
      onRemoved();
      ctx.showToast(`Đã ẩn ngành «${prog.nganhTitle}» khỏi trang trường`);
      onClose();
    } catch {
      setError("Lỗi kết nối khi ẩn ngành.");
    } finally {
      setRemoving(false);
      setRemoveConfirm(false);
    }
  }

  const busy = saving || removing;
  const monThiShort = formatMonThiShort(monThiConfig);

  return (
    <>
      <TruongInlineModal
        open={open}
        onClose={() => {
          if (!busy) onClose();
        }}
        className="tdh-inline-modal--wide tdh-nganh-program-edit-modal"
        labelledBy="tdh-nganh-program-edit-title"
      >
        <div className="tdh-nganh-program-edit-head">
          <div className="tdh-nganh-program-edit-head-copy">
            <h3
              id="tdh-nganh-program-edit-title"
              className="tdh-inline-modal-title"
            >
              Sửa ngành — {prog.nganhTitle}
            </h3>
            <p className="tdh-nganh-program-edit-lead">
              Chuyển tab năm để sửa nhiều năm — bấm{" "}
              <strong>Lưu thay đổi</strong> một lần khi xong.
            </p>
          </div>
          <button
            type="button"
            className="tdh-nganh-program-edit-close"
            aria-label="Đóng"
            disabled={busy}
            onClick={() => {
              if (!busy) onClose();
            }}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="tdh-nganh-program-edit-years">
          <span className="tdh-nganh-program-edit-years-label">Năm</span>
          <div className="tdh-add-year-tabs" role="tablist" aria-label="Năm dữ liệu">
            <button
              type="button"
              className="tdh-add-year-tab tdh-add-year-tab--add"
              aria-label="Thêm năm khác"
              aria-expanded={showAddYear}
              disabled={busy}
              onClick={() =>
                showAddYear ? setShowAddYear(false) : openAddYear()
              }
            >
              +
            </button>
            {modalYearTabs.map((y) => {
              const yearDirty =
                yearDrafts[y] &&
                yearSnapshot[y] &&
                !yearDraftsEqual(yearDrafts[y], yearSnapshot[y]);
              return (
                <button
                  key={y}
                  type="button"
                  role="tab"
                  aria-selected={year === y}
                  className={[
                    "tdh-add-year-tab",
                    year === y ? "is-active" : "",
                    yearDirty ? "is-dirty" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={busy}
                  title={yearDirty ? "Có thay đổi chưa lưu" : undefined}
                  onClick={() => selectYear(y)}
                >
                  {y}
                </button>
              );
            })}
          </div>
          {showAddYear ? (
            <div className="tdh-add-year-new tdh-nganh-program-edit-add-year">
              <input
                type="number"
                min={2000}
                max={2100}
                value={newYearDraft}
                disabled={busy}
                onChange={(e) => setNewYearDraft(e.target.value)}
                aria-label="Năm mới"
              />
              <button
                type="button"
                className="tdh-inline-btn primary"
                disabled={busy}
                onClick={confirmAddYear}
              >
                Thêm
              </button>
              <button
                type="button"
                className="tdh-inline-btn ghost"
                disabled={busy}
                onClick={() => setShowAddYear(false)}
              >
                Hủy
              </button>
            </div>
          ) : null}
          {addYearError ? (
            <p className="tdh-nganh-program-edit-add-year-err" role="alert">
              {addYearError}
            </p>
          ) : null}
        </div>

        <div className="tdh-nganh-program-edit-table-wrap">
          <table className="tdh-nganh-program-edit-table">
            <tbody>
              <tr>
                <th scope="row">Mã ngành</th>
                <td className="mono">{prog.ma_nganh ?? "—"}</td>
              </tr>
              <tr>
                <th scope="row">Tên chương trình</th>
                <td>
                  <input
                    type="text"
                    className="tdh-nganh-program-edit-input"
                    value={programDraft.tenChuongTrinh}
                    disabled={busy}
                    onChange={(e) =>
                      setProgramDraft((prev) => ({
                        ...prev,
                        tenChuongTrinh: e.target.value,
                      }))
                    }
                    placeholder="Tên hiển thị tại trường"
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Hệ đào tạo</th>
                <td>
                  <select
                    className="tdh-nganh-program-edit-input tdh-nganh-program-edit-input--select"
                    value={programDraft.heDaoTao}
                    disabled={busy}
                    onChange={(e) =>
                      setProgramDraft((prev) => ({
                        ...prev,
                        heDaoTao: e.target.value,
                      }))
                    }
                    aria-label="Hệ đào tạo"
                  >
                    {HE_DAO_TAO_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {HE_DAO_TAO_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <th scope="row">Thời gian (tháng)</th>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="tdh-nganh-program-edit-input tdh-nganh-program-edit-input--num"
                    value={programDraft.thoiGianThang}
                    disabled={busy}
                    onChange={(e) =>
                      setProgramDraft((prev) => ({
                        ...prev,
                        thoiGianThang: e.target.value,
                      }))
                    }
                    placeholder="—"
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Điểm chuẩn {year}</th>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    className="tdh-nganh-program-edit-input tdh-nganh-program-edit-input--num"
                    value={activeYearDraft.diemChuan}
                    disabled={busy}
                    onChange={(e) =>
                      patchYearDraft(year, { diemChuan: e.target.value })
                    }
                    placeholder="—"
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Chỉ tiêu {year}</th>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="tdh-nganh-program-edit-input tdh-nganh-program-edit-input--num"
                    value={activeYearDraft.chiTieu}
                    disabled={busy}
                    onChange={(e) =>
                      patchYearDraft(year, { chiTieu: e.target.value })
                    }
                    placeholder="—"
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Môn thi đầu vào</th>
                <td className="tdh-nganh-program-edit-mon-cell">
                  <span
                    className={`tdh-add-year-mon-summary${
                      monThiShort === "—" ? " tdh-add-year-mon-summary--empty" : ""
                    }`}
                  >
                    {monThiShort === "—" ? "Chưa có dữ liệu" : monThiShort}
                  </span>
                  <button
                    type="button"
                    className="tdh-inline-chip-btn"
                    disabled={busy}
                    onClick={() => setMonThiOpen(true)}
                  >
                    Sửa môn thi
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {removeConfirm ? (
          <div className="tdh-inline-modal-warning tdh-nganh-program-edit-remove-warn" role="alert">
            <p>
              Gỡ <strong>«{prog.nganhTitle}»</strong> khỏi trang trường? Dữ liệu
              vẫn lưu trong hệ thống (chế độ ẩn).
            </p>
            <div className="tdh-nganh-program-edit-remove-actions">
              <button
                type="button"
                className="tdh-inline-btn ghost"
                disabled={busy}
                onClick={() => setRemoveConfirm(false)}
              >
                Hủy gỡ
              </button>
              <button
                type="button"
                className="tdh-inline-btn danger"
                disabled={busy}
                onClick={() => void confirmRemove()}
              >
                {removing ? "Đang gỡ…" : "Gỡ và ẩn"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="tdh-nganh-program-edit-error">{error}</p> : null}

        <div className="tdh-inline-modal-actions tdh-nganh-program-edit-foot">
          {onRemoved ? (
            <button
              type="button"
              className="tdh-inline-btn ghost tdh-nganh-program-edit-remove"
              disabled={busy || removeConfirm}
              onClick={() => setRemoveConfirm(true)}
            >
              Gỡ ngành
            </button>
          ) : null}
          <div className="tdh-nganh-program-edit-foot-main">
            <button
              type="button"
              className="tdh-inline-btn ghost"
              disabled={busy}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="button"
              className="tdh-inline-btn primary"
              disabled={busy || !hasUnsavedChanges}
              onClick={() => void save()}
            >
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </TruongInlineModal>

      {ctx ? (
        <TruongNganhMonThiEditModal
          open={monThiOpen}
          onClose={() => setMonThiOpen(false)}
          orgId={orgId}
          programId={prog.id}
          year={year}
          nganhTitle={prog.nganhTitle}
          cauHinhCache={cauHinhCache}
          onApply={(config) => {
            ctx.patchCauHinhMonThi(prog.id, year, config);
            ctx.showToast(
              `Đã lưu môn thi ${prog.nganhTitle} (${year}) vào cơ sở dữ liệu`,
            );
          }}
        />
      ) : null}
    </>
  );
}

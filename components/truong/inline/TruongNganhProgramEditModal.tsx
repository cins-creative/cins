"use client";

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
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import {
  enrichTuyenSinhRows,
  type TuyenSinhInsertPayload,
  type TuyenSinhInsertRawRow,
} from "@/lib/truong/tuyen-sinh-client";
import { collectTruongYearTabs } from "@/lib/truong/year-tabs";
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
  const [chiTieu, setChiTieu] = useState("");
  const [diemChuan, setDiemChuan] = useState("");
  const [thoiGianThang, setThoiGianThang] = useState("");
  const [heDaoTao, setHeDaoTao] = useState("");
  const [tenChuongTrinh, setTenChuongTrinh] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monThiOpen, setMonThiOpen] = useState(false);

  const tuyenSinh = ctx?.tuyenSinh ?? [];
  const cauHinhCache = ctx?.cauHinhMonThiByKey ?? {};

  const yearTabs = useMemo(
    () => collectTruongYearTabs(tuyenSinh, yearOptions, initialYear),
    [tuyenSinh, yearOptions, initialYear],
  );

  const tuyenRow = useMemo(
    () => findTuyenSinhForYear(tuyenSinh, prog.id, year),
    [tuyenSinh, prog.id, year],
  );

  const monThiConfig =
    cauHinhCache[cauHinhMonThiCacheKey(prog.id, year)] ??
    pickPriorYearCauHinhFromCache(cauHinhCache, prog.id, year);

  useEffect(() => {
    if (!open) {
      setRemoveConfirm(false);
      setError(null);
      return;
    }
    setYear(initialYear);
  }, [open, initialYear]);

  useEffect(() => {
    if (!open) return;
    setChiTieu(formatDraftNum(tuyenRow?.chi_tieu));
    setDiemChuan(formatDraftNum(tuyenRow?.diem_chuan));
    setThoiGianThang(formatDraftNum(prog.thoi_gian_thang));
    setHeDaoTao(prog.he_dao_tao?.trim() ?? "");
    setTenChuongTrinh(prog.ten_chuong_trinh?.trim() ?? "");
    setError(null);
  }, [open, year, tuyenRow, prog]);

  async function save() {
    if (!ctx || saving) return;
    setSaving(true);
    setError(null);

    const chi_tieu = parseDraftNum(chiTieu);
    const diem_chuan = parseDraftNum(diemChuan);
    const thoi_gian_thang = parseDraftNum(thoiGianThang);

    const prevTuyen = ctx.tuyenSinh;
    const prevPrograms = ctx.programs;

    try {
      let nextTuyen = [...prevTuyen];

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
          row.id === tuyenRow.id
            ? { ...row, chi_tieu, diem_chuan }
            : row,
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
          body: JSON.stringify({ nam: year, entries: [entry] }),
        });
        if (!res.ok) {
          setError(await readTruongInlineError(res));
          return;
        }
        const json = (await res.json()) as { rows?: TuyenSinhInsertRawRow[] };
        const enriched = enrichTuyenSinhRows(json.rows ?? [], ctx.programs);
        nextTuyen = [...nextTuyen, ...enriched];
      }

      let nextPrograms = mergeTuyenSinhIntoPrograms(
        prevPrograms,
        nextTuyen.filter(
          (row) =>
            row.truongNganhId === prog.id && Number(row.nam) === year,
        ),
      );

      const programPatch: Record<string, unknown> = {};
      if (thoi_gian_thang != null && thoi_gian_thang > 0) {
        programPatch.thoi_gian_thang = thoi_gian_thang;
      }
      const ten = tenChuongTrinh.trim();
      if (ten) programPatch.ten_chuong_trinh = ten;
      const he = heDaoTao.trim();
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

      ctx.setTuyenSinh(nextTuyen);
      ctx.setPrograms(nextPrograms);
      setPageYear(year);
      ctx.showToast(`Đã lưu dữ liệu «${prog.nganhTitle}» (${year})`);
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
        <h3 id="tdh-nganh-program-edit-title" className="tdh-inline-modal-title">
          Sửa ngành — {prog.nganhTitle}
        </h3>
        <p className="tdh-nganh-program-edit-lead">
          Cập nhật điểm chuẩn, chỉ tiêu và môn thi theo năm.
        </p>

        <div className="tdh-nganh-program-edit-years">
          <span className="tdh-nganh-program-edit-years-label">Năm</span>
          <div className="tdh-add-year-tabs" role="tablist" aria-label="Năm dữ liệu">
            {yearTabs.map((y) => (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={year === y}
                className={`tdh-add-year-tab${year === y ? " is-active" : ""}`}
                disabled={busy}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
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
                    value={tenChuongTrinh}
                    disabled={busy}
                    onChange={(e) => setTenChuongTrinh(e.target.value)}
                    placeholder="Tên hiển thị tại trường"
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Hệ đào tạo</th>
                <td>
                  <input
                    type="text"
                    className="tdh-nganh-program-edit-input"
                    value={heDaoTao}
                    disabled={busy}
                    onChange={(e) => setHeDaoTao(e.target.value)}
                    placeholder="VD: Chính quy"
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Thời gian (tháng)</th>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="tdh-nganh-program-edit-input tdh-nganh-program-edit-input--num"
                    value={thoiGianThang}
                    disabled={busy}
                    onChange={(e) => setThoiGianThang(e.target.value)}
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
                    value={diemChuan}
                    disabled={busy}
                    onChange={(e) => setDiemChuan(e.target.value)}
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
                    value={chiTieu}
                    disabled={busy}
                    onChange={(e) => setChiTieu(e.target.value)}
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
              disabled={busy}
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

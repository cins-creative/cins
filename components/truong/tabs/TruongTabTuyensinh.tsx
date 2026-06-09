"use client";

import { useMemo, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { TruongAdmissionCalcLauncherSlot } from "@/components/truong/TruongAdmissionCalcLauncher";
import { PhuongThucHelpTip } from "@/components/truong/tuyensinh/PhuongThucHelpTip";
import { TruongPhuongThucModal } from "@/components/truong/tuyensinh/TruongPhuongThucModal";
import { TruongYearSelect, useYearFilter } from "@/components/truong/YearFilterProvider";
import { labelPhuongThuc } from "@/lib/truong/phuong-thuc";
import { parseTieuChiRows } from "@/lib/truong/tieu-chi";
import { truongInlineFetch } from "@/lib/truong/inline-api";
import type {
  TruongDetail,
  TruongNganhProgram,
  TruongPhuongThuc,
  TruongTuyenSinhNamRow,
} from "@/lib/truong/types";

type Props = {
  school: TruongDetail;
  tuyenSinh: TruongTuyenSinhNamRow[];
};

function programTitleById(
  programs: TruongNganhProgram[],
  id: string,
): string | null {
  return programs.find((p) => p.id === id)?.nganhTitle ?? null;
}

function phuongThucNganhLabel(
  pt: TruongPhuongThuc,
  programs: TruongNganhProgram[],
): string | null {
  if (pt.ap_dung_tat_ca_nganh) return "Tất cả ngành";
  const ids = pt.id_nganh_ap_dung ?? [];
  if (!ids.length) return null;
  const names = ids
    .map((id) => programTitleById(programs, id))
    .filter(Boolean) as string[];
  if (!names.length) return "Một số ngành";
  return names.join(" · ");
}

export function TruongTabTuyensinh({ school: schoolProp, tuyenSinh: tuyenProp }: Props) {
  const ctx = useTruongInlineEdit();
  const school = ctx?.school ?? schoolProp;
  const tuyenSinh = ctx?.tuyenSinh ?? tuyenProp;
  const programs = ctx?.programs ?? school.programs;
  const isEditing = ctx?.isEditing ?? false;
  const { year } = useYearFilter();

  const [ptModalOpen, setPtModalOpen] = useState(false);
  const [editingPt, setEditingPt] = useState<TruongPhuongThuc | null>(null);
  const yearRows = useMemo(
    () => tuyenSinh.filter((r) => r.nam === year),
    [tuyenSinh, year],
  );

  const phuongThuc = useMemo(() => {
    const seen = new Set<string>();
    const list: TruongPhuongThuc[] = [];
    for (const row of yearRows) {
      for (const pt of row.phuongThuc) {
        if (!pt.id || seen.has(pt.id)) continue;
        seen.add(pt.id);
        list.push(pt);
      }
    }
    return list;
  }, [yearRows]);

  const tuyenSinhNamId = yearRows[0]?.id ?? null;

  function openAddPt() {
    setEditingPt(null);
    setPtModalOpen(true);
  }

  function openEditPt(pt: TruongPhuongThuc) {
    setEditingPt(pt);
    setPtModalOpen(true);
  }

  async function deletePt(pt: TruongPhuongThuc) {
    if (!ctx || !confirm("Xoá phương thức xét tuyển này?")) return;
    const prev = ctx.tuyenSinh;
    ctx.setTuyenSinh((list) =>
      list.map((r) => ({
        ...r,
        phuongThuc: r.phuongThuc.filter((p) => p.id !== pt.id),
      })),
    );
    const res = await truongInlineFetch(ctx.orgId, `/phuong-thuc/${pt.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      ctx.setTuyenSinh(prev);
      ctx.showToast("Xoá thất bại");
      return;
    }
    ctx.showToast("Đã xoá phương thức");
  }

  return (
    <div className="tuyensinh-tab">
      {isEditing ? (
        <div className="ts-admin-bar">
          <span className="ts-admin-bar-icon" aria-hidden>
            ✏️
          </span>
          <span className="ts-admin-bar-text">
            Chế độ quản lý — bạn đang chỉnh sửa trang tuyển sinh
          </span>
          <button
            type="button"
            className="ts-admin-bar-btn primary"
            onClick={openAddPt}
            disabled={!tuyenSinhNamId}
          >
            + Thêm phương thức
          </button>
        </div>
      ) : null}

      <div className="tuyensinh-main">
          <section
            className="tuyensinh-tools-section"
            aria-label="Công cụ tuyển sinh"
          >
            <header className="sec-hdr">
              <span className="sec-num">01</span>
              <h2 className="sec-title">
                Công cụ <em>tuyển sinh</em>
              </h2>
              <TruongYearSelect label="Năm tuyển sinh" />
            </header>
            <TruongAdmissionCalcLauncherSlot
              orgId={school.id}
              programs={programs}
              tuyenSinh={tuyenSinh}
            />
          </section>

          <header className="sec-hdr tuyensinh-pt-hdr">
            <span className="sec-num">02</span>
            <h2 className="sec-title">
              Phương thức <em>xét tuyển</em>
            </h2>
          </header>

          {phuongThuc.length === 0 ? (
            <div className="ptxt-empty">
              <p className="ptxt-empty-text">
                Chưa có phương thức xét tuyển nào.
                <br />
                {isEditing
                  ? "Thêm để thí sinh biết cách đăng ký."
                  : `Dữ liệu năm ${year} sẽ cập nhật khi trường công bố trên CINs.`}
              </p>
              {isEditing ? (
                <button type="button" className="ts-add-btn" onClick={openAddPt}>
                  + Thêm phương thức
                </button>
              ) : null}
            </div>
          ) : (
            <div className="ptxt-grid">
              {phuongThuc.map((pt) => {
                const criteria = parseTieuChiRows(pt.tieu_chi);
                const nganhVal = phuongThucNganhLabel(pt, programs);
                return (
                  <article key={pt.id} className="ptxt-item">
                    {isEditing ? (
                      <div className="ptxt-edit-overlay">
                        <button
                          type="button"
                          className="ts-edit-btn edit"
                          onClick={() => openEditPt(pt)}
                        >
                          ✏ Sửa
                        </button>
                        <button
                          type="button"
                          className="ts-edit-btn del"
                          onClick={() => void deletePt(pt)}
                        >
                          ✕ Xoá
                        </button>
                      </div>
                    ) : null}
                    <header className="ptxt-item-head">
                      <h3 className="ptxt-name">
                        <span className="ptxt-name-text">
                          {labelPhuongThuc(pt.ten_phuong_thuc)}
                        </span>
                        <PhuongThucHelpTip code={pt.ten_phuong_thuc} />
                      </h3>
                      {nganhVal != null || pt.chi_tieu_phuong_thuc != null ? (
                        <ul
                          className="ptxt-meta-row"
                          aria-label="Thông tin phương thức"
                        >
                          {nganhVal != null ? (
                            <li className="ptxt-meta-chip">
                              <span className="ptxt-meta-lbl cins-meta">
                                Áp dụng cho ngành
                              </span>
                              <span className="ptxt-meta-val">{nganhVal}</span>
                            </li>
                          ) : null}
                          {pt.chi_tieu_phuong_thuc != null ? (
                            <li className="ptxt-meta-chip ptxt-meta-chip--quota">
                              <span className="ptxt-meta-lbl cins-meta">
                                Chỉ tiêu
                              </span>
                              <span className="ptxt-meta-val">
                                {pt.chi_tieu_phuong_thuc} SV
                              </span>
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </header>
                    {criteria.length > 0 ? (
                      <div className="ptxt-criteria">
                        {criteria.map((c) => (
                          <div key={`${c.name}-${c.score}`} className="ptxt-crit">
                            <span className="ptxt-crit-name">
                              Điều kiện: {c.name}
                            </span>
                            {c.score ? (
                              <span className="ptxt-crit-score">{c.score}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {isEditing && phuongThuc.length > 0 ? (
            <div className="ts-add-row">
              <button
                type="button"
                className="ts-add-btn ghost"
                onClick={openAddPt}
              >
                + Thêm phương thức xét tuyển
              </button>
            </div>
          ) : null}
      </div>

      <TruongPhuongThucModal
        open={ptModalOpen}
        onClose={() => setPtModalOpen(false)}
        editing={editingPt}
        tuyenSinhNamId={tuyenSinhNamId}
        programs={programs}
      />
    </div>
  );
}

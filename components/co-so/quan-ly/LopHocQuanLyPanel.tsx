"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { LopHocEditModal } from "@/components/co-so/LopHocEditModal";
import { PedagogyQuanLyClient } from "@/components/co-so/quan-ly/PedagogyQuanLyClient";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import {
  labelHinhThucLop,
  labelTrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  KhoaHocCardData,
  LoaiMoHinhKhoa,
  LopHocDetailData,
} from "@/lib/to-chuc/khoa-hoc-types";
import type { LopHocQuanLyRow } from "@/lib/to-chuc/lop-hoc-quan-ly-types";

type KhoaOption = {
  id: string;
  slug: string;
  tenKhoaHoc: string;
  loaiMoHinh: LoaiMoHinhKhoa;
};

type Props = {
  orgId: string;
  orgSlug: string;
  khoaOptions: KhoaOption[];
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function toLopDetail(row: LopHocQuanLyRow): LopHocDetailData {
  const ten =
    row.giaoVienTen?.trim() ||
    row.giaoVienText?.trim() ||
    "Đang cập nhật";
  return {
    id: row.id,
    maLop: row.maLop,
    tenLop: row.lichHoc,
    hinhThuc: row.hinhThuc,
    lichHoc: row.lichHoc,
    ngayKhaiGiang: row.ngayKhaiGiang,
    slotToiDa: row.slotToiDa,
    trangThaiLop: row.trangThaiLop,
    conCho:
      row.trangThaiLop === "sap_khai_giang" ||
      row.trangThaiLop === "dang_hoc",
    giaoVienText: row.giaoVienText,
    giaoVien: {
      key: row.giaoVienPhuTrach ?? `text:${ten}`,
      ten,
      slug: null,
      verified: Boolean(row.giaoVienPhuTrach),
      initials: initials(ten),
      vaiTro: null,
      pendingProfile: !row.giaoVienPhuTrach && Boolean(row.giaoVienText),
      avatarUrl: null,
      avatarId: null,
    },
    diaChiHoc: null,
  };
}

function formatNgay(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function khoaOptionsFromCards(rows: KhoaHocCardData[]): KhoaOption[] {
  return rows.map((k) => ({
    id: k.id,
    slug: k.slug,
    tenKhoaHoc: k.tenKhoaHoc,
    loaiMoHinh: k.loaiMoHinh,
  }));
}

export function LopHocQuanLyPanel({ orgId, orgSlug, khoaOptions }: Props) {
  const [rows, setRows] = useState<LopHocQuanLyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState<LopHocQuanLyRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [createKhoaId, setCreateKhoaId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/lop-hoc`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải lớp.");
      setRows((data.lopHoc ?? []) as LopHocQuanLyRow[]);
      setCanEdit(Boolean(data.canEdit));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let dangMo = 0;
    let hv = 0;
    for (const r of rows) {
      if (
        r.trangThaiLop === "sap_khai_giang" ||
        r.trangThaiLop === "dang_hoc"
      ) {
        dangMo += 1;
      }
      hv += r.soHocVien;
    }
    return { total: rows.length, dangMo, hv };
  }, [rows]);

  const modalKhoa = useMemo(() => {
    if (editing) {
      const fromOptions = khoaOptions.find((k) => k.id === editing.khoaId);
      return (
        fromOptions ?? {
          id: editing.khoaId,
          slug: editing.khoaSlug,
          tenKhoaHoc: editing.tenKhoa,
          loaiMoHinh: editing.loaiMoHinh,
        }
      );
    }
    if (createOpen && createKhoaId) {
      return khoaOptions.find((k) => k.id === createKhoaId) ?? null;
    }
    return null;
  }, [createKhoaId, createOpen, editing, khoaOptions]);

  function startCreate() {
    if (!canEdit || khoaOptions.length === 0) return;
    setEditing(null);
    if (khoaOptions.length === 1) {
      setCreateKhoaId(khoaOptions[0]!.id);
      setCreateOpen(true);
      return;
    }
    setCreateKhoaId(khoaOptions[0]!.id);
    setPickOpen(true);
  }

  function closeModals() {
    setEditing(null);
    setCreateOpen(false);
    setPickOpen(false);
    setCreateKhoaId("");
  }

  return (
    <>
      <section className="cso-dt-kpis cso-lh-kpis" aria-label="Tóm tắt lớp học">
        <div className="cso-dt-kpi cso-dt-kpi--hero">
          <p className="cso-dt-kpi-label">Lớp học</p>
          <p className="cso-dt-kpi-value">{loading ? "…" : stats.total}</p>
          <p className="cso-dt-kpi-sub">{stats.dangMo} đang mở</p>
        </div>
        <div className="cso-dt-kpi">
          <p className="cso-dt-kpi-label">Lớp đang mở</p>
          <p className="cso-dt-kpi-value">{loading ? "…" : stats.dangMo}</p>
          <p className="cso-dt-kpi-sub">sắp khai giảng / đang học</p>
        </div>
        <div className="cso-dt-kpi">
          <p className="cso-dt-kpi-label">Học viên</p>
          <p className="cso-dt-kpi-value">{loading ? "…" : stats.hv}</p>
          <p className="cso-dt-kpi-sub">ghi danh các lớp</p>
        </div>
      </section>

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <div className="cso-lh-head-row">
            <div>
              <h2 className="cso-dt-panel-title">Danh sách lớp</h2>
              <p className="cso-dt-panel-sub">
                Lớp thuộc các khóa — sửa thông tin, lịch và giảng viên tại đây.
              </p>
            </div>
            {canEdit ? (
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--priv"
                disabled={khoaOptions.length === 0}
                onClick={startCreate}
              >
                <Plus size={15} strokeWidth={2.4} aria-hidden />
                Thêm lớp
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="cso-dt-panel-body">
            <p className="cso-ql-error cso-lh-inline-error">{error}</p>
          </div>
        ) : null}

        <div className="cso-dt-panel-body cso-dt-panel-body--flush">
          <div className="cso-hv-table-wrap">
            <table className="cso-hv-table">
              <thead>
                <tr>
                  <th scope="col">Lớp</th>
                  <th scope="col">Khóa</th>
                  <th scope="col">Khai giảng</th>
                  <th scope="col">HV</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="cso-hv-loading">Đang tải…</div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="cso-hv-empty">
                        <strong>Chưa có lớp</strong>
                        {khoaOptions.length === 0
                          ? "Tạo khóa trước, rồi thêm lớp học."
                          : "Bấm «Thêm lớp» để mở lớp thuộc một khóa."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <p className="cso-hv-name">
                          {r.maLop || r.lichHoc || "Lớp"}
                        </p>
                        <p className="cso-hv-lop">
                          {labelHinhThucLop(r.hinhThuc)}
                          {r.giaoVienTen ? ` · ${r.giaoVienTen}` : ""}
                        </p>
                      </td>
                      <td>
                        <p className="cso-hv-course">{r.tenKhoa}</p>
                      </td>
                      <td>
                        <p className="cso-hv-lop">{formatNgay(r.ngayKhaiGiang)}</p>
                      </td>
                      <td>
                        <p className="cso-hv-course">
                          {r.soHocVien}
                          {r.slotToiDa != null ? ` / ${r.slotToiDa}` : ""}
                        </p>
                      </td>
                      <td>
                        <span
                          className={
                            r.trangThaiLop === "dang_hoc"
                              ? "cso-hv-chip cso-hv-chip--ok"
                              : "cso-hv-chip cso-hv-chip--state"
                          }
                        >
                          {labelTrangThaiLop(r.trangThaiLop)}
                        </span>
                      </td>
                      <td>
                        <div className="cso-hv-actions">
                          <Link
                            href={coSoKhoaHocDetailPath(
                              orgSlug,
                              r.khoaSlug || r.khoaId,
                            )}
                            className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                          >
                            Mở khóa
                          </Link>
                          {canEdit ? (
                            <button
                              type="button"
                              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                              onClick={() => {
                                setCreateOpen(false);
                                setPickOpen(false);
                                setEditing(r);
                              }}
                            >
                              Sửa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <h2 className="cso-dt-panel-title">Nộp bài & tiến độ</h2>
          <p className="cso-dt-panel-sub">
            Duyệt bài nộp từ phòng lớp. Đạt + chọn bài tiếp → mở khóa bài mới và
            gửi thông báo.
          </p>
        </div>
        <div className="cso-dt-panel-body cso-dt-panel-body--flush">
          <PedagogyQuanLyClient orgId={orgId} />
        </div>
      </section>

      {pickOpen ? (
        <div
          className="cso-lh-khoa-pick"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cso-lh-khoa-pick-title"
        >
          <button
            type="button"
            className="cso-lh-khoa-pick-backdrop"
            aria-label="Đóng"
            onClick={closeModals}
          />
          <div className="cso-lh-khoa-pick-card">
            <h3 id="cso-lh-khoa-pick-title" className="cso-lh-khoa-pick-title">
              Chọn khóa cho lớp mới
            </h3>
            <label className="cso-ql-field">
              <span className="cso-ql-label">Khóa học</span>
              <select
                className="cso-ql-input"
                value={createKhoaId}
                onChange={(e) => setCreateKhoaId(e.target.value)}
              >
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.tenKhoaHoc}
                  </option>
                ))}
              </select>
            </label>
            <div className="cso-lh-khoa-pick-actions">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--ghost"
                onClick={closeModals}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--priv"
                disabled={!createKhoaId}
                onClick={() => {
                  setPickOpen(false);
                  setCreateOpen(true);
                }}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalKhoa ? (
        <LopHocEditModal
          open
          orgId={orgId}
          khoaId={modalKhoa.id}
          loaiMoHinh={modalKhoa.loaiMoHinh}
          tenKhoaHoc={modalKhoa.tenKhoaHoc}
          editing={editing ? toLopDetail(editing) : null}
          onClose={closeModals}
          onSaved={() => {
            closeModals();
            void load();
          }}
        />
      ) : null}
    </>
  );
}

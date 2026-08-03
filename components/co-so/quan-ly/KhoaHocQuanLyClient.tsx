"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";

import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import {
  khoaOptionsFromCards,
  LopHocQuanLyPanel,
} from "@/components/co-so/quan-ly/LopHocQuanLyPanel";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import {
  labelLoaiMoHinhKhoa,
  labelTrangThaiLop,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import type { LopHocQuanLyRow } from "@/lib/to-chuc/lop-hoc-quan-ly-types";

type Props = {
  orgId: string;
  orgSlug: string;
};

type TabId = "khoa" | "lop";

type HocVienDangHoc = {
  hocVienLopId: string;
  trangThai: string;
  ngayDangKy: string;
  userId: string;
  tenHienThi: string;
  slug: string | null;
  avatarUrl: string | null;
  lopId: string | null;
  maLop: string | null;
  ngayCuoiKy: string | null;
  soNgayConLai: number;
  dangFreeze: boolean;
};

const TABS: ReadonlyArray<{ id: TabId; label: string; short: string }> = [
  { id: "khoa", label: "Quản lý khóa", short: "Khóa" },
  { id: "lop", label: "Quản lý lớp học", short: "Lớp" },
];

const TRANG_THAI_LABEL: Record<string, string> = {
  sap_khai_giang: "Sắp khai giảng",
  dang_mo_don: "Đang mở đơn",
  dang_hoc: "Đang học",
  da_ket_thuc: "Đã kết thúc",
  tam_dung: "Tạm dừng",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function formatHocPhi(vnd: number | null): string {
  if (vnd == null || Number.isNaN(vnd)) return "—";
  return `${vnd.toLocaleString("vi-VN")} đ`;
}

function formatNgay(iso: string | null): string {
  if (!iso) return "—";
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

function lopLabel(r: LopHocQuanLyRow): string {
  return r.maLop?.trim() || r.lichHoc?.trim() || "Lớp";
}

export function KhoaHocQuanLyClient({ orgId, orgSlug }: Props) {
  const [tab, setTab] = useState<TabId>("khoa");
  const [rows, setRows] = useState<KhoaHocCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaHocCardData | null>(null);

  const [lopRows, setLopRows] = useState<LopHocQuanLyRow[]>([]);
  const [lopLoading, setLopLoading] = useState(true);
  const [lopCanEdit, setLopCanEdit] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lopFilterKhoaId, setLopFilterKhoaId] = useState<string | null>(null);
  const [hvByKhoa, setHvByKhoa] = useState<
    Record<string, { rows: HocVienDangHoc[]; total: number }>
  >({});
  const [hvLoadingId, setHvLoadingId] = useState<string | null>(null);
  const [hvError, setHvError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/khoa-hoc`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải khóa.");
      setRows(data.khoaHoc ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadLop = useCallback(async () => {
    setLopLoading(true);
    try {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/lop-hoc`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải lớp.");
      setLopRows((data.lopHoc ?? []) as LopHocQuanLyRow[]);
      setLopCanEdit(Boolean(data.canEdit));
    } catch {
      setLopRows([]);
      setLopCanEdit(false);
    } finally {
      setLopLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
    void loadLop();
  }, [load, loadLop]);

  const loadHvDangHoc = useCallback(
    async (khoaId: string) => {
      setHvLoadingId(khoaId);
      setHvError(null);
      try {
        const res = await fetch(
          `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoaId)}/hoc-vien?trangThai=dang_hoc&pageSize=100`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải học viên.");
        setHvByKhoa((prev) => ({
          ...prev,
          [khoaId]: {
            rows: (data.rows ?? []) as HocVienDangHoc[],
            total: Number(data.total ?? 0),
          },
        }));
      } catch (e) {
        setHvError(e instanceof Error ? e.message : "Lỗi tải học viên.");
      } finally {
        setHvLoadingId(null);
      }
    },
    [orgId],
  );

  function selectKhoa(khoa: KhoaHocCardData) {
    if (selectedId === khoa.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(khoa.id);
    if (!hvByKhoa[khoa.id]) {
      void loadHvDangHoc(khoa.id);
    }
  }

  function openLopCuaKhoa(khoa: KhoaHocCardData) {
    startTransition(() => {
      setLopFilterKhoaId(khoa.id);
      setTab("lop");
    });
  }

  function switchTab(id: TabId) {
    startTransition(() => {
      setTab(id);
    });
  }

  async function softDeleteKhoa(khoa: KhoaHocCardData) {
    if (deletingId) return;
    const ok = window.confirm(
      `Ẩn khóa «${khoa.tenKhoaHoc}»?\n\nĐây là soft delete — khóa chuyển sang «Tạm dừng», dữ liệu lớp/học viên được giữ. Có thể khôi phục bằng cách sửa trạng thái khóa.`,
    );
    if (!ok) return;
    setDeletingId(khoa.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(khoa.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error || "Không xóa được khóa.",
        );
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === khoa.id
            ? { ...row, trangThaiKhoaHoc: "tam_dung" }
            : row,
        ),
      );
      if (selectedId === khoa.id) setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi xóa khóa.");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    let congKhai = 0;
    let lop = 0;
    let hv = 0;
    for (const k of rows) {
      if (k.cheDoHienThi !== "an") congKhai += 1;
      lop += k.soLopMo;
      hv += k.soHocVien;
    }
    return { total: rows.length, congKhai, lop, hv };
  }, [rows]);

  const khoaOptions = useMemo(() => khoaOptionsFromCards(rows), [rows]);
  const selected = rows.find((k) => k.id === selectedId) ?? null;
  const selectedHv = selectedId ? hvByKhoa[selectedId] : undefined;
  const selectedLop = useMemo(
    () =>
      selectedId
        ? lopRows.filter((l) => l.khoaId === selectedId)
        : [],
    [lopRows, selectedId],
  );

  const lopByKhoaId = useMemo(() => {
    const map = new Map<string, LopHocQuanLyRow[]>();
    for (const lop of lopRows) {
      const list = map.get(lop.khoaId);
      if (list) list.push(lop);
      else map.set(lop.khoaId, [lop]);
    }
    return map;
  }, [lopRows]);

  const lopFilterTenKhoa = useMemo(() => {
    if (!lopFilterKhoaId) return null;
    return rows.find((k) => k.id === lopFilterKhoaId)?.tenKhoaHoc ?? null;
  }, [lopFilterKhoaId, rows]);

  return (
    <div className="cso-lh-page cso-dt-stack">
      <nav className="cso-lh-tabs" aria-label="Khóa và lớp">
        <div className="cso-lh-trail" role="tablist">
          {TABS.map(({ id, label, short }, index) => {
            const isOn = tab === id;
            const isFirst = index === 0;
            const isLast = index === TABS.length - 1;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isOn}
                className={[
                  "cso-lh-tab",
                  isFirst ? "is-first" : "",
                  isLast ? "is-last" : "",
                  isOn ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => switchTab(id)}
              >
                <span className="cso-lh-tab-label">
                  <span className="cso-lh-tab-label-full">{label}</span>
                  <span className="cso-lh-tab-label-short">{short}</span>
                </span>
              </button>
            );
          })}
        </div>
        {tab === "lop" && lopFilterTenKhoa ? (
          <p className="cso-lh-trail-hint">
            Lớp thuộc khóa <strong>{lopFilterTenKhoa}</strong>
          </p>
        ) : (
          <p className="cso-lh-trail-hint">Trong khóa có lớp</p>
        )}
      </nav>

      <div
        className="cso-lh-tab-pane"
        hidden={tab !== "khoa"}
        aria-hidden={tab !== "khoa"}
      >
          <section
            className="cso-dt-kpis cso-lh-kpis"
            aria-label="Tóm tắt khóa học"
          >
            <div className="cso-dt-kpi cso-dt-kpi--hero">
              <p className="cso-dt-kpi-label">Khóa học</p>
              <p className="cso-dt-kpi-value">
                {loading ? "…" : stats.total}
              </p>
              <p className="cso-dt-kpi-sub">{stats.congKhai} công khai</p>
            </div>
            <div className="cso-dt-kpi">
              <p className="cso-dt-kpi-label">Lớp đang mở</p>
              <p className="cso-dt-kpi-value">{loading ? "…" : stats.lop}</p>
              <p className="cso-dt-kpi-sub">trên toàn catalog</p>
            </div>
            <div className="cso-dt-kpi">
              <p className="cso-dt-kpi-label">Học viên</p>
              <p className="cso-dt-kpi-value">{loading ? "…" : stats.hv}</p>
              <p className="cso-dt-kpi-sub">ghi danh các khóa</p>
            </div>
          </section>

          <section className="cso-dt-panel">
            <div className="cso-dt-panel-head">
              <div className="cso-lh-head-row">
                <div>
                  <h2 className="cso-dt-panel-title">Catalog khóa</h2>
                  <p className="cso-dt-panel-sub">
                    Bấm vào khóa để xem thông tin và danh sách học viên đang học.
                  </p>
                </div>
                <button
                  type="button"
                  className="cso-ql-btn cso-ql-btn--priv"
                  onClick={() => {
                    setEditing(null);
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={15} strokeWidth={2.4} aria-hidden />
                  Tạo khóa
                </button>
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
                      <th scope="col">Khóa học</th>
                      <th scope="col">Lớp</th>
                      <th scope="col">Học viên đang học</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Hiển thị</th>
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
                            <strong>Chưa có khóa</strong>
                            Tạo khóa để hiện trên trang công khai và mở lớp học.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((k) => {
                        const isSelected = selectedId === k.id;
                        return (
                          <tr
                            key={k.id}
                            className={
                              isSelected ? "cso-lh-khoa-row is-selected" : "cso-lh-khoa-row"
                            }
                            onClick={() => selectKhoa(k)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                selectKhoa(k);
                              }
                            }}
                            tabIndex={0}
                            aria-selected={isSelected}
                          >
                            <td>
                              <button
                                type="button"
                                className="cso-lh-khoa cso-lh-khoa-open"
                                title={`Xem lớp của khóa ${k.tenKhoaHoc}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLopCuaKhoa(k);
                                }}
                              >
                                {k.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="cso-lh-thumb"
                                    src={k.thumbnailUrl}
                                    alt=""
                                  />
                                ) : (
                                  <span
                                    className="cso-lh-thumb cso-lh-thumb--ph"
                                    aria-hidden
                                  />
                                )}
                                <span className="cso-lh-khoa-meta">
                                  <span className="cso-hv-name">
                                    {k.tenKhoaHoc}
                                  </span>
                                  <span className="cso-hv-slug">/{k.slug}</span>
                                </span>
                              </button>
                            </td>
                            <td>
                              <p className="cso-hv-course">
                                {lopByKhoaId.get(k.id)?.length ?? k.soLopMo}
                              </p>
                            </td>
                            <td>
                              <p className="cso-hv-course">
                                {lopByKhoaId
                                  .get(k.id)
                                  ?.reduce((n, l) => n + l.soHocVien, 0) ??
                                  k.soHocVien}
                              </p>
                            </td>
                            <td>
                              <span className="cso-hv-chip cso-hv-chip--state">
                                {TRANG_THAI_LABEL[k.trangThaiKhoaHoc] ??
                                  k.trangThaiKhoaHoc}
                              </span>
                            </td>
                            <td>
                              {k.cheDoHienThi === "an" ? (
                                <span className="cso-hv-chip cso-hv-chip--state">
                                  Ẩn
                                </span>
                              ) : (
                                <span className="cso-hv-chip cso-hv-chip--ok">
                                  Công khai
                                </span>
                              )}
                            </td>
                            <td>
                              <div
                                className="cso-hv-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link
                                  href={coSoKhoaHocDetailPath(orgSlug, k.slug)}
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                                  title="Mở trang khóa"
                                  aria-label={`Mở khóa ${k.tenKhoaHoc}`}
                                >
                                  <ExternalLink size={15} strokeWidth={2.2} aria-hidden />
                                </Link>
                                <button
                                  type="button"
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                                  title="Sửa khóa"
                                  aria-label={`Sửa khóa ${k.tenKhoaHoc}`}
                                  onClick={() => {
                                    setCreateOpen(false);
                                    setEditing(k);
                                  }}
                                >
                                  <Pencil size={15} strokeWidth={2.2} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon cso-ql-btn--danger-icon"
                                  title="Ẩn khóa (soft delete)"
                                  aria-label={`Ẩn khóa ${k.tenKhoaHoc}`}
                                  disabled={
                                    deletingId === k.id ||
                                    k.trangThaiKhoaHoc === "tam_dung"
                                  }
                                  onClick={() => void softDeleteKhoa(k)}
                                >
                                  <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {selected ? (
            <section
              className="cso-dt-panel cso-lh-khoa-detail"
              aria-label={`Chi tiết khóa ${selected.tenKhoaHoc}`}
            >
              <div className="cso-dt-panel-head">
                <div className="cso-lh-head-row">
                  <div>
                    <h2 className="cso-dt-panel-title">{selected.tenKhoaHoc}</h2>
                    <p className="cso-dt-panel-sub">
                      /{selected.slug} ·{" "}
                      {labelLoaiMoHinhKhoa(selected.loaiMoHinh)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                    onClick={() => setSelectedId(null)}
                    aria-label="Đóng chi tiết khóa"
                  >
                    <X size={15} strokeWidth={2.2} aria-hidden />
                    Đóng
                  </button>
                </div>
              </div>

              <div className="cso-dt-panel-body">
                <dl className="cso-lh-khoa-facts">
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>
                      {TRANG_THAI_LABEL[selected.trangThaiKhoaHoc] ??
                        selected.trangThaiKhoaHoc}
                    </dd>
                  </div>
                  <div>
                    <dt>Hiển thị</dt>
                    <dd>
                      {selected.cheDoHienThi === "an" ? "Ẩn" : "Công khai"}
                    </dd>
                  </div>
                  <div>
                    <dt>Trình độ</dt>
                    <dd>{labelTrinhDoDauVao(selected.trinhDoDauVao)}</dd>
                  </div>
                  <div>
                    <dt>Học phí</dt>
                    <dd>{formatHocPhi(selected.hocPhi)}</dd>
                  </div>
                  <div>
                    <dt>Lớp đang mở</dt>
                    <dd>{selected.soLopMo}</dd>
                  </div>
                  <div>
                    <dt>Ghi danh</dt>
                    <dd>{selected.soHocVien}</dd>
                  </div>
                  <div>
                    <dt>Khai giảng gần nhất</dt>
                    <dd>{formatNgay(selected.ngayKhaiGiangGanNhat)}</dd>
                  </div>
                  <div>
                    <dt>Lịch học</dt>
                    <dd>{selected.lichHoc?.trim() || "—"}</dd>
                  </div>
                </dl>
                {selected.moTa?.trim() ? (
                  <p className="cso-lh-khoa-mota">{selected.moTa}</p>
                ) : null}
              </div>

              <div className="cso-dt-panel-head cso-lh-khoa-detail-subhead">
                <div>
                  <h3 className="cso-dt-panel-title">Lớp &amp; sĩ số</h3>
                  <p className="cso-dt-panel-sub">
                    {lopLoading
                      ? "Đang tải lớp…"
                      : `${selectedLop.length} lớp · số học viên mỗi lớp`}
                  </p>
                </div>
              </div>

              <div className="cso-dt-panel-body cso-dt-panel-body--flush">
                <div className="cso-hv-table-wrap">
                  <table className="cso-hv-table">
                    <thead>
                      <tr>
                        <th scope="col">Lớp</th>
                        <th scope="col">Giáo viên</th>
                        <th scope="col">Học viên</th>
                        <th scope="col">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lopLoading ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="cso-hv-loading">Đang tải…</div>
                          </td>
                        </tr>
                      ) : selectedLop.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="cso-hv-empty">
                              <strong>Chưa có lớp</strong>
                              Thêm lớp ở tab Quản lý lớp học.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        selectedLop.map((lop) => (
                          <tr key={lop.id}>
                            <td>
                              <p className="cso-hv-name">{lopLabel(lop)}</p>
                              <p className="cso-hv-lop">
                                KG {formatNgay(lop.ngayKhaiGiang)}
                              </p>
                            </td>
                            <td>
                              <p className="cso-hv-lop">
                                {lop.giaoVienTen?.trim() || "Chưa gán"}
                              </p>
                            </td>
                            <td>
                              <p className="cso-hv-course">
                                {lop.soHocVien}
                                {lop.slotToiDa != null
                                  ? ` / ${lop.slotToiDa}`
                                  : ""}
                              </p>
                            </td>
                            <td>
                              <span
                                className={
                                  lop.trangThaiLop === "dang_hoc"
                                    ? "cso-hv-chip cso-hv-chip--ok"
                                    : "cso-hv-chip cso-hv-chip--state"
                                }
                              >
                                {labelTrangThaiLop(lop.trangThaiLop)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cso-dt-panel-head cso-lh-khoa-detail-subhead">
                <div>
                  <h3 className="cso-dt-panel-title">Học viên đang học</h3>
                  <p className="cso-dt-panel-sub">
                    {hvLoadingId === selected.id
                      ? "Đang tải danh sách…"
                      : selectedHv
                        ? `${selectedHv.total} người · trạng thái đang học`
                        : "—"}
                  </p>
                </div>
              </div>

              <div className="cso-dt-panel-body cso-dt-panel-body--flush">
                {hvError ? (
                  <div className="cso-dt-panel-body">
                    <p className="cso-ql-error">{hvError}</p>
                  </div>
                ) : null}
                <div className="cso-hv-table-wrap">
                  <table className="cso-hv-table">
                    <thead>
                      <tr>
                        <th scope="col">Học viên</th>
                        <th scope="col">Lớp</th>
                        <th scope="col">Ngày còn</th>
                        <th scope="col">Ghi danh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hvLoadingId === selected.id ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="cso-hv-loading">Đang tải…</div>
                          </td>
                        </tr>
                      ) : !selectedHv || selectedHv.rows.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="cso-hv-empty">
                              <strong>Chưa có học viên đang học</strong>
                              Ghi danh ở mục Học viên hoặc sau khi xác nhận học
                              phí.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        selectedHv.rows.map((hv) => (
                          <tr key={hv.hocVienLopId}>
                            <td>
                              <div className="cso-hv-person">
                                <span className="cso-hv-ava" aria-hidden>
                                  {hv.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={hv.avatarUrl} alt="" />
                                  ) : (
                                    initials(hv.tenHienThi)
                                  )}
                                </span>
                                <div>
                                  <p className="cso-hv-name">{hv.tenHienThi}</p>
                                  {hv.slug ? (
                                    <p className="cso-hv-slug">/{hv.slug}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td>
                              <p className="cso-hv-lop">
                                {hv.maLop?.trim() || "Chưa gắn lớp"}
                              </p>
                            </td>
                            <td>
                              {hv.dangFreeze ? (
                                <span className="cso-hv-chip cso-hv-chip--freeze">
                                  Freeze
                                </span>
                              ) : (
                                <div className="cso-hv-days">
                                  <span
                                    className={`cso-hv-days-n${
                                      hv.soNgayConLai <= 0
                                        ? " is-out"
                                        : hv.soNgayConLai <= 7
                                          ? " is-low"
                                          : ""
                                    }`}
                                  >
                                    {hv.soNgayConLai}
                                  </span>
                                  <span className="cso-hv-days-sub">ngày</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <p className="cso-hv-lop">
                                {formatNgay(hv.ngayDangKy.slice(0, 10))}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          <KhoaHocCreateModal
            open={createOpen && !editing}
            orgId={orgId}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              void load();
              void loadLop();
            }}
          />
          <KhoaHocCreateModal
            open={Boolean(editing)}
            orgId={orgId}
            editing={editing}
            onClose={() => setEditing(null)}
            onUpdated={(khoa) => {
              setEditing(null);
              setRows((prev) =>
                prev.map((row) =>
                  row.id === khoa.id ? { ...row, ...khoa } : row,
                ),
              );
              void loadLop();
            }}
          />
      </div>

      <div
        className="cso-lh-tab-pane"
        hidden={tab !== "lop"}
        aria-hidden={tab !== "lop"}
      >
        <LopHocQuanLyPanel
          orgId={orgId}
          orgSlug={orgSlug}
          khoaOptions={khoaOptions}
          khoaFilterId={lopFilterKhoaId}
          onKhoaFilterChange={setLopFilterKhoaId}
          seedRows={lopRows}
          seedCanEdit={lopCanEdit}
          seedReady={!lopLoading}
          onRowsChange={setLopRows}
        />
      </div>
    </div>
  );
}

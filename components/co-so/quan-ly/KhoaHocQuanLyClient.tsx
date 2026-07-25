"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import {
  khoaOptionsFromCards,
  LopHocQuanLyPanel,
} from "@/components/co-so/quan-ly/LopHocQuanLyPanel";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  orgId: string;
  orgSlug: string;
};

type TabId = "khoa" | "lop";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "khoa", label: "Quản lý khóa" },
  { id: "lop", label: "Quản lý lớp học" },
];

const TRANG_THAI_LABEL: Record<string, string> = {
  sap_khai_giang: "Sắp khai giảng",
  dang_mo_don: "Đang mở đơn",
  dang_hoc: "Đang học",
  da_ket_thuc: "Đã kết thúc",
  tam_dung: "Tạm dừng",
};

export function KhoaHocQuanLyClient({ orgId, orgSlug }: Props) {
  const [tab, setTab] = useState<TabId>("khoa");
  const [rows, setRows] = useState<KhoaHocCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaHocCardData | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="cso-lh-page cso-dt-stack">
      <nav className="cso-lh-tabs" aria-label="Khóa và lớp">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`cso-lh-tab${tab === id ? " on" : ""}`}
            aria-current={tab === id ? "true" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "khoa" ? (
        <>
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
                    Đồng bộ tab Khóa học trên trang cơ sở. Mở khóa để quản lớp,
                    giáo trình và bài tập.
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
                      <th scope="col">Lớp / HV</th>
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
                        <td colSpan={5}>
                          <div className="cso-hv-loading">Đang tải…</div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="cso-hv-empty">
                            <strong>Chưa có khóa</strong>
                            Tạo khóa để hiện trên trang công khai và mở lớp học.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((k) => (
                        <tr key={k.id}>
                          <td>
                            <div className="cso-lh-khoa">
                              {k.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  className="cso-lh-thumb"
                                  src={k.thumbnailUrl}
                                  alt=""
                                />
                              ) : (
                                <div
                                  className="cso-lh-thumb cso-lh-thumb--ph"
                                  aria-hidden
                                />
                              )}
                              <div>
                                <p className="cso-hv-name">{k.tenKhoaHoc}</p>
                                <p className="cso-hv-slug">/{k.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="cso-hv-course">{k.soLopMo} lớp</p>
                            <p className="cso-hv-lop">{k.soHocVien} học viên</p>
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
                            <div className="cso-hv-actions">
                              <Link
                                href={coSoKhoaHocDetailPath(orgSlug, k.slug)}
                                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                              >
                                Mở
                              </Link>
                              <button
                                type="button"
                                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                onClick={() => {
                                  setCreateOpen(false);
                                  setEditing(k);
                                }}
                              >
                                Sửa
                              </button>
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

          <KhoaHocCreateModal
            open={createOpen && !editing}
            orgId={orgId}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              void load();
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
            }}
          />
        </>
      ) : (
        <LopHocQuanLyPanel
          orgId={orgId}
          orgSlug={orgSlug}
          khoaOptions={khoaOptions}
        />
      )}
    </div>
  );
}

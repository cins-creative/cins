"use client";



import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";



import {
  adminCountMonThiCauHinhUsage,
  adminDeleteMonThi,
} from "@/app/admin/actions";

import { AdminMonThiEditPanel } from "@/components/admin/AdminMonThiEditPanel";

import { AdminMonThiThumb } from "@/components/admin/AdminMonThiThumb";

import { AdminSlideOver } from "@/components/admin/AdminSlideOver";

import {

  distinctMonThiLoai,

  labelMonThiLoai,

} from "@/lib/truong/mon-thi-catalog";

import { hasAdminMonThiRealThumb } from "@/lib/admin/mon-thi-display";

import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";



type Props = {

  initialRows: AdminMonThiRow[];

};



type PanelState =

  | { mode: "closed" }

  | { mode: "create" }

  | { mode: "edit"; row: AdminMonThiRow };



export function AdminMonThiScreen({ initialRows }: Props) {

  const router = useRouter();

  const [rows, setRows] = useState(initialRows);

  const [q, setQ] = useState("");

  const [loaiFilter, setLoaiFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [deleteErr, setDeleteErr] = useState<string | null>(null);



  useEffect(() => {

    setRows(initialRows);

  }, [initialRows]);



  const loaiOptions = useMemo(() => distinctMonThiLoai(rows), [rows]);



  function patchRowThumbnail(id: string, thumbnail_id: string) {

    setRows((prev) =>

      prev.map((r) => (r.id === id ? { ...r, thumbnail_id } : r)),

    );

  }



  const filtered = useMemo(() => {

    const needle = q.trim().toLowerCase();

    return rows.filter((r) => {

      if (loaiFilter === "__khac__") {

        if (r.loai?.trim()) return false;

      } else if (loaiFilter && (r.loai ?? "") !== loaiFilter) return false;

      if (statusFilter && (r.trang_thai ?? "") !== statusFilter) return false;

      if (!needle) return true;

      const hay = [r.ten, r.ma, r.id, r.thumbnail_id, r.id_bai_viet]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      return hay.includes(needle);

    });

  }, [rows, q, loaiFilter, statusFilter]);



  const stats = useMemo(() => {

    const byLoai = new Map<string, number>();

    let active = 0;

    let realThumb = 0;

    for (const r of rows) {

      const k = r.loai?.trim() || "__khac__";

      byLoai.set(k, (byLoai.get(k) ?? 0) + 1);

      if (r.trang_thai === "active") active += 1;

      if (hasAdminMonThiRealThumb(r)) realThumb += 1;

    }

    return { total: rows.length, byLoai, active, realThumb };

  }, [rows]);



  const statusOptions = useMemo(() => {

    const set = new Set<string>();

    for (const r of rows) {

      if (r.trang_thai?.trim()) set.add(r.trang_thai.trim());

    }

    return [...set].sort();

  }, [rows]);



  async function onDeleteRow(r: AdminMonThiRow) {
    setDeleteErr(null);

    const usage = await adminCountMonThiCauHinhUsage(r.id);
    if (!usage.ok) {
      const msg = usage.message ?? "Không kiểm tra được liên kết cấu hình.";
      setDeleteErr(msg);
      window.alert(msg);
      return;
    }

    const refLine =
      usage.count > 0
        ? `\n\nSẽ gỡ ${usage.count} liên kết cấu hình tính điểm trường (org_cau_hinh_mon) trước khi xóa môn.`
        : "";

    const ok = window.confirm(
      `Xóa môn "${r.ten}"?${refLine}\n\nHành động không hoàn tác.`,
    );
    if (!ok) return;

    setDeletingId(r.id);
    try {
      const res = await adminDeleteMonThi(r.id);
      if (!res.ok) {
        const msg = res.message ?? "Xóa thất bại.";
        setDeleteErr(msg);
        window.alert(msg);
        return;
      }

      setRows((prev) => prev.filter((x) => x.id !== r.id));
      if (panel.mode === "edit" && panel.row.id === r.id) {
        setPanel({ mode: "closed" });
      }
      if (res.unlinkedCauHinhMon > 0) {
        setDeleteErr(null);
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi khi gọi server.";
      setDeleteErr(msg);
      window.alert(msg);
    } finally {
      setDeletingId(null);
    }
  }



  const slideOpen = panel.mode !== "closed";

  const slideTitle =

    panel.mode === "create"

      ? "Thêm môn thi"

      : panel.mode === "edit"

        ? `Sửa: ${panel.row.ten}`

        : "Môn thi";



  return (

    <>

      <header className="page-header">

        <h1 className="page-title">Môn thi đại học</h1>

        <div className="page-header-actions">

          <button

            type="button"

            className="btn btn-ghost"

            onClick={() => router.refresh()}

          >

            Refresh

          </button>

          <button

            type="button"

            className="btn btn-primary"

            onClick={() => setPanel({ mode: "create" })}

          >

            + Thêm môn

          </button>

        </div>

      </header>



      <div className="page-body">

        {deleteErr ? (

          <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">

            {deleteErr}

          </p>

        ) : null}



        <div className="stats-grid admin-mon-thi-stats">

          <div className="stat-card">

            <div className="stat-label">Tổng môn</div>

            <div className="stat-value">{stats.total}</div>

          </div>

          <div className="stat-card">

            <div className="stat-label">Đang active</div>

            <div className="stat-value">{stats.active}</div>

          </div>

          <div className="stat-card">

            <div className="stat-label">Ảnh thật (CF)</div>

            <div className="stat-value">{stats.realThumb}</div>

          </div>

          {[...stats.byLoai.entries()].map(([k, n]) => (

            <div key={k} className="stat-card">

              <div className="stat-label">

                {k === "__khac__" ? "Khác" : labelMonThiLoai(k)}

              </div>

              <div className="stat-value">{n}</div>

            </div>

          ))}

        </div>



        <div className="admin-toolbar">

          <div className="filter-bar">

            <div className="filter-search">

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                <circle cx="11" cy="11" r="8" />

                <line x1="21" y1="21" x2="16.65" y2="16.65" />

              </svg>

              <input

                type="search"

                placeholder="Tìm tên, mã, id…"

                value={q}

                onChange={(e) => setQ(e.target.value)}

              />

            </div>

            <select

              className="filter-select"

              value={loaiFilter}

              onChange={(e) => setLoaiFilter(e.target.value)}

              aria-label="Lọc loại môn"

            >

              <option value="">Tất cả loại</option>

              {loaiOptions.map((k) => (

                <option key={k} value={k}>

                  {k === "__khac__" ? "Khác / chưa gán loại" : labelMonThiLoai(k)}

                </option>

              ))}

            </select>

            <select

              className="filter-select"

              value={statusFilter}

              onChange={(e) => setStatusFilter(e.target.value)}

              aria-label="Lọc trạng thái"

            >

              <option value="">Tất cả trạng thái</option>

              {statusOptions.map((s) => (

                <option key={s} value={s}>

                  {s}

                </option>

              ))}

            </select>

          </div>

        </div>



        <div className="table-wrap">

          <table className="admin-mon-thi-table">

            <thead>

              <tr>

                <th>Ảnh</th>

                <th>Tên</th>

                <th>Mã</th>

                <th>Loại</th>

                <th>Trạng thái</th>

                <th>Bài viết</th>

                <th />

              </tr>

            </thead>

            <tbody>

              {filtered.length === 0 ? (

                <tr>

                  <td colSpan={7} className="admin-table-empty">

                    Không có môn thi phù hợp bộ lọc.

                  </td>

                </tr>

              ) : (

                filtered.map((r) => (

                  <tr

                    key={r.id}

                    className="admin-table-row--clickable"

                    onClick={() => setPanel({ mode: "edit", row: r })}

                  >

                    <td className="cell-thumb" onClick={(e) => e.stopPropagation()}>

                      <AdminMonThiThumb

                        row={r}

                        onThumbnailChange={(thumbnail_id) =>

                          patchRowThumbnail(r.id, thumbnail_id)

                        }

                      />

                    </td>

                    <td className="cell-title">{r.ten}</td>

                    <td className="cell-mono">{r.ma ?? "—"}</td>

                    <td>{r.loai ? labelMonThiLoai(r.loai) : "—"}</td>

                    <td>

                      <span

                        className={`admin-pill admin-pill--${r.trang_thai === "active" ? "ok" : "muted"}`}

                      >

                        {r.trang_thai ?? "—"}

                      </span>

                    </td>

                    <td className="cell-mono admin-cell-preview">

                      {r.id_bai_viet ? `${r.id_bai_viet.slice(0, 8)}…` : "—"}

                    </td>

                    <td onClick={(e) => e.stopPropagation()}>

                      <div className="row-actions">

                        <button

                          type="button"

                          className="action-btn edit"

                          onClick={() => setPanel({ mode: "edit", row: r })}

                        >

                          ✏ Sửa

                        </button>

                        <button

                          type="button"

                          className="action-btn danger"

                          disabled={deletingId === r.id}

                          onClick={() => void onDeleteRow(r)}

                        >

                          {deletingId === r.id ? "Đang xóa…" : "🗑 Xóa"}

                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

        <p className="form-hint" style={{ marginTop: 12 }}>

          Hiển thị {filtered.length} / {rows.length} môn

        </p>

      </div>



      <AdminSlideOver

        open={slideOpen}

        title={slideTitle}

        onClose={() => setPanel({ mode: "closed" })}

      >

        {slideOpen ? (

          <AdminMonThiEditPanel

            row={panel.mode === "edit" ? panel.row : undefined}

            onCancel={() => setPanel({ mode: "closed" })}

            onSaved={() => {

              router.refresh();

              setPanel({ mode: "closed" });

            }}

          />

        ) : null}

      </AdminSlideOver>

    </>

  );

}


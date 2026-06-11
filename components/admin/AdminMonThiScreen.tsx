"use client";



import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";



import {
  adminCountMonThiCauHinhUsage,
  adminDeleteMonThi,
} from "@/app/admin/actions";

import { AdminKhoiThiTab } from "@/components/admin/AdminKhoiThiTab";

import { AdminMonThiEditPanel } from "@/components/admin/AdminMonThiEditPanel";

import { AdminMonThiThumb } from "@/components/admin/AdminMonThiThumb";

import { AdminSlideOver } from "@/components/admin/AdminSlideOver";

import { AdminMonThiQuickFilter, matchesAdminMonThiQuickFilter } from "@/components/admin/AdminMonThiQuickFilter";

import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";

import type { AdminToHopMonRow } from "@/lib/admin/to-hop-mon-server";

import { khoiThiContainingMonId } from "@/lib/admin/to-hop-mon-display";
import { labelMonThiLoai } from "@/lib/truong/mon-thi-catalog";



type AdminMonThiTabId = "mon" | "khoi";



type Props = {

  initialRows: AdminMonThiRow[];

  initialKhoiRows: AdminToHopMonRow[];

};



type PanelState =

  | { mode: "closed" }

  | { mode: "create" }

  | { mode: "edit"; row: AdminMonThiRow };



export function AdminMonThiScreen({ initialRows, initialKhoiRows }: Props) {

  const router = useRouter();

  const [tab, setTab] = useState<AdminMonThiTabId>("mon");

  const [rows, setRows] = useState(initialRows);

  const [q, setQ] = useState("");
  const [quickFilter, setQuickFilter] = useState("");

  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [deleteErr, setDeleteErr] = useState<string | null>(null);



  useEffect(() => {

    setRows(initialRows);

  }, [initialRows]);

  useEffect(() => {

    if (tab === "khoi" && panel.mode !== "closed") {

      setPanel({ mode: "closed" });

    }

  }, [tab, panel.mode]);



  function goToKhoiTab() {

    setPanel({ mode: "closed" });

    setTab("khoi");

  }



  const khoiForEditingMon = useMemo(() => {

    if (panel.mode !== "edit") return [];

    return khoiThiContainingMonId(initialKhoiRows, panel.row.id);

  }, [panel, initialKhoiRows]);



  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesAdminMonThiQuickFilter(r, quickFilter)) return false;
      if (!needle) return true;
      const hay = [r.ten, r.ma, r.id, r.thumbnail_id, r.id_bai_viet]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, quickFilter]);

  function patchRowThumbnail(
    id: string,
    thumbnail_id: string,
    thumbnail_url: string,
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              thumbnail_id,
              thumbnail_src: thumbnail_url,
              thumbnail_from_cover: false,
            }
          : r,
      ),
    );
  }

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

        <h1 className="page-title">Môn thi &amp; khối thi đại học</h1>

        <div className="page-header-actions">

          <button

            type="button"

            className="btn btn-ghost"

            onClick={() => router.refresh()}

          >

            Refresh

          </button>

          {tab === "mon" ? (

            <button

              type="button"

              className="btn btn-primary"

              onClick={() => setPanel({ mode: "create" })}

            >

              + Thêm môn

            </button>

          ) : null}

        </div>

      </header>



      <div className="page-body">

        <div className="tab-nav admin-mon-thi-tabs" role="tablist" aria-label="Quản lý môn và khối thi">

          <button

            type="button"

            role="tab"

            aria-selected={tab === "mon"}

            className={`tab-btn${tab === "mon" ? " active" : ""}`}

            onClick={() => setTab("mon")}

          >

            Môn thi ({rows.length})

          </button>

          <button

            type="button"

            role="tab"

            aria-selected={tab === "khoi"}

            className={`tab-btn${tab === "khoi" ? " active" : ""}`}

            onClick={() => setTab("khoi")}

          >

            Khối thi ({initialKhoiRows.length})

          </button>

        </div>



        {tab === "khoi" ? (

          <AdminKhoiThiTab

            initialRows={initialKhoiRows}

            monCatalog={rows}

          />

        ) : null}



        {tab === "mon" && deleteErr ? (

          <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">

            {deleteErr}

          </p>

        ) : null}



        {tab === "mon" ? (

        <>

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
            <AdminMonThiQuickFilter
              rows={rows}
              value={quickFilter}
              onChange={setQuickFilter}
            />
            <span className="filter-count">
              {filtered.length} / {rows.length}
            </span>
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

                        onThumbnailChange={({ thumbnail_id, thumbnail_url }) =>
                          patchRowThumbnail(r.id, thumbnail_id, thumbnail_url)
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

        </>

        ) : null}

      </div>



      <AdminSlideOver

        open={slideOpen}

        title={slideTitle}

        onClose={() => setPanel({ mode: "closed" })}

      >

        {slideOpen ? (

          <AdminMonThiEditPanel

            row={panel.mode === "edit" ? panel.row : undefined}

            khoiForMon={panel.mode === "edit" ? khoiForEditingMon : []}

            onGoToKhoiTab={goToKhoiTab}

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


"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  adminDeleteLinhVuc,
  adminDeleteLinhVucNhom,
} from "@/app/admin/actions";
import { AdminLinhVucEditPanel } from "@/components/admin/AdminLinhVucEditPanel";
import { AdminLinhVucNhomEditPanel } from "@/components/admin/AdminLinhVucNhomEditPanel";
import { AdminLinhVucThumb } from "@/components/admin/AdminLinhVucThumb";
import { AdminSlideOver } from "@/components/admin/AdminSlideOver";
import type {
  AdminLinhVucNhomRow,
  AdminLinhVucRow,
} from "@/lib/admin/linh-vuc-server";

type TabId = "linh-vuc" | "nhom";

type Props = {
  initialRows: AdminLinhVucRow[];
  initialNhomRows: AdminLinhVucNhomRow[];
};

type LvPanel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: AdminLinhVucRow };

type NhomPanel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: AdminLinhVucNhomRow };

export function AdminLinhVucScreen({
  initialRows,
  initialNhomRows,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("linh-vuc");
  const [rows, setRows] = useState(initialRows);
  const [nhomRows, setNhomRows] = useState(initialNhomRows);
  const [q, setQ] = useState("");
  const [lvPanel, setLvPanel] = useState<LvPanel>({ mode: "closed" });
  const [nhomPanel, setNhomPanel] = useState<NhomPanel>({ mode: "closed" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    setNhomRows(initialNhomRows);
  }, [initialNhomRows]);

  useEffect(() => {
    setLvPanel({ mode: "closed" });
    setNhomPanel({ mode: "closed" });
    setErr(null);
  }, [tab]);

  const filteredLv = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [
        r.ten,
        r.ten_eng,
        r.slug,
        r.nhom_chinh?.nhom_ten,
        ...r.nhoms.map((n) => n.nhom_ten),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const filteredNhom = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return nhomRows;
    return nhomRows.filter((r) => {
      const hay = [r.ten, r.ten_eng, r.slug].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [nhomRows, q]);

  async function onDeleteLv(r: AdminLinhVucRow) {
    setErr(null);
    if (
      !window.confirm(
        `Xóa lĩnh vực 「${r.ten}」? Không thể hoàn tác nếu không còn tham chiếu.`,
      )
    ) {
      return;
    }
    setBusyId(r.id);
    const res = await adminDeleteLinhVuc(r.id);
    setBusyId(null);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    setLvPanel({ mode: "closed" });
    router.refresh();
  }

  async function onDeleteNhom(r: AdminLinhVucNhomRow) {
    setErr(null);
    if (
      !window.confirm(
        `Xóa nhóm 「${r.ten}」? Các gắn lĩnh vực thuộc nhóm này cũng sẽ bị gỡ.`,
      )
    ) {
      return;
    }
    setBusyId(r.id);
    const res = await adminDeleteLinhVucNhom(r.id);
    setBusyId(null);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    setNhomPanel({ mode: "closed" });
    router.refresh();
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Lĩnh vực</h1>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
          {tab === "linh-vuc" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setLvPanel({ mode: "create" })}
            >
              + Thêm lĩnh vực
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setNhomPanel({ mode: "create" })}
            >
              + Thêm nhóm
            </button>
          )}
        </div>
      </header>

      <div className="page-body admin-linh-vuc-page">
        <div
          className="tab-nav admin-mon-thi-tabs"
          role="tablist"
          aria-label="Lĩnh vực và nhóm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "linh-vuc"}
            className={`tab-btn${tab === "linh-vuc" ? " active" : ""}`}
            onClick={() => setTab("linh-vuc")}
          >
            Lĩnh vực ({rows.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "nhom"}
            className={`tab-btn${tab === "nhom" ? " active" : ""}`}
            onClick={() => setTab("nhom")}
          >
            Nhóm ({nhomRows.length})
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="filter-bar">
            <div className="filter-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder={
                  tab === "linh-vuc"
                    ? "Tìm tên, slug, nhóm…"
                    : "Tìm tên nhóm, slug…"
                }
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <span className="filter-count">
              {tab === "linh-vuc"
                ? `${filteredLv.length} / ${rows.length}`
                : `${filteredNhom.length} / ${nhomRows.length}`}
            </span>
          </div>
        </div>

      {err ? (
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {err}
        </p>
      ) : null}

      {tab === "linh-vuc" ? (
        <div className="table-wrap">
          <table className="admin-table admin-linh-vuc-table">
            <thead>
              <tr>
                <th className="col-thumb" />
                <th>Tên</th>
                <th>Slug</th>
                <th>Nhóm</th>
                <th>Thứ tự</th>
                <th>TT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredLv.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    Không có lĩnh vực nào.
                  </td>
                </tr>
              ) : (
                filteredLv.map((r, index) => (
                  <tr key={r.id}>
                    <td className="cell-thumb" onClick={(e) => e.stopPropagation()}>
                      <AdminLinhVucThumb
                        id={r.id}
                        ten={r.ten}
                        thumbnailSrc={r.thumbnail_src}
                        priority={index < 8}
                        onThumbnailChange={({ thumbnail_id, thumbnail_url }) => {
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    thumbnail_id,
                                    thumbnail_src: thumbnail_url,
                                  }
                                : x,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <strong>{r.ten}</strong>
                      {r.ten_eng ? (
                        <div className="admin-table-sub">{r.ten_eng}</div>
                      ) : null}
                    </td>
                    <td>
                      <code>{r.slug}</code>
                    </td>
                    <td>
                      {r.nhoms.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <span className="admin-linh-vuc-nhom-tags">
                          {r.nhoms.map((n) => (
                            <span
                              key={n.id_nhom}
                              className={`admin-pill${n.la_chinh ? " admin-pill--chinh" : ""}`}
                            >
                              {n.nhom_ten}
                              {n.la_chinh ? " · chính" : ""}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>{r.thu_tu}</td>
                    <td>
                      <span
                        className={`admin-pill admin-pill--status admin-pill--status-${r.trang_thai}`}
                      >
                        {r.trang_thai === "active" ? "Active" : r.trang_thai}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setLvPanel({ mode: "edit", row: r })}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-danger"
                        disabled={busyId === r.id}
                        onClick={() => void onDeleteLv(r)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table admin-linh-vuc-table">
            <thead>
              <tr>
                <th>Tên nhóm</th>
                <th>Slug</th>
                <th>Lĩnh vực</th>
                <th>Thứ tự</th>
                <th>TT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredNhom.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    Chưa có nhóm — thêm để gắn nhiều lĩnh vực (vd. Thị giác +
                    Lập trình).
                  </td>
                </tr>
              ) : (
                filteredNhom.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.ten}</strong>
                      {r.ten_eng ? (
                        <div className="admin-table-sub">{r.ten_eng}</div>
                      ) : null}
                    </td>
                    <td>
                      <code>{r.slug}</code>
                    </td>
                    <td>{r.so_linh_vuc}</td>
                    <td>{r.thu_tu}</td>
                    <td>
                      <span
                        className={`admin-pill admin-pill--status admin-pill--status-${r.trang_thai}`}
                      >
                        {r.trang_thai === "active" ? "Active" : r.trang_thai}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setNhomPanel({ mode: "edit", row: r })}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-danger"
                        disabled={busyId === r.id}
                        onClick={() => void onDeleteNhom(r)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdminSlideOver
        open={lvPanel.mode !== "closed"}
        title={
          lvPanel.mode === "create"
            ? "Thêm lĩnh vực"
            : lvPanel.mode === "edit"
              ? `Sửa · ${lvPanel.row.ten}`
              : ""
        }
        onClose={() => setLvPanel({ mode: "closed" })}
      >
        {lvPanel.mode !== "closed" ? (
          <AdminLinhVucEditPanel
            row={lvPanel.mode === "edit" ? lvPanel.row : undefined}
            nhomCatalog={nhomRows}
            onCancel={() => setLvPanel({ mode: "closed" })}
            onSaved={() => {
              setLvPanel({ mode: "closed" });
              router.refresh();
            }}
          />
        ) : null}
      </AdminSlideOver>

      <AdminSlideOver
        open={nhomPanel.mode !== "closed"}
        title={
          nhomPanel.mode === "create"
            ? "Thêm nhóm lĩnh vực"
            : nhomPanel.mode === "edit"
              ? `Sửa nhóm · ${nhomPanel.row.ten}`
              : ""
        }
        onClose={() => setNhomPanel({ mode: "closed" })}
      >
        {nhomPanel.mode !== "closed" ? (
          <AdminLinhVucNhomEditPanel
            row={nhomPanel.mode === "edit" ? nhomPanel.row : undefined}
            onCancel={() => setNhomPanel({ mode: "closed" })}
            onSaved={() => {
              setNhomPanel({ mode: "closed" });
              router.refresh();
            }}
          />
        ) : null}
      </AdminSlideOver>
      </div>
    </>
  );
}

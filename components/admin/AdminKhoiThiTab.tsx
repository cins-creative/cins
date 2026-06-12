"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { adminDeleteToHopMon } from "@/app/admin/actions";
import { AdminSlideOver } from "@/components/admin/AdminSlideOver";
import { AdminToHopMonEditPanel } from "@/components/admin/AdminToHopMonEditPanel";
import type { AdminMonThiRow } from "@/lib/admin/mon-thi-server";
import type { AdminToHopMonRow } from "@/lib/admin/to-hop-mon-server";

type Props = {
  initialRows: AdminToHopMonRow[];
  monCatalog: AdminMonThiRow[];
};

type PanelState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: AdminToHopMonRow };

export function AdminKhoiThiTab({ initialRows, monCatalog }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [
        r.ma_to_hop,
        r.ten_to_hop,
        r.mo_ta,
        r.mon_ten_list.join(" "),
        r.cac_mon.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const stats = useMemo(() => {
    let inUse = 0;
    let totalMonSlots = 0;
    for (const r of rows) {
      if (r.usage_khoi > 0) inUse += 1;
      totalMonSlots += r.chi_tiet.length;
    }
    return { total: rows.length, inUse, totalMonSlots };
  }, [rows]);

  async function onDeleteRow(r: AdminToHopMonRow) {
    setDeleteErr(null);
    const refLine =
      r.usage_khoi > 0
        ? `\n\nKhối đang được ${r.usage_khoi} cấu hình trường sử dụng — không thể xóa.`
        : "";
    const ok = window.confirm(
      `Xóa khối "${r.ma_to_hop}" (${r.ten_to_hop})?${refLine}\n\nHành động không hoàn tác.`,
    );
    if (!ok) return;
    if (r.usage_khoi > 0) return;

    setDeletingId(r.id);
    try {
      const res = await adminDeleteToHopMon(r.id);
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
      ? "Thêm khối thi"
      : panel.mode === "edit"
        ? `Sửa: ${panel.row.ma_to_hop}`
        : "Khối thi";

  return (
    <>
      {deleteErr ? (
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {deleteErr}
        </p>
      ) : null}

      <div className="stats-grid admin-mon-thi-stats">
        <div className="stat-card">
          <div className="stat-label">Tổng khối</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trường đang dùng</div>
          <div className="stat-value">{stats.inUse}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tổng slot môn</div>
          <div className="stat-value">{stats.totalMonSlots}</div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar__row">
          <div className="filter-search filter-search--toolbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Tìm mã khối, tên, môn…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPanel({ mode: "create" })}
          >
            + Thêm khối
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="admin-khoi-thi-table">
          <thead>
            <tr>
              <th>Mã khối</th>
              <th>Tên khối</th>
              <th>Môn / slot</th>
              <th>Slot</th>
              <th>Trường dùng</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
                  {rows.length === 0
                    ? "Chưa có khối thi — thêm A00, A01, B00…"
                    : "Không có khối phù hợp bộ lọc."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="admin-table-row--clickable"
                  onClick={() => setPanel({ mode: "edit", row: r })}
                >
                  <td className="cell-mono admin-khoi-ma">{r.ma_to_hop}</td>
                  <td className="cell-title">
                    {r.ten_to_hop}
                    {r.mo_ta ? <small>{r.mo_ta}</small> : null}
                  </td>
                  <td className="admin-khoi-mon-list">
                    {r.chi_tiet.length > 0 ? (
                      <div className="admin-khoi-mon-chips">
                        {r.chi_tiet.map((slot, i) => (
                          <span
                            key={slot.id}
                            className={`admin-khoi-mon-chip${slot.id_mon_thi ? "" : " is-slot-label"}`}
                            title={
                              slot.id_mon_thi
                                ? undefined
                                : "Nhãn slot — chưa gắn môn trong danh mục edu_mon_thi"
                            }
                          >
                            {r.mon_ten_list[i] ?? slot.ten_slot}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="cell-num">{r.chi_tiet.length}</td>
                  <td className="cell-num">
                    {r.usage_khoi > 0 ? (
                      <span className="admin-pill admin-pill--ok">
                        {r.usage_khoi}
                      </span>
                    ) : (
                      "0"
                    )}
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
                        disabled={deletingId === r.id || r.usage_khoi > 0}
                        title={
                          r.usage_khoi > 0
                            ? "Khối đang được trường sử dụng"
                            : undefined
                        }
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
        Hiển thị {filtered.length} / {rows.length} khối · Một môn có thể nằm trong
        nhiều khối (vd. Toán trong A00 và A01).
      </p>

      <AdminSlideOver
        open={slideOpen}
        title={slideTitle}
        onClose={() => setPanel({ mode: "closed" })}
      >
        {slideOpen ? (
          <AdminToHopMonEditPanel
            row={panel.mode === "edit" ? panel.row : undefined}
            monCatalog={monCatalog}
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Lop = { id: string; maLop: string; tenKhoa: string };
type Slot = {
  userId: string;
  tenHienThi: string;
  coMat: boolean | null;
  ghiChu: string | null;
};

type Props = { orgId: string };

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function DiemDanhQuanLyClient({ orgId }: Props) {
  const [lop, setLop] = useState<Lop[]>([]);
  const [lopId, setLopId] = useState("");
  const [ngay, setNgay] = useState(todayLocal);
  const [rows, setRows] = useState<Slot[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const res = await fetch(`/api/academy/${orgId}/attendance`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Không tải danh sách lớp.");
    const list = (data.lop ?? []) as Lop[];
    setLop(list);
    setCanEdit(Boolean(data.canEdit));
    setLopId((prev) => prev || list[0]?.id || "");
  }, [orgId]);

  const loadNgay = useCallback(async () => {
    if (!lopId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ lopId, ngay });
      const res = await fetch(`/api/academy/${orgId}/attendance?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải điểm danh.");
      setRows(data.rows ?? []);
      setCanEdit(Boolean(data.canEdit));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId, lopId, ngay]);

  useEffect(() => {
    void loadMeta().catch((e) =>
      setError(e instanceof Error ? e.message : "Lỗi."),
    );
  }, [loadMeta]);

  useEffect(() => {
    void loadNgay();
  }, [loadNgay]);

  function setCoMat(userId: string, coMat: boolean) {
    setRows((prev) =>
      prev.map((r) => (r.userId === userId ? { ...r, coMat } : r)),
    );
  }

  function markAll(coMat: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, coMat })));
  }

  async function save() {
    if (!lopId || !canEdit) return;
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      const res = await fetch(`/api/academy/${orgId}/attendance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lopId,
          ngay,
          marks: rows.map((r) => ({
            userId: r.userId,
            coMat: r.coMat !== false,
            ghiChu: r.ghiChu,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu.");
      setFlash("Đã lưu điểm danh.");
      await loadNgay();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    let co = 0;
    let vang = 0;
    for (const r of rows) {
      if (r.coMat === false) vang += 1;
      else co += 1;
    }
    return { co, vang, total: rows.length };
  }, [rows]);

  const selectedLop = lop.find((l) => l.id === lopId);

  return (
    <div className="cso-dd cso-dt-stack">
      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <h2 className="cso-dt-panel-title">Điểm danh</h2>
          <p className="cso-dt-panel-sub">
            Chọn lớp và ngày, đánh dấu có mặt / vắng rồi lưu sổ.
          </p>
        </div>
        <div className="cso-dt-panel-body">
          <div className="cso-dd-toolbar">
            <fieldset className="cso-ql-fieldset cso-dd-toolbar-context">
              <legend className="cso-ql-fieldset-legend">Buổi học</legend>
              <div className="cso-ql-fieldset-row">
                <label className="cso-ql-field cso-dd-field">
                  <span className="cso-ql-label">Lớp</span>
                  <select
                    className="cso-ql-select"
                    value={lopId}
                    onChange={(e) => setLopId(e.target.value)}
                  >
                    {lop.length === 0 ? (
                      <option value="">Chưa có lớp</option>
                    ) : (
                      lop.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.tenKhoa} · {l.maLop}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="cso-ql-field cso-dd-field cso-dd-field--date">
                  <span className="cso-ql-label">Ngày</span>
                  <input
                    type="date"
                    className="cso-ql-input"
                    value={ngay}
                    onChange={(e) => setNgay(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            {canEdit ? (
              <fieldset className="cso-ql-fieldset cso-dd-toolbar-actions">
                <legend className="cso-ql-fieldset-legend">Hành động</legend>
                <div className="cso-dd-actions-row">
                  {rows.length > 0 ? (
                    <div className="cso-dd-bulk">
                      <button
                        type="button"
                        className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                        onClick={() => markAll(true)}
                      >
                        Tất cả có mặt
                      </button>
                      <button
                        type="button"
                        className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                        onClick={() => markAll(false)}
                      >
                        Tất cả vắng
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy || !lopId || rows.length === 0}
                    className="cso-ql-btn cso-ql-btn--primary cso-dd-save"
                    onClick={() => void save()}
                  >
                    {busy ? "Đang lưu…" : "Lưu điểm danh"}
                  </button>
                </div>
              </fieldset>
            ) : null}
          </div>

          {selectedLop && rows.length > 0 ? (
            <div className="cso-dd-summary" aria-live="polite">
              <span>
                <strong>{counts.co}</strong> có mặt
              </span>
              <span className="cso-dd-summary-sep" aria-hidden>
                ·
              </span>
              <span>
                <strong>{counts.vang}</strong> vắng
              </span>
              <span className="cso-dd-summary-sep" aria-hidden>
                ·
              </span>
              <span className="cso-dd-summary-muted">
                {counts.total} học viên
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <h3 className="cso-dt-panel-title">Danh sách buổi học</h3>
          <p className="cso-dt-panel-sub">
            {selectedLop
              ? `${selectedLop.tenKhoa} · ${selectedLop.maLop} · ${ngay}`
              : "Chọn lớp để xem sổ điểm danh."}
          </p>
        </div>
        <div className="cso-dt-panel-body cso-dt-panel-body--flush">
          <div className="cso-hv-table-wrap">
            <table className="cso-hv-table">
              <thead>
                <tr>
                  <th scope="col">Học viên</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2}>
                      <div className="cso-hv-loading">Đang tải…</div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <div className="cso-hv-empty">
                        <strong>Chưa có học viên</strong>
                        {lopId
                          ? "Lớp này chưa có học viên ghi danh."
                          : "Tạo lớp trên trang khóa rồi quay lại."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const present = r.coMat !== false;
                    return (
                      <tr key={r.userId}>
                        <td>
                          <div className="cso-hv-person">
                            <div className="cso-hv-ava" aria-hidden>
                              {initials(r.tenHienThi)}
                            </div>
                            <p className="cso-hv-name">{r.tenHienThi}</p>
                          </div>
                        </td>
                        <td>
                          <div
                            className="cso-dd-toggle"
                            role="group"
                            aria-label={`Điểm danh ${r.tenHienThi}`}
                          >
                            <button
                              type="button"
                              disabled={!canEdit}
                              className={`cso-dd-mark${present ? " is-on is-present" : ""}`}
                              onClick={() => setCoMat(r.userId, true)}
                            >
                              Có mặt
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              className={`cso-dd-mark${!present ? " is-on is-absent" : ""}`}
                              onClick={() => setCoMat(r.userId, false)}
                            >
                              Vắng
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
    </div>
  );
}

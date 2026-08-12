"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminSlideOver } from "@/components/admin/AdminSlideOver";
import type { AdminShopDanhMucRow } from "@/lib/admin/shop-danh-muc-server";

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; row: AdminShopDanhMucRow };

type FormState = {
  ten: string;
  slug: string;
  moTa: string;
  thuTu: string;
  trangThai: "hien" | "an";
};

function emptyForm(): FormState {
  return {
    ten: "",
    slug: "",
    moTa: "",
    thuTu: "100",
    trangThai: "hien",
  };
}

function formFromRow(row: AdminShopDanhMucRow): FormState {
  return {
    ten: row.ten,
    slug: row.slug,
    moTa: row.moTa ?? "",
    thuTu: String(row.thuTu),
    trangThai: row.trangThai,
  };
}

type HangChoAlias = {
  tuKhoa: string;
  idDanhMuc: string;
  tenDanhMuc: string;
  soShop: number;
  soNhom: number;
};

type HangChoYeuCau = {
  id: string;
  idNhom: string;
  nhanNhom: string | null;
  tuKhoaChuan: string;
  moTa: string;
  tenDanhMucGanNhat: string | null;
  soShopCungCum: number;
};

type Props = {
  initialRows: AdminShopDanhMucRow[];
};

export function AdminShopDanhMucScreen({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [filterTt, setFilterTt] = useState<"all" | "hien" | "an">("all");
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aliasCho, setAliasCho] = useState<HangChoAlias[]>([]);
  const [yeuCauCho, setYeuCauCho] = useState<HangChoYeuCau[]>([]);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (panel.mode === "create") setForm(emptyForm());
    if (panel.mode === "edit") setForm(formFromRow(panel.row));
    setErr(null);
  }, [panel]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterTt !== "all" && r.trangThai !== filterTt) return false;
      if (!needle) return true;
      const hay = [r.ten, r.slug, r.moTa ?? ""].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, filterTt]);

  const refreshHangCho = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho");
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        alias?: HangChoAlias[];
        yeuCau?: HangChoYeuCau[];
      } | null;
      if (res.ok && json?.ok) {
        setAliasCho(json.alias ?? []);
        setYeuCauCho(json.yeuCau ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshHangCho();
  }, [refreshHangCho]);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc?nganhHang=merch");
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        rows?: AdminShopDanhMucRow[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.rows) {
        setErr(json?.error ?? "Không tải lại được danh mục.");
        return;
      }
      setRows(json.rows);
    } catch {
      setErr("Không tải lại được danh mục.");
    }
  }, []);

  async function onSave() {
    setBusy(true);
    setErr(null);
    const thuTu = Number.parseInt(form.thuTu, 10);
    const payload = {
      ten: form.ten,
      slug: form.slug.trim() || undefined,
      moTa: form.moTa.trim() || null,
      thuTu: Number.isFinite(thuTu) ? thuTu : 100,
      trangThai: form.trangThai,
    };

    try {
      if (panel.mode === "create") {
        const res = await fetch("/api/admin/shop/danh-muc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, nganhHang: "merch" }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          row?: AdminShopDanhMucRow;
          error?: string;
        } | null;
        if (!res.ok || !json?.ok || !json.row) {
          setErr(json?.error ?? "Không tạo được.");
          return;
        }
        setRows((prev) =>
          [...prev, json.row!].sort(
            (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
          ),
        );
        setPanel({ mode: "closed" });
        return;
      }

      if (panel.mode === "edit") {
        const res = await fetch(
          `/api/admin/shop/danh-muc/${encodeURIComponent(panel.row.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          row?: AdminShopDanhMucRow;
          error?: string;
        } | null;
        if (!res.ok || !json?.ok || !json.row) {
          setErr(json?.error ?? "Không lưu được.");
          return;
        }
        setRows((prev) =>
          prev
            .map((r) => (r.id === json.row!.id ? json.row! : r))
            .sort(
              (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
            ),
        );
        setPanel({ mode: "closed" });
      }
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAn(row: AdminShopDanhMucRow) {
    const next = row.trangThai === "hien" ? "an" : "hien";
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/shop/danh-muc/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trangThai: next }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        row?: AdminShopDanhMucRow;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.row) {
        setErr(json?.error ?? "Không đổi trạng thái.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === json.row!.id ? json.row! : r)),
      );
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function promoteAlias(row: HangChoAlias) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote-alias",
          tuKhoa: row.tuKhoa,
          idDanhMuc: row.idDanhMuc,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không promote được alias.");
        return;
      }
      await refreshHangCho();
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function xuLyYeuCau(
    id: string,
    trangThai: "gop_alias" | "da_tao" | "tu_choi",
  ) {
    let lyDo: string | null = null;
    if (trangThai === "tu_choi") {
      const typed = window.prompt("Lý do từ chối (seller sẽ thấy):");
      if (!typed?.trim()) return;
      lyDo = typed.trim();
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "xu-ly-yeu-cau",
          id,
          trangThai,
          lyDoTuChoi: lyDo,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không xử lý được yêu cầu.");
        return;
      }
      await refreshHangCho();
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Danh mục hàng</h1>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => {
            void refresh();
            void refreshHangCho();
          }}>
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPanel({ mode: "create" })}
          >
            + Thêm danh mục
          </button>
        </div>
      </header>

      <div className="page-body">
        <p className="admin-table-sub" style={{ marginBottom: 12 }}>
          Canonical cho Kho / hub <code>/cua-hang</code>. Seller chỉ chọn — không
          tạo. Ẩn = không hiện trong dropdown (mapping cũ giữ nguyên).
        </p>

        <div className="admin-toolbar">
          <div className="filter-bar">
            <div className="filter-search">
              <input
                type="search"
                placeholder="Tìm tên, slug, mô tả…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterTt}
              onChange={(e) =>
                setFilterTt(e.target.value as "all" | "hien" | "an")
              }
              aria-label="Lọc trạng thái"
            >
              <option value="all">Tất cả</option>
              <option value="hien">Đang hiện</option>
              <option value="an">Đã ẩn</option>
            </select>
            <span className="filter-count">
              {filtered.length} / {rows.length}
            </span>
          </div>
        </div>

        {err ? (
          <p
            className="admin-edit-form__msg admin-edit-form__msg--err"
            role="alert"
          >
            {err}
          </p>
        ) : null}

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TT</th>
                <th>Tên</th>
                <th>Slug</th>
                <th>Loại gắn</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    Không có danh mục.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.thuTu}</td>
                    <td>
                      <strong>
                        {r.idCha ? "↳ " : ""}
                        {r.ten}
                      </strong>
                      {r.moTa ? (
                        <div className="admin-table-sub">{r.moTa}</div>
                      ) : null}
                    </td>
                    <td>
                      <code>{r.slug}</code>
                    </td>
                    <td>{r.soNhom}</td>
                    <td>
                      <span className={`badge badge-${r.trangThai}`}>
                        {r.trangThai === "hien" ? "Hiện" : "Ẩn"}
                      </span>
                    </td>
                    <td className="admin-table-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => setPanel({ mode: "edit", row: r })}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy || r.slug === "khac"}
                        title={
                          r.slug === "khac"
                            ? "Không ẩn mục dự phòng «Khác»"
                            : undefined
                        }
                        onClick={() => void toggleAn(r)}
                      >
                        {r.trangThai === "hien" ? "Ẩn" : "Hiện lại"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {aliasCho.length > 0 || yeuCauCho.length > 0 ? (
          <section style={{ marginTop: 28 }}>
            <h2 className="page-title" style={{ fontSize: "1.1rem" }}>
              Hàng chờ đóng góp
            </h2>
            <p className="admin-table-sub" style={{ marginBottom: 12 }}>
              Alias tự học (≥3 shop) — bấm một nút. Yêu cầu thiếu danh mục —
              không tạo row cho tới khi đủ tín hiệu.
            </p>

            {aliasCho.length > 0 ? (
              <div className="table-wrap" style={{ marginBottom: 16 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Từ khóa</th>
                      <th>Danh mục</th>
                      <th>Shop</th>
                      <th>Loại</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {aliasCho.map((a) => (
                      <tr key={`${a.tuKhoa}-${a.idDanhMuc}`}>
                        <td>
                          <code>{a.tuKhoa}</code>
                        </td>
                        <td>{a.tenDanhMuc}</td>
                        <td>{a.soShop}</td>
                        <td>{a.soNhom}</td>
                        <td className="admin-table-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void promoteAlias(a)}
                          >
                            Thành alias
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {yeuCauCho.length > 0 ? (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Loại hàng</th>
                      <th>Mô tả</th>
                      <th>Shop cùng cụm</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {yeuCauCho.map((y) => (
                      <tr key={y.id}>
                        <td>
                          <strong>{y.nhanNhom ?? y.tuKhoaChuan}</strong>
                          {y.tenDanhMucGanNhat ? (
                            <div className="admin-table-sub">
                              Gần: {y.tenDanhMucGanNhat}
                            </div>
                          ) : null}
                        </td>
                        <td>{y.moTa}</td>
                        <td>{y.soShopCungCum}</td>
                        <td className="admin-table-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => void xuLyYeuCau(y.id, "gop_alias")}
                          >
                            Là alias
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => void xuLyYeuCau(y.id, "da_tao")}
                          >
                            Đã tạo mục
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => void xuLyYeuCau(y.id, "tu_choi")}
                          >
                            Từ chối
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <AdminSlideOver
        open={panel.mode !== "closed"}
        title={panel.mode === "create" ? "Thêm danh mục" : "Sửa danh mục"}
        onClose={() => !busy && setPanel({ mode: "closed" })}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setPanel({ mode: "closed" })}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !form.ten.trim()}
              onClick={() => void onSave()}
            >
              {busy ? "Đang lưu…" : "Lưu"}
            </button>
          </>
        }
      >
        <div className="admin-edit-form">
          <label className="admin-edit-form__field">
            <span>Tên</span>
            <input
              type="text"
              value={form.ten}
              maxLength={80}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, ten: e.target.value }))}
            />
          </label>
          <label className="admin-edit-form__field">
            <span>Slug {panel.mode === "create" ? "(để trống = tự tạo)" : ""}</span>
            <input
              type="text"
              value={form.slug}
              maxLength={64}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </label>
          <label className="admin-edit-form__field">
            <span>Mô tả / ranh giới (admin)</span>
            <textarea
              value={form.moTa}
              rows={3}
              maxLength={500}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, moTa: e.target.value }))}
            />
          </label>
          <label className="admin-edit-form__field">
            <span>Thứ tự</span>
            <input
              type="number"
              value={form.thuTu}
              disabled={busy}
              onChange={(e) =>
                setForm((f) => ({ ...f, thuTu: e.target.value }))
              }
            />
          </label>
          <label className="admin-edit-form__field">
            <span>Trạng thái</span>
            <select
              value={form.trangThai}
              disabled={busy}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  trangThai: e.target.value === "an" ? "an" : "hien",
                }))
              }
            >
              <option value="hien">Hiện</option>
              <option value="an">Ẩn</option>
            </select>
          </label>
        </div>
      </AdminSlideOver>
    </>
  );
}

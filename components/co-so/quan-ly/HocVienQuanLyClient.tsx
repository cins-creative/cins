"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

type Enrollment = {
  hocVienLopId: string;
  trangThai: string;
  ngayDangKy: string;
  userId: string;
  tenHienThi: string;
  slug: string | null;
  avatarUrl: string | null;
  khoaId: string;
  tenKhoa: string;
  lopId: string | null;
  maLop: string | null;
  ngayCuoiKy: string | null;
  soNgayConLai: number;
  dangFreeze: boolean;
};

type Goi = { id: string; ten: string; soNgay: number; giaVnd: number };
type Lop = { id: string; maLop: string; khoaId: string; tenKhoa: string };

type Props = {
  orgId: string;
};

const TRANG_THAI_LABEL: Record<string, string> = {
  da_dang_ky: "Đã đăng ký",
  dang_hoc: "Đang học",
  da_hoan_thanh: "Hoàn thành",
  da_bo_hoc: "Bỏ học",
  tam_nghi: "Tạm nghỉ",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function daysTone(days: number): "ok" | "low" | "out" {
  if (days <= 0) return "out";
  if (days <= 7) return "low";
  return "ok";
}

export function HocVienQuanLyClient({ orgId }: Props) {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canThu, setCanThu] = useState(false);
  const [goi, setGoi] = useState<Goi[]>([]);
  const [lop, setLop] = useState<Lop[]>([]);

  const [thuTarget, setThuTarget] = useState<Enrollment | null>(null);
  const [thuMode, setThuMode] = useState<"cash" | "chat">("cash");
  const [soNgay, setSoNgay] = useState(30);
  const [soTien, setSoTien] = useState(0);
  const [goiId, setGoiId] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [lookup, setLookup] = useState("");
  const [addLopId, setAddLopId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        meta: "1",
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/co-so/${orgId}/hoc-vien?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách.");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setCanThu(Boolean(data.canThu));
      setGoi(data.goi ?? []);
      const lopList = (data.lop ?? []) as Lop[];
      setLop(lopList);
      setAddLopId((prev) => prev || lopList[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  function openThu(row: Enrollment, mode: "cash" | "chat" = "cash") {
    setThuTarget(row);
    setThuMode(mode);
    setFlash(null);
    if (goi.length > 0) {
      const g = goi[0]!;
      setGoiId(g.id);
      setSoNgay(g.soNgay);
      setSoTien(g.giaVnd);
    } else {
      setGoiId("");
      setSoNgay(30);
      setSoTien(0);
    }
    setGhiChu("");
  }

  function onPickGoi(id: string) {
    setGoiId(id);
    const g = goi.find((x) => x.id === id);
    if (g) {
      setSoNgay(g.soNgay);
      setSoTien(g.giaVnd);
    }
  }

  async function submitThu() {
    if (!thuTarget) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const path =
        thuMode === "chat"
          ? `/api/co-so/${orgId}/hoc-phi/don-chat`
          : `/api/co-so/${orgId}/hoc-phi/thu-tien-mat`;
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hocVienLopId: thuTarget.hocVienLopId,
          soNgayCong: soNgay,
          soTienVnd: soTien,
          goiId: goiId || null,
          ghiChu: ghiChu || null,
          ...(thuMode === "cash" ? { autoConfirm: true } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (thuMode === "chat" ? "Gửi đơn thất bại." : "Thu tiền thất bại."),
        );
      }
      setFlash(
        thuMode === "chat"
          ? `Đã gửi đơn CK vào chat · ${soNgay} ngày · ${String(data.donId).slice(0, 8)}…`
          : `Đã thu · cộng ${soNgay} ngày · đơn ${String(data.donId).slice(0, 8)}…`,
      );
      setThuTarget(null);
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi thu tiền.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAdd() {
    if (!lookup.trim() || !addLopId) return;
    const selected = lop.find((l) => l.id === addLopId);
    if (!selected) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-vien`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookup: lookup.trim(),
          khoaId: selected.khoaId,
          lopId: selected.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thêm được.");
      setShowAdd(false);
      setLookup("");
      setFlash("Đã thêm ghi danh.");
      setPage(1);
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi thêm học viên.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="cso-hv">
      <div className="cso-hv-toolbar">
        <form
          className="cso-hv-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQ(qDraft.trim());
          }}
        >
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Tìm tên, slug, khóa, mã lớp…"
            className="cso-ql-input"
            aria-label="Tìm học viên"
          />
          <button type="submit" className="cso-ql-btn cso-ql-btn--primary">
            <Search size={15} strokeWidth={2.2} aria-hidden />
            Tìm
          </button>
        </form>
        {canThu ? (
          <button
            type="button"
            className="cso-ql-btn cso-ql-btn--priv"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={15} strokeWidth={2.4} aria-hidden />
            Thêm ghi danh
          </button>
        ) : null}
      </div>

      <div className="cso-hv-meta">
        <p className="cso-hv-count">
          <strong>{total}</strong> ghi danh
          {q ? ` · lọc “${q}”` : ""}
        </p>
      </div>

      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <div className="cso-hv-ledger">
        <div className="cso-hv-table-wrap">
          <table className="cso-hv-table">
            <thead>
              <tr>
                <th scope="col">Học viên</th>
                <th scope="col">Khóa / lớp</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Ngày còn</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="cso-hv-loading">Đang tải danh sách…</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="cso-hv-empty">
                      <strong>Chưa có học viên</strong>
                      Thêm ghi danh rồi thu tiền để cộng ngày học.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const tone = row.ngayCuoiKy
                    ? daysTone(row.soNgayConLai)
                    : null;
                  return (
                    <tr key={row.hocVienLopId}>
                      <td>
                        <div className="cso-hv-person">
                          <div className="cso-hv-ava" aria-hidden>
                            {row.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={row.avatarUrl} alt="" />
                            ) : (
                              initials(row.tenHienThi)
                            )}
                          </div>
                          <div>
                            <p className="cso-hv-name">{row.tenHienThi}</p>
                            {row.slug ? (
                              <p className="cso-hv-slug">@{row.slug}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="cso-hv-course">{row.tenKhoa}</p>
                        <p className="cso-hv-lop">
                          {row.maLop ?? "Chưa gắn lớp"}
                        </p>
                      </td>
                      <td>
                        <div className="cso-hv-status">
                          <span className="cso-hv-chip cso-hv-chip--state">
                            {TRANG_THAI_LABEL[row.trangThai] ?? row.trangThai}
                          </span>
                          {row.dangFreeze ? (
                            <span className="cso-hv-chip cso-hv-chip--freeze">
                              Freeze
                            </span>
                          ) : (
                            <span className="cso-hv-chip cso-hv-chip--ok">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.ngayCuoiKy ? (
                          <div className="cso-hv-days">
                            <span
                              className={`cso-hv-days-n${
                                tone === "low"
                                  ? " is-low"
                                  : tone === "out"
                                    ? " is-out"
                                    : ""
                              }`}
                            >
                              {row.soNgayConLai}
                            </span>
                            <span className="cso-hv-days-sub">
                              ngày · hết {row.ngayCuoiKy}
                            </span>
                          </div>
                        ) : (
                          <span className="cso-hv-days-empty">Chưa đóng</span>
                        )}
                      </td>
                      <td>
                        {canThu ? (
                          <div className="cso-hv-actions">
                            <button
                              type="button"
                              className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
                              onClick={() => openThu(row, "cash")}
                            >
                              Thu tiền
                            </button>
                            <button
                              type="button"
                              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                              onClick={() => openThu(row, "chat")}
                            >
                              Gửi đơn CK
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="cso-hv-pager">
          <span>
            Trang {page}/{totalPages}
          </span>
          <div className="cso-hv-pager-btns">
            <button
              type="button"
              disabled={page <= 1}
              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      ) : null}

      {thuTarget ? (
        <div
          className="cso-ql-modal-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="thu-tien-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setThuTarget(null);
          }}
        >
          <div className="cso-ql-modal">
            <h3 id="thu-tien-title" className="cso-ql-modal-title">
              {thuMode === "chat" ? "Gửi đơn CK" : "Thu học phí"}
            </h3>
            <p className="cso-ql-modal-sub">
              {thuTarget.tenHienThi}
              {" · "}
              {thuTarget.tenKhoa}
              {thuTarget.maLop ? ` · ${thuTarget.maLop}` : ""}
              {thuMode === "chat"
                ? " · card vào phòng chat với học viên"
                : " · tiền mặt / xác nhận ngay"}
            </p>

            <div className="cso-ql-modal-body">
              {goi.length > 0 ? (
                <fieldset className="cso-ql-fieldset">
                  <legend className="cso-ql-fieldset-legend">
                    Gói áp dụng
                  </legend>
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Gói</span>
                    <select
                      className="cso-ql-select"
                      value={goiId}
                      onChange={(e) => onPickGoi(e.target.value)}
                    >
                      <option value="">Tuỳ chỉnh</option>
                      {goi.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.ten} — {g.soNgay} ngày —{" "}
                          {g.giaVnd.toLocaleString("vi-VN")}đ
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              ) : null}

              <fieldset className="cso-ql-fieldset">
                <legend className="cso-ql-fieldset-legend">
                  Cộng ngày &amp; số tiền
                </legend>
                <div className="cso-ql-fieldset-row">
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Số ngày cộng</span>
                    <input
                      type="number"
                      min={1}
                      className="cso-ql-input"
                      value={soNgay}
                      onChange={(e) => setSoNgay(Number(e.target.value) || 1)}
                    />
                  </label>
                  <label className="cso-ql-field">
                    <span className="cso-ql-label">Số tiền (VND)</span>
                    <input
                      type="number"
                      min={0}
                      className="cso-ql-input"
                      value={soTien}
                      onChange={(e) => setSoTien(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="cso-ql-fieldset">
                <legend className="cso-ql-fieldset-legend">
                  Ghi chú (tuỳ chọn)
                </legend>
                <label className="cso-ql-field">
                  <span className="sr-only">Ghi chú</span>
                  <input
                    type="text"
                    className="cso-ql-input"
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder={
                      thuMode === "chat"
                        ? "Nội dung kèm đơn…"
                        : "Tiền mặt quầy…"
                    }
                  />
                </label>
              </fieldset>
            </div>

            <div className="cso-ql-modal-foot">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--text"
                onClick={() => setThuTarget(null)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--primary"
                onClick={() => void submitThu()}
                disabled={submitting || soNgay < 1}
              >
                {submitting
                  ? "Đang lưu…"
                  : thuMode === "chat"
                    ? "Gửi đơn vào chat"
                    : "Xác nhận đã thu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAdd ? (
        <div
          className="cso-ql-modal-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="them-ghi-danh-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowAdd(false);
          }}
        >
          <div className="cso-ql-modal">
            <h3 id="them-ghi-danh-title" className="cso-ql-modal-title">
              Thêm ghi danh
            </h3>
            <p className="cso-ql-modal-sub">
              Nhập slug Journey hoặc email liên hệ của học viên (đã có tài khoản
              CINs).
            </p>
            <div className="cso-ql-modal-body">
              <label className="cso-ql-field">
                <span className="cso-ql-label">Slug / email</span>
                <input
                  className="cso-ql-input"
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  placeholder="vd. nguyen-van-a"
                />
              </label>
              <label className="cso-ql-field">
                <span className="cso-ql-label">Lớp</span>
                <select
                  className="cso-ql-select"
                  value={addLopId}
                  onChange={(e) => setAddLopId(e.target.value)}
                >
                  {lop.length === 0 ? (
                    <option value="">
                      Chưa có lớp — tạo lớp trên trang khóa
                    </option>
                  ) : (
                    lop.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.tenKhoa} · {l.maLop}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
            <div className="cso-ql-modal-foot">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--text"
                onClick={() => setShowAdd(false)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--primary"
                disabled={submitting || !lookup.trim() || !addLopId}
                onClick={() => void submitAdd()}
              >
                {submitting ? "Đang thêm…" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

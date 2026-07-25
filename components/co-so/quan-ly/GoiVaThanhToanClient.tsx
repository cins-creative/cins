"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

type Goi = {
  id: string;
  ten: string;
  soNgay: number;
  giaVnd: number;
  moTa: string | null;
  dangBan: boolean;
  thuTu: number;
};

type Props = { orgId: string };

export function GoiVaThanhToanClient({ orgId }: Props) {
  const [goi, setGoi] = useState<Goi[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ten, setTen] = useState("");
  const [soNgay, setSoNgay] = useState(30);
  const [giaVnd, setGiaVnd] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const goiRes = await fetch(`/api/co-so/${orgId}/hoc-phi/goi`, {
        credentials: "include",
      });
      const goiData = await goiRes.json();
      if (!goiRes.ok) throw new Error(goiData.error || "Không tải gói.");
      setGoi(goiData.goi ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGoi() {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/goi`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, soNgay, giaVnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo gói.");
      setTen("");
      setSoNgay(30);
      setGiaVnd(0);
      setFlash("Đã thêm gói.");
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBan(g: Goi) {
    setBusy(true);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/goi`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goiId: g.id, dangBan: !g.dangBan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không cập nhật.");
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cso-dt-stack">
      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <h2 className="cso-dt-panel-title">Gói học phí</h2>
          <p className="cso-dt-panel-sub">
            Catalog số ngày + giá — dùng khi thu tiền / gửi đơn CK.
          </p>
        </div>
        <div className="cso-dt-panel-body">
          <div className="cso-dt-form-row">
            <fieldset className="cso-ql-fieldset cso-dt-goi-fieldset">
              <legend className="cso-ql-fieldset-legend">Định danh</legend>
              <label className="cso-ql-field">
                <span className="sr-only">Tên gói</span>
                <input
                  className="cso-ql-input cso-ql-input--name"
                  value={ten}
                  onChange={(e) => setTen(e.target.value)}
                  placeholder="Gói 1 tháng"
                />
              </label>
            </fieldset>
            <fieldset className="cso-ql-fieldset cso-dt-goi-fieldset">
              <legend className="cso-ql-fieldset-legend">Điều kiện</legend>
              <div className="cso-ql-fieldset-row">
                <label className="cso-ql-field">
                  <span className="cso-ql-label">Ngày</span>
                  <input
                    type="number"
                    min={1}
                    className="cso-ql-input cso-ql-input--days"
                    value={soNgay}
                    onChange={(e) => setSoNgay(Number(e.target.value))}
                  />
                </label>
                <label className="cso-ql-field">
                  <span className="cso-ql-label">Giá (VND)</span>
                  <input
                    type="number"
                    min={0}
                    className="cso-ql-input cso-ql-input--price"
                    value={giaVnd}
                    onChange={(e) => setGiaVnd(Number(e.target.value))}
                  />
                </label>
              </div>
            </fieldset>
            <button
              type="button"
              disabled={busy || !ten.trim()}
              className="cso-ql-btn cso-ql-btn--priv cso-dt-goi-add"
              onClick={() => void createGoi()}
            >
              <Plus size={15} strokeWidth={2.4} aria-hidden />
              Thêm gói
            </button>
          </div>

          <div className="cso-hv-ledger cso-dt-goi-wrap">
            <div className="cso-hv-table-wrap">
              <table className="cso-hv-table">
                <thead>
                  <tr>
                    <th scope="col">Tên</th>
                    <th scope="col">Ngày</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Trạng thái</th>
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
                  ) : goi.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="cso-hv-empty">
                          <strong>Chưa có gói</strong>
                          Thêm gói để dùng khi thu học phí.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    goi.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <p className="cso-hv-name">{g.ten}</p>
                        </td>
                        <td>
                          <span className="cso-hv-days-n cso-dt-days-sm">
                            {g.soNgay}
                          </span>
                        </td>
                        <td>
                          <span className="cso-dt-money">
                            {g.giaVnd.toLocaleString("vi-VN")}đ
                          </span>
                        </td>
                        <td>
                          {g.dangBan ? (
                            <span className="cso-hv-chip cso-hv-chip--ok">
                              Đang bán
                            </span>
                          ) : (
                            <span className="cso-hv-chip cso-hv-chip--state">
                              Ẩn
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="cso-hv-actions">
                            <button
                              type="button"
                              disabled={busy}
                              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                              onClick={() => void toggleBan(g)}
                            >
                              {g.dangBan ? "Ẩn" : "Hiện"}
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
        </div>
      </section>
    </div>
  );
}

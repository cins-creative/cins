"use client";

import { useCallback, useEffect, useState } from "react";

type Summary = {
  tongDaNhan: number;
  soDonDaNhan: number;
  soDonCho: number;
  theoKenh: Array<{ kenh: string; tong: number; soDon: number }>;
};

type ChoRow = {
  id: string;
  maDon: string | null;
  soTienVnd: number;
  soNgayCong: number;
  kenh: string;
  tenHienThi: string;
  tenKhoa: string;
};

type Props = { orgId: string };

const KENH_LABEL: Record<string, string> = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
  vietqr: "VietQR",
  chat: "Chat CK",
};

function kenhLabel(kenh: string) {
  return KENH_LABEL[kenh] ?? kenh;
}

export function DoanhThuQuanLyClient({ orgId }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cho, setCho] = useState<ChoRow[]>([]);
  const [canThu, setCanThu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/co-so/${orgId}/hoc-phi/doanh-thu`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải doanh thu.");
      setSummary(data.summary);
      setCho(data.choThanhToan ?? []);
      setCanThu(Boolean(data.canThu));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(donId: string) {
    setBusyId(donId);
    try {
      const res = await fetch(`/api/hoc-phi/${donId}/xac-nhan`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xác nhận thất bại.");
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="cso-dt">
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <section className="cso-dt-kpis" aria-label="Tóm tắt doanh thu">
        <div className="cso-dt-kpi cso-dt-kpi--hero">
          <p className="cso-dt-kpi-label">Đã nhận</p>
          <p className="cso-dt-kpi-value">
            {loading
              ? "…"
              : `${(summary?.tongDaNhan ?? 0).toLocaleString("vi-VN")}đ`}
          </p>
          <p className="cso-dt-kpi-sub">
            {summary?.soDonDaNhan ?? 0} đơn đã đối soát
          </p>
        </div>
        <div className="cso-dt-kpi">
          <p className="cso-dt-kpi-label">Chờ thanh toán</p>
          <p className="cso-dt-kpi-value">{summary?.soDonCho ?? 0}</p>
          <p className="cso-dt-kpi-sub">VietQR / chuyển khoản</p>
        </div>
        <div className="cso-dt-kpi">
          <p className="cso-dt-kpi-label">Theo kênh</p>
          <ul className="cso-dt-kpi-list">
            {(summary?.theoKenh ?? []).length === 0 ? (
              <li>
                <span>—</span>
              </li>
            ) : (
              summary!.theoKenh.map((k) => (
                <li key={k.kenh}>
                  <span className="cso-dt-kenh-name">{kenhLabel(k.kenh)}</span>
                  <span className="cso-dt-kenh-meta">
                    {k.tong.toLocaleString("vi-VN")}đ · {k.soDon}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {canThu ? (
        <section className="cso-dt-panel">
          <div className="cso-dt-panel-head">
            <h3 className="cso-dt-panel-title">Đơn chờ đối soát</h3>
            <p className="cso-dt-panel-sub">
              Khớp nội dung CK / mã đơn trên VietQR rồi xác nhận để cộng ngày
              học.
            </p>
          </div>
          <div className="cso-dt-panel-body cso-dt-panel-body--flush">
            <div className="cso-hv-table-wrap">
              <table className="cso-hv-table">
                <thead>
                  <tr>
                    <th scope="col">Mã đơn</th>
                    <th scope="col">Học viên</th>
                    <th scope="col">Số tiền</th>
                    <th scope="col">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="cso-hv-loading">Đang tải…</div>
                      </td>
                    </tr>
                  ) : cho.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="cso-hv-empty">
                          <strong>Không có đơn chờ</strong>
                          Đơn CK mới sẽ hiện ở đây để đối soát.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cho.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <span className="cso-dt-code">
                            {d.maDon ?? d.id.slice(0, 8)}
                          </span>
                        </td>
                        <td>
                          <p className="cso-hv-name">{d.tenHienThi}</p>
                          <p className="cso-hv-slug">
                            {d.tenKhoa} · {kenhLabel(d.kenh)}
                          </p>
                        </td>
                        <td>
                          <div className="cso-dt-money">
                            {d.soTienVnd.toLocaleString("vi-VN")}đ
                          </div>
                          <div className="cso-dt-money-sub">
                            +{d.soNgayCong} ngày
                          </div>
                        </td>
                        <td>
                          <div className="cso-hv-actions">
                            <button
                              type="button"
                              disabled={busyId === d.id}
                              className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
                              onClick={() => void confirm(d.id)}
                            >
                              {busyId === d.id ? "Đang lưu…" : "Đã nhận"}
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
      ) : null}
    </div>
  );
}

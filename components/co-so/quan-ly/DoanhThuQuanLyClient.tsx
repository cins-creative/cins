"use client";



import { useCallback, useEffect, useMemo, useState } from "react";



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

  maKhoaHoc: string | null;

  maLop: string | null;

};



type DaDoiSoatRow = ChoRow & {

  xacNhanLuc: string | null;

  tenNguoiXacNhan: string | null;

};



type DonRow =

  | (ChoRow & { trangThai: "cho" })

  | (DaDoiSoatRow & { trangThai: "da_nhan" });



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



function formatXacNhanLuc(iso: string | null): string {

  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("vi-VN", {

    day: "2-digit",

    month: "2-digit",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    hour12: false,

  });

}



function khoaLopLabel(row: { maKhoaHoc: string | null; maLop: string | null }) {

  return (

    [row.maKhoaHoc, row.maLop].filter(Boolean).join(" · ") ||

    "Chưa gắn khóa / lớp"

  );

}



function mergeDonRows(cho: ChoRow[], daNhan: DaDoiSoatRow[]): DonRow[] {

  const pending: DonRow[] = cho.map((d) => ({ ...d, trangThai: "cho" }));

  const done: DonRow[] = [...daNhan]

    .sort((a, b) => {

      const ta = a.xacNhanLuc ? new Date(a.xacNhanLuc).getTime() : 0;

      const tb = b.xacNhanLuc ? new Date(b.xacNhanLuc).getTime() : 0;

      return tb - ta;

    })

    .map((d) => ({ ...d, trangThai: "da_nhan" }));

  return [...pending, ...done];

}



export function DoanhThuQuanLyClient({ orgId }: Props) {

  const [summary, setSummary] = useState<Summary | null>(null);

  const [cho, setCho] = useState<ChoRow[]>([]);

  const [daNhan, setDaNhan] = useState<DaDoiSoatRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);



  const rows = useMemo(() => mergeDonRows(cho, daNhan), [cho, daNhan]);



  const load = useCallback(async () => {

    setError(null);

    setLoading(true);

    try {

      const res = await fetch(`/api/academy/${orgId}/tuition/revenue`, {

        credentials: "include",

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Không tải doanh thu.");

      setSummary(data.summary);

      setCho(data.choThanhToan ?? []);

      setDaNhan(data.daDoiSoat ?? []);

    } catch (e) {

      setError(e instanceof Error ? e.message : "Lỗi.");

    } finally {

      setLoading(false);

    }

  }, [orgId]);



  useEffect(() => {

    void load();

  }, [load]);



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

            {summary?.soDonDaNhan ?? 0} đơn đã nhận tiền

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



      <section className="cso-dt-panel">

        <div className="cso-dt-panel-head">

          <h3 className="cso-dt-panel-title">Danh sách đơn học phí</h3>

          <p className="cso-dt-panel-sub">

            Xác nhận nhận tiền tại Tin nhắn (card học phí). Kế toán cơ sở đối

            soát sổ sau.

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

                  <th scope="col">Ngày học</th>

                  <th scope="col">Kênh</th>

                  <th scope="col">Trạng thái</th>

                  <th scope="col">Nhân sự xác nhận</th>

                  <th scope="col">Lúc xác nhận</th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td colSpan={8}>

                      <div className="cso-hv-loading">Đang tải…</div>

                    </td>

                  </tr>

                ) : rows.length === 0 ? (

                  <tr>

                    <td colSpan={8}>

                      <div className="cso-hv-empty">

                        <strong>Chưa có đơn</strong>

                        Đơn học phí mới sẽ hiện ở đây.

                      </div>

                    </td>

                  </tr>

                ) : (

                  rows.map((d) => (

                    <tr key={d.id}>

                      <td>

                        <span className="cso-dt-code">

                          {d.maDon ?? d.id.slice(0, 8)}

                        </span>

                      </td>

                      <td>

                        <p className="cso-hv-name">{d.tenHienThi}</p>

                        <p className="cso-hv-slug">{khoaLopLabel(d)}</p>

                      </td>

                      <td>

                        <div className="cso-dt-money">

                          {d.soTienVnd.toLocaleString("vi-VN")}đ

                        </div>

                      </td>

                      <td>

                        <div className="cso-dt-money-sub">

                          +{d.soNgayCong} ngày

                        </div>

                      </td>

                      <td>

                        <span className="cso-dt-kenh-name">

                          {kenhLabel(d.kenh)}

                        </span>

                      </td>

                      <td>

                        <span

                          className={`cso-hv-chip ${

                            d.trangThai === "da_nhan"

                              ? "cso-hv-chip--ok"

                              : "cso-hv-chip--state"

                          }`}

                        >

                          {d.trangThai === "da_nhan" ? "Đã nhận" : "Chờ"}

                        </span>

                      </td>

                      <td>

                        <p className="cso-hv-name">

                          {d.trangThai === "da_nhan"

                            ? d.tenNguoiXacNhan ?? "—"

                            : "—"}

                        </p>

                      </td>

                      <td>

                        <span className="cso-dt-xac-nhan-luc">

                          {d.trangThai === "da_nhan"

                            ? formatXacNhanLuc(d.xacNhanLuc)

                            : "—"}

                        </span>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </section>

    </div>

  );

}


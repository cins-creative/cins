"use client";

import { useCallback, useEffect, useState } from "react";

type Gate = {
  trangThai: "hoat_dong" | "canh_bao" | "khoa_ghi_danh";
  daKichHoat: boolean;
  phiLuyKeChuaVaoKy: number;
  nguongKichHoatVnd: number;
  coStkNhanPhi: boolean;
  tongNoVnd: number;
  hanTraGanNhat: string | null;
  maThamChieu: string | null;
  tuKhaiTamMo?: boolean;
  tuKhaiDenIso?: string | null;
};

type KyRow = {
  id: string;
  loaiKy: "kich_hoat" | "thang";
  tuNgay: string;
  denNgay: string;
  ngayChot: string;
  hanTra: string;
  doanhThuGhiNhanVnd: number;
  tyLe: number;
  phiPhaiTraVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  trangThai: "chua_tra" | "da_tra" | "qua_han" | "mien";
  maThamChieu: string;
};

type ThanhToan = {
  available: boolean;
  bank: {
    ten: string | null;
    soTk: string | null;
    chuTk: string | null;
    bin: string | null;
  } | null;
  maThamChieu: string | null;
  soTienVnd: number | null;
  hanTra: string | null;
  ngayChot: string | null;
  qrUrl: string | null;
};

type Props = { orgId: string; orgSlug: string };

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

const TT_LABEL: Record<KyRow["trangThai"], string> = {
  chua_tra: "Chưa trả",
  da_tra: "Đã trả",
  qua_han: "Quá hạn",
  mien: "Miễn",
};

type KnItem = {
  id: string;
  noiDung: string;
  maGiaoDich: string | null;
  trangThai: string;
  phanHoiAdmin: string | null;
  taoLuc: string;
  idKy: string | null;
};

const KN_TT: Record<string, string> = {
  mo: "Mở",
  dang_xu_ly: "Đang xử lý",
  da_xu_ly: "Đã xử lý",
  tu_choi: "Từ chối",
};

export function PhiQuanLyClient({ orgId }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [kys, setKys] = useState<KyRow[]>([]);
  const [tyLe, setTyLe] = useState(0.1);
  const [nguongVnd, setNguongVnd] = useState(2_000_000);
  const [thanhToan, setThanhToan] = useState<ThanhToan | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const [knOpen, setKnOpen] = useState(false);
  const [knItems, setKnItems] = useState<KnItem[]>([]);
  const [knCanCreate, setKnCanCreate] = useState(false);
  const [knNoiDung, setKnNoiDung] = useState("");
  const [knMaGd, setKnMaGd] = useState("");
  const [knKyId, setKnKyId] = useState("");
  const [knBusy, setKnBusy] = useState(false);
  const [knMsg, setKnMsg] = useState<string | null>(null);
  const [tuKhaiBusy, setTuKhaiBusy] = useState(false);
  const [tuKhaiMsg, setTuKhaiMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/phi`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gate?: Gate;
        kys?: KyRow[];
        tyLe?: number;
        nguongVnd?: number;
        thanhToan?: ThanhToan;
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được phí nền tảng.");
        return;
      }
      setGate(json?.gate ?? null);
      setKys(json?.kys ?? []);
      if (typeof json?.tyLe === "number") setTyLe(json.tyLe);
      if (typeof json?.nguongVnd === "number") setNguongVnd(json.nguongVnd);
      setThanhToan(json?.thanhToan ?? null);
    } catch {
      setErr("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadKn = useCallback(async () => {
    try {
      const res = await fetch(`/api/co-so/${orgId}/phi/khieu-nai`, {
        cache: "no-store",
      });
      if (res.status === 403) {
        setKnCanCreate(false);
        setKnItems([]);
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        items?: KnItem[];
      } | null;
      if (res.ok) {
        setKnCanCreate(true);
        setKnItems(json?.items ?? []);
      }
    } catch {
      /* bỏ qua — không chặn trang phí */
    }
  }, [orgId]);

  useEffect(() => {
    void load();
    void loadKn();
  }, [load, loadKn]);

  async function submitKn() {
    setKnBusy(true);
    setKnMsg(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/phi/khieu-nai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noiDung: knNoiDung,
          maGiaoDich: knMaGd.trim() || null,
          idKy: knKyId || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setKnMsg(json?.error ?? "Không gửi được khiếu nại.");
        return;
      }
      setKnMsg("Đã gửi khiếu nại — CINs sẽ phản hồi trên trang này.");
      setKnNoiDung("");
      setKnMaGd("");
      setKnKyId("");
      setKnOpen(false);
      await loadKn();
    } finally {
      setKnBusy(false);
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlash(`Đã copy ${label}`);
      window.setTimeout(() => setCopyFlash(null), 2000);
    } catch {
      setCopyFlash("Không copy được");
    }
  }

  async function submitTuKhai(kyId: string) {
    setTuKhaiBusy(true);
    setTuKhaiMsg(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/phi/tu-khai-da-tra`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kyId }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        anHanDen?: string;
      } | null;
      if (!res.ok) {
        setTuKhaiMsg(json?.error ?? "Không ghi nhận được.");
        return;
      }
      setTuKhaiMsg(
        "Đã ghi nhận — ghi danh tạm mở 3 ngày. CINs sẽ đối soát giao dịch.",
      );
      await load();
    } finally {
      setTuKhaiBusy(false);
    }
  }

  const progressPct =
    gate && !gate.daKichHoat && nguongVnd > 0
      ? Math.min(100, Math.round((gate.phiLuyKeChuaVaoKy / nguongVnd) * 100))
      : null;

  return (
    <div className="cso-dt-stack cso-phi">
      <header className="cso-phi-head">
        <h1 className="cso-phi-title">Phí nền tảng CINs</h1>
        <p className="cso-phi-lede">
          Phí nền tảng = {(tyLe * 100).toFixed(0)}% doanh thu học phí{" "}
          <strong>ghi nhận trên CINs</strong>. Học phí học viên chuyển thẳng
          cho cơ sở — CINs không giữ tiền.
        </p>
      </header>

      {err ? <p className="cso-ql-error">{err}</p> : null}
      {copyFlash ? <p className="cso-ql-flash">{copyFlash}</p> : null}
      {loading ? <p className="cso-ql-flash">Đang tải…</p> : null}

      {!loading && gate ? (
        <>
          {/* Trạng thái */}
          <section className="cso-dt-kpis" aria-label="Trạng thái phí">
            {!gate.daKichHoat ? (
              <div className="cso-dt-kpi cso-dt-kpi--hero">
                <div className="cso-dt-kpi-label">Đang miễn phí</div>
                <div className="cso-dt-kpi-value">
                  {fmtVnd(gate.phiLuyKeChuaVaoKy)}
                </div>
                <div className="cso-dt-kpi-sub">
                  Đã tích / ngưỡng {fmtVnd(nguongVnd)}
                </div>
                <div
                  className="cso-phi-progress"
                  role="progressbar"
                  aria-valuenow={progressPct ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${progressPct ?? 0}%` }} />
                </div>
              </div>
            ) : gate.tongNoVnd > 0 ? (
              <div
                className={`cso-dt-kpi cso-dt-kpi--hero${
                  gate.trangThai === "khoa_ghi_danh" ? " cso-phi-kpi--danger" : ""
                }`}
              >
                <div className="cso-dt-kpi-label">
                  {gate.trangThai === "khoa_ghi_danh"
                    ? "Quá hạn — đã khóa thêm ghi danh"
                    : "Đang nợ phí nền tảng"}
                </div>
                <div className="cso-dt-kpi-value">{fmtVnd(gate.tongNoVnd)}</div>
                <div className="cso-dt-kpi-sub">
                  {gate.hanTraGanNhat
                    ? `Hạn trả ${fmtYmd(gate.hanTraGanNhat)}`
                    : "—"}
                  {gate.maThamChieu ? ` · mã ${gate.maThamChieu}` : ""}
                </div>
              </div>
            ) : (
              <div className="cso-dt-kpi cso-dt-kpi--hero">
                <div className="cso-dt-kpi-label">Đã kích hoạt</div>
                <div className="cso-dt-kpi-value">Không nợ</div>
                <div className="cso-dt-kpi-sub">
                  Kỳ phí sẽ chốt cuối mỗi tháng
                </div>
              </div>
            )}
          </section>

          {/* Thanh toán */}
          <section className="cso-dt-panel">
            <div className="cso-dt-panel-head">
              <h2 className="cso-dt-panel-title">Thanh toán</h2>
              <p className="cso-dt-panel-sub">
                Chuyển khoản đúng mã tham chiếu để hệ thống đối soát tự động.
              </p>
            </div>
            <div className="cso-dt-panel-body">
              {!thanhToan?.available ? (
                <p className="cso-phi-muted">
                  CINs đang cập nhật thông tin thanh toán. Kỳ phí chưa bị khóa
                  vì lý do này.
                </p>
              ) : !thanhToan.soTienVnd || !thanhToan.maThamChieu ? (
                <p className="cso-phi-muted">
                  Hiện không có khoản phí cần thanh toán.
                </p>
              ) : (
                <div className="cso-phi-pay">
                  <dl className="cso-phi-pay-dl">
                    <div>
                      <dt>Số tiền</dt>
                      <dd className="cso-dt-money">
                        {fmtVnd(thanhToan.soTienVnd)}
                      </dd>
                    </div>
                    <div>
                      <dt>Ngân hàng</dt>
                      <dd>
                        {thanhToan.bank?.ten || thanhToan.bank?.bin || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Số TK</dt>
                      <dd>
                        <code className="cso-dt-code">
                          {thanhToan.bank?.soTk}
                        </code>{" "}
                        <button
                          type="button"
                          className="cso-ql-btn cso-ql-btn--sm cso-ql-btn--ghost"
                          onClick={() =>
                            void copyText(
                              "STK",
                              thanhToan.bank?.soTk ?? "",
                            )
                          }
                        >
                          Copy
                        </button>
                      </dd>
                    </div>
                    <div>
                      <dt>Chủ TK</dt>
                      <dd>{thanhToan.bank?.chuTk}</dd>
                    </div>
                    <div>
                      <dt>Nội dung CK</dt>
                      <dd>
                        <code className="cso-dt-code">
                          {thanhToan.maThamChieu}
                        </code>{" "}
                        <button
                          type="button"
                          className="cso-ql-btn cso-ql-btn--sm cso-ql-btn--primary"
                          onClick={() =>
                            void copyText(
                              "mã CK",
                              thanhToan.maThamChieu ?? "",
                            )
                          }
                        >
                          Copy mã
                        </button>
                      </dd>
                    </div>
                    {thanhToan.hanTra ? (
                      <div>
                        <dt>Hạn trả</dt>
                        <dd>{fmtYmd(thanhToan.hanTra)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {thanhToan.qrUrl ? (
                    <div className="cso-phi-qr">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thanhToan.qrUrl}
                        alt="VietQR thanh toán phí nền tảng"
                        width={200}
                        height={200}
                      />
                      <p className="cso-phi-muted">Quét VietQR — đã gắn số tiền + mã CK</p>
                    </div>
                  ) : null}
                  {knCanCreate &&
                  kys.some(
                    (k) =>
                      k.trangThai === "chua_tra" || k.trangThai === "qua_han",
                  ) ? (
                    <div className="cso-phi-tu-khai" style={{ marginTop: 16 }}>
                      {tuKhaiMsg ? (
                        <p className="cso-ql-flash">{tuKhaiMsg}</p>
                      ) : null}
                      {gate?.tuKhaiTamMo ? (
                        <p className="cso-phi-muted">
                          Đã tự khai chuyển khoản — ghi danh tạm mở
                          {gate.tuKhaiDenIso
                            ? ` đến ${new Date(gate.tuKhaiDenIso).toLocaleString("vi-VN")}`
                            : " 3 ngày"}
                          . Hệ thống đang đối soát.
                        </p>
                      ) : (
                        <>
                          <p className="cso-phi-muted">
                            Đã chuyển khoản nhưng kỳ chưa «Đã trả»? Bấm để tạm mở
                            ghi danh 3 ngày trong khi CINs đối soát.
                          </p>
                          <button
                            type="button"
                            className="cso-ql-btn cso-ql-btn--sm"
                            disabled={tuKhaiBusy}
                            onClick={() => {
                              const ky =
                                kys.find((k) => k.trangThai === "qua_han") ??
                                kys.find((k) => k.trangThai === "chua_tra");
                              if (ky) void submitTuKhai(ky.id);
                            }}
                          >
                            {tuKhaiBusy
                              ? "Đang ghi…"
                              : "Tôi đã chuyển rồi"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {/* Khiếu nại — founder */}
          {knCanCreate &&
          (knItems.length > 0 ||
            kys.some(
              (k) => k.trangThai === "chua_tra" || k.trangThai === "qua_han",
            )) ? (
            <section className="cso-dt-panel">
              <div className="cso-dt-panel-head">
                <h2 className="cso-dt-panel-title">Khiếu nại đối soát</h2>
                <p className="cso-dt-panel-sub">
                  Đã chuyển khoản nhưng kỳ chưa chuyển «Đã trả»? Gửi khiếu nại
                  kèm mã giao dịch / nội dung CK.
                </p>
              </div>
              <div className="cso-dt-panel-body">
                {knMsg ? <p className="cso-ql-flash">{knMsg}</p> : null}
                {kys.some(
                  (k) =>
                    k.trangThai === "chua_tra" || k.trangThai === "qua_han",
                ) ? (
                  !knOpen ? (
                    <button
                      type="button"
                      className="cso-ql-btn cso-ql-btn--primary"
                      onClick={() => setKnOpen(true)}
                    >
                      Khiếu nại
                    </button>
                  ) : (
                    <div className="cso-phi-kn-form">
                      <label className="cso-phi-kn-label">
                        Kỳ liên quan
                        <select
                          className="cso-ql-input"
                          value={knKyId}
                          onChange={(e) => setKnKyId(e.target.value)}
                        >
                          <option value="">— Không chọn —</option>
                          {kys
                            .filter(
                              (k) =>
                                k.trangThai === "chua_tra" ||
                                k.trangThai === "qua_han",
                            )
                            .map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.maThamChieu} · {fmtYmd(k.ngayChot)} ·{" "}
                                {TT_LABEL[k.trangThai]}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="cso-phi-kn-label">
                        Mã giao dịch ngân hàng (nếu có)
                        <input
                          className="cso-ql-input"
                          value={knMaGd}
                          onChange={(e) => setKnMaGd(e.target.value)}
                          placeholder="VD. FT…"
                        />
                      </label>
                      <label className="cso-phi-kn-label">
                        Nội dung
                        <textarea
                          className="cso-ql-input"
                          rows={3}
                          value={knNoiDung}
                          onChange={(e) => setKnNoiDung(e.target.value)}
                          placeholder="Đã CK lúc …, nội dung …, số tiền …"
                        />
                      </label>
                      <div className="cso-phi-kn-actions">
                        <button
                          type="button"
                          className="cso-ql-btn cso-ql-btn--primary"
                          disabled={knBusy || knNoiDung.trim().length < 10}
                          onClick={() => void submitKn()}
                        >
                          Gửi
                        </button>
                        <button
                          type="button"
                          className="cso-ql-btn cso-ql-btn--ghost"
                          disabled={knBusy}
                          onClick={() => setKnOpen(false)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )
                ) : null}

                {knItems.length > 0 ? (
                  <ul className="cso-phi-kn-list">
                    {knItems.map((item) => (
                      <li key={item.id}>
                        <div className="cso-phi-kn-meta">
                          <span>
                            {KN_TT[item.trangThai] ?? item.trangThai}
                          </span>
                          <span>
                            {new Date(item.taoLuc).toLocaleString("vi-VN", {
                              timeZone: "Asia/Ho_Chi_Minh",
                            })}
                          </span>
                        </div>
                        <p>{item.noiDung}</p>
                        {item.phanHoiAdmin ? (
                          <p className="cso-phi-kn-reply">
                            CINs: {item.phanHoiAdmin}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Bảng kỳ */}
          <section className="cso-dt-panel">
            <div className="cso-dt-panel-head">
              <h2 className="cso-dt-panel-title">Kỳ phí</h2>
            </div>
            <div className="cso-dt-panel-body cso-dt-panel-body--flush">
              {kys.length === 0 ? (
                <p className="cso-phi-muted" style={{ padding: "12px 16px" }}>
                  Chưa có kỳ — phí đang tích lũy đến ngưỡng kích hoạt.
                </p>
              ) : (
                <div className="cso-hv-table-wrap">
                  <table className="cso-hv-table">
                    <thead>
                      <tr>
                        <th>Kỳ</th>
                        <th>Khoảng</th>
                        <th>Doanh thu</th>
                        <th>%</th>
                        <th>Phí</th>
                        <th>Đã trả</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kys.map((k) => {
                        const phai = Math.max(
                          0,
                          k.phiPhaiTraVnd + k.dieuChinhVnd,
                        );
                        return (
                          <tr key={k.id}>
                            <td>
                              {k.loaiKy === "kich_hoat"
                                ? "Kích hoạt"
                                : fmtYmd(k.ngayChot)}
                              <div className="cso-dt-money-sub">
                                {k.maThamChieu}
                              </div>
                            </td>
                            <td>
                              {fmtYmd(k.tuNgay)} – {fmtYmd(k.denNgay)}
                            </td>
                            <td className="cso-dt-money">
                              {fmtVnd(k.doanhThuGhiNhanVnd)}
                            </td>
                            <td>{(k.tyLe * 100).toFixed(1)}%</td>
                            <td className="cso-dt-money">
                              {fmtVnd(phai)}
                              {k.dieuChinhVnd !== 0 ? (
                                <div className="cso-dt-money-sub">
                                  điều chỉnh {fmtVnd(k.dieuChinhVnd)}
                                </div>
                              ) : null}
                            </td>
                            <td className="cso-dt-money">
                              {fmtVnd(k.daTraVnd)}
                            </td>
                            <td>
                              <span
                                className={`cso-phi-badge cso-phi-badge--${k.trangThai}`}
                              >
                                {TT_LABEL[k.trangThai]}
                              </span>
                              {k.trangThai !== "da_tra" &&
                              k.trangThai !== "mien" ? (
                                <div className="cso-dt-money-sub">
                                  hạn {fmtYmd(k.hanTra)}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

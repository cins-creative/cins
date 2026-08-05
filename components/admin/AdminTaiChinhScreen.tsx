"use client";

import { useCallback, useEffect, useState } from "react";

import { CINS_BANK_OPTIONS } from "@/lib/cins/tai-chinh-banks";

import "@/components/admin/admin-tai-chinh.css";

type CauHinh = {
  id: string;
  csdt: {
    tyLe: number;
    nguongVnd: number;
    soNgayHanTra: number;
    nguongEgressGb: number | null;
  };
  bank: {
    ten: string | null;
    soTk: string | null;
    chuTk: string | null;
    bin: string | null;
  };
  doanhNghiep: {
    tenPhapNhan: string | null;
    mst: string | null;
    diaChi: string | null;
    nguoiDaiDien: string | null;
    emailHoaDon: string | null;
  };
  xuatHoaDonBat: boolean;
  ghiChu: string | null;
  capNhatBoi: string | null;
  capNhatLuc: string;
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function fmtLuc(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return iso;
  }
}

type Props = { canEdit: boolean };

export function AdminTaiChinhScreen({ canEdit }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cauHinh, setCauHinh] = useState<CauHinh | null>(null);
  const [lichSu, setLichSu] = useState<CauHinh[]>([]);

  const [tyLePercent, setTyLePercent] = useState("10");
  const [nguongVnd, setNguongVnd] = useState("2000000");
  const [soNgayHan, setSoNgayHan] = useState("7");
  const [ghiChuTyLe, setGhiChuTyLe] = useState("");

  const [egressGb, setEgressGb] = useState("");

  const [bankBin, setBankBin] = useState("");
  const [bankSoTk, setBankSoTk] = useState("");
  const [bankChuTk, setBankChuTk] = useState("");

  const [dnTen, setDnTen] = useState("");
  const [dnMst, setDnMst] = useState("");
  const [dnDiaChi, setDnDiaChi] = useState("");
  const [dnNguoi, setDnNguoi] = useState("");
  const [dnEmail, setDnEmail] = useState("");
  const [xuatHd, setXuatHd] = useState(false);

  const applyCauHinh = useCallback((c: CauHinh) => {
    setCauHinh(c);
    setTyLePercent(String(Number((c.csdt.tyLe * 100).toFixed(2))));
    setNguongVnd(String(c.csdt.nguongVnd));
    setSoNgayHan(String(c.csdt.soNgayHanTra));
    setEgressGb(
      c.csdt.nguongEgressGb == null ? "" : String(c.csdt.nguongEgressGb),
    );
    setBankBin(c.bank.bin ?? "");
    setBankSoTk(c.bank.soTk ?? "");
    setBankChuTk(c.bank.chuTk ?? "");
    setDnTen(c.doanhNghiep.tenPhapNhan ?? "");
    setDnMst(c.doanhNghiep.mst ?? "");
    setDnDiaChi(c.doanhNghiep.diaChi ?? "");
    setDnNguoi(c.doanhNghiep.nguoiDaiDien ?? "");
    setDnEmail(c.doanhNghiep.emailHoaDon ?? "");
    setXuatHd(c.xuatHoaDonBat);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tai-chinh", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        cauHinh?: CauHinh;
        lichSu?: CauHinh[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được cấu hình.");
        return;
      }
      if (json?.cauHinh) applyCauHinh(json.cauHinh);
      setLichSu(json?.lichSu ?? []);
    } catch {
      setErr("Lỗi mạng khi tải cấu hình.");
    } finally {
      setLoading(false);
    }
  }, [applyCauHinh]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(khoi: string, body: Record<string, unknown>) {
    if (!canEdit) {
      setErr("Chỉ Admin tối cao được sửa.");
      return;
    }
    setBusy(khoi);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/tai-chinh", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ khoi, ...body }),
      });
      const json = (await res.json().catch(() => null)) as {
        cauHinh?: CauHinh;
        lichSu?: CauHinh[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      if (json?.cauHinh) applyCauHinh(json.cauHinh);
      if (json?.lichSu) setLichSu(json.lichSu);
      if (khoi === "ty_le") setGhiChuTyLe("");
      setMsg("Đã lưu — tạo dòng lịch sử mới. Kỳ/dòng phí cũ không đổi.");
    } finally {
      setBusy(null);
    }
  }

  function saveTyLe() {
    const pct = Number(String(tyLePercent).replace(",", "."));
    const ng = Number(String(nguongVnd).replace(/[,\s.]/g, ""));
    const sn = Number(soNgayHan);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setErr("Tỷ lệ % phải từ 0 đến 100.");
      return;
    }
    if (!Number.isFinite(ng) || ng < 0) {
      setErr("Ngưỡng kích hoạt không hợp lệ.");
      return;
    }
    if (!Number.isFinite(sn) || sn < 0) {
      setErr("Số ngày hạn trả không hợp lệ.");
      return;
    }
    if (!ghiChuTyLe.trim()) {
      setErr("Đổi tỷ lệ/ngưỡng bắt buộc ghi chú lý do.");
      return;
    }
    void save("ty_le", {
      tyLePercent: pct,
      csdtNguongVnd: ng,
      csdtSoNgayHanTra: sn,
      ghiChu: ghiChuTyLe.trim(),
    });
  }

  function saveEgress() {
    const t = egressGb.trim();
    void save("egress", {
      csdtNguongEgressGb: t === "" ? null : Number(t),
    });
  }

  function saveStk() {
    void save("stk", {
      bankBin: bankBin.trim() || null,
      bankSoTk: bankSoTk.trim() || null,
      bankChuTk: bankChuTk.trim() || null,
    });
  }

  function saveDn() {
    void save("doanh_nghiep", {
      dnTenPhapNhan: dnTen.trim() || null,
      dnMst: dnMst.trim() || null,
      dnDiaChi: dnDiaChi.trim() || null,
      dnNguoiDaiDien: dnNguoi.trim() || null,
      dnEmailHoaDon: dnEmail.trim() || null,
      xuatHoaDonBat: xuatHd,
    });
  }

  const stkOk =
    Boolean(bankSoTk.trim()) &&
    Boolean(bankBin.trim()) &&
    Boolean(bankChuTk.trim());

  const bankLabel =
    CINS_BANK_OPTIONS.find((b) => b.code === bankBin)?.ten ??
    cauHinh?.bank.ten ??
    null;

  return (
    <div className="admin-tc">
      <header className="admin-tc-head">
        <div>
          <h1>Tài chính CINs</h1>
          <p className="admin-tc-lead">
            Tỷ lệ phí CSĐT, STK nhận phí và pháp nhân xuất hóa đơn. Mỗi lần lưu
            tạo dòng lịch sử mới — không sửa dòng cũ. Secret Sepay giữ ở env.
          </p>
        </div>
        <span
          className={`admin-tc-badge ${canEdit ? "is-edit" : "is-view"}`}
          role="status"
        >
          {canEdit ? "Admin tối cao — được sửa" : "Chỉ xem — cần Admin tối cao"}
        </span>
      </header>

      {err ? (
        <p className="admin-tc-flash is-err" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="admin-tc-flash is-ok" role="status">
          {msg}
        </p>
      ) : null}

      {loading ? <p className="admin-tc-loading">Đang tải cấu hình…</p> : null}

      {!loading && cauHinh ? (
        <>
          <div className="admin-tc-snap" aria-label="Cấu hình đang áp dụng">
            <div className="admin-tc-snap-cell">
              <span className="label">Tỷ lệ phí</span>
              <span className="value">
                {(cauHinh.csdt.tyLe * 100).toFixed(2)}%
              </span>
              <span className="sub">Áp kỳ / dòng mới</span>
            </div>
            <div className="admin-tc-snap-cell">
              <span className="label">Ngưỡng kích hoạt</span>
              <span className="value">{fmtVnd(cauHinh.csdt.nguongVnd)}₫</span>
              <span className="sub">Doanh thu lũy kế</span>
            </div>
            <div className="admin-tc-snap-cell">
              <span className="label">Hạn trả</span>
              <span className="value">{cauHinh.csdt.soNgayHanTra} ngày</span>
              <span className="sub">Sau chốt kỳ</span>
            </div>
            <div
              className={`admin-tc-snap-cell ${stkOk ? "is-ready" : "is-gap"}`}
            >
              <span className="label">STK nhận phí</span>
              <span className="value">{stkOk ? "Sẵn sàng" : "Thiếu"}</span>
              <span className="sub">
                {stkOk
                  ? bankLabel ?? "VietQR"
                  : "Ẩn thanh toán trên trang Phí"}
              </span>
            </div>
          </div>

          <div className="admin-tc-grid">
            <section className="admin-tc-panel is-wide">
              <div className="admin-tc-panel-head">
                <h2>Tỷ lệ & ngưỡng phí CSĐT</h2>
                <p>
                  Chỉ áp cho kỳ/dòng phí tạo sau khi lưu. Đổi tỷ lệ bắt buộc ghi
                  lý do.
                </p>
              </div>
              <div className="admin-tc-panel-body is-2col">
                <div className="admin-tc-field">
                  <label htmlFor="tc-tyle">Tỷ lệ phí (%)</label>
                  <input
                    id="tc-tyle"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={tyLePercent}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setTyLePercent(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-nguong">Ngưỡng kích hoạt (VND)</label>
                  <input
                    id="tc-nguong"
                    type="number"
                    min={0}
                    step={1000}
                    value={nguongVnd}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setNguongVnd(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-han">Số ngày hạn trả sau chốt kỳ</label>
                  <input
                    id="tc-han"
                    type="number"
                    min={0}
                    max={90}
                    value={soNgayHan}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setSoNgayHan(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field is-span-2">
                  <label htmlFor="tc-lydo">Lý do thay đổi (bắt buộc)</label>
                  <textarea
                    id="tc-lydo"
                    rows={2}
                    placeholder="Vd: Giai đoạn 1 — giữ 10% / 2tr"
                    value={ghiChuTyLe}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setGhiChuTyLe(e.target.value)}
                  />
                </div>
              </div>
              {canEdit ? (
                <div className="admin-tc-panel-foot">
                  <button
                    type="button"
                    className="admin-tc-btn"
                    disabled={busy != null}
                    onClick={saveTyLe}
                  >
                    {busy === "ty_le" ? "Đang lưu…" : "Lưu tỷ lệ & ngưỡng"}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="admin-tc-panel">
              <div className="admin-tc-panel-head">
                <h2>STK nhận phí nền tảng</h2>
                <span
                  className={`admin-tc-status ${stkOk ? "is-ready" : "is-gap"}`}
                >
                  {stkOk ? "Đủ VietQR" : "Chưa đủ"}
                </span>
                <p>
                  Hiện trên trang Phí của cơ sở. Thiếu thông tin → ẩn khối thanh
                  toán và hoãn khóa ghi danh.
                </p>
              </div>
              <div className="admin-tc-panel-body">
                <div className="admin-tc-field">
                  <label htmlFor="tc-bank">Ngân hàng (mã VietQR)</label>
                  <select
                    id="tc-bank"
                    value={bankBin}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setBankBin(e.target.value)}
                  >
                    <option value="">— Chọn —</option>
                    {CINS_BANK_OPTIONS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.ten} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-stk">Số tài khoản</label>
                  <input
                    id="tc-stk"
                    inputMode="numeric"
                    autoComplete="off"
                    value={bankSoTk}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setBankSoTk(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-chu">Chủ tài khoản</label>
                  <input
                    id="tc-chu"
                    value={bankChuTk}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setBankChuTk(e.target.value)}
                  />
                </div>
              </div>
              {canEdit ? (
                <div className="admin-tc-panel-foot">
                  <button
                    type="button"
                    className="admin-tc-btn"
                    disabled={busy != null}
                    onClick={saveStk}
                  >
                    {busy === "stk" ? "Đang lưu…" : "Lưu STK"}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="admin-tc-panel">
              <div className="admin-tc-panel-head">
                <h2>Hạ tầng phòng học</h2>
                <p>
                  Ngưỡng egress (GB). Để trống = tắt. Điều kiện thứ hai kích
                  hoạt kỳ phí — chưa dùng ở giai đoạn này.
                </p>
              </div>
              <div className="admin-tc-panel-body">
                <div className="admin-tc-field">
                  <label htmlFor="tc-egress">Ngưỡng egress (GB)</label>
                  <input
                    id="tc-egress"
                    type="number"
                    min={1}
                    placeholder="Trống = tắt"
                    value={egressGb}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setEgressGb(e.target.value)}
                  />
                  <span className="hint">
                    Hiện:{" "}
                    {cauHinh.csdt.nguongEgressGb == null
                      ? "tắt"
                      : `${cauHinh.csdt.nguongEgressGb} GB`}
                  </span>
                </div>
              </div>
              {canEdit ? (
                <div className="admin-tc-panel-foot">
                  <button
                    type="button"
                    className="admin-tc-btn"
                    disabled={busy != null}
                    onClick={saveEgress}
                  >
                    {busy === "egress" ? "Đang lưu…" : "Lưu egress"}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="admin-tc-panel is-wide">
              <div className="admin-tc-panel-head">
                <h2>Doanh nghiệp CINs (hóa đơn)</h2>
                <p>
                  Bên bán trên hóa đơn sau này. Xuất HĐĐT vẫn chưa tích hợp —
                  chỉ điền sẵn dữ liệu.
                </p>
              </div>
              <div className="admin-tc-panel-body is-2col">
                <div className="admin-tc-field">
                  <label htmlFor="tc-dn-ten">Tên pháp nhân</label>
                  <input
                    id="tc-dn-ten"
                    value={dnTen}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setDnTen(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-dn-mst">Mã số thuế</label>
                  <input
                    id="tc-dn-mst"
                    value={dnMst}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setDnMst(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field is-span-2">
                  <label htmlFor="tc-dn-dc">Địa chỉ</label>
                  <textarea
                    id="tc-dn-dc"
                    rows={2}
                    value={dnDiaChi}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setDnDiaChi(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-dn-dd">Người đại diện</label>
                  <input
                    id="tc-dn-dd"
                    value={dnNguoi}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setDnNguoi(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field">
                  <label htmlFor="tc-dn-email">Email nhận hóa đơn</label>
                  <input
                    id="tc-dn-email"
                    type="email"
                    value={dnEmail}
                    disabled={!canEdit || busy != null}
                    onChange={(e) => setDnEmail(e.target.value)}
                  />
                </div>
                <div className="admin-tc-field is-span-2">
                  <label className="admin-tc-check" htmlFor="tc-xuat-hd">
                    <input
                      id="tc-xuat-hd"
                      type="checkbox"
                      checked={xuatHd}
                      disabled={!canEdit || busy != null}
                      onChange={(e) => setXuatHd(e.target.checked)}
                    />
                    <span>
                      Bật xuất hóa đơn điện tử
                      <span className="hint" style={{ display: "block" }}>
                        Chưa tích hợp — nên để tắt.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              {canEdit ? (
                <div className="admin-tc-panel-foot">
                  <button
                    type="button"
                    className="admin-tc-btn"
                    disabled={busy != null}
                    onClick={saveDn}
                  >
                    {busy === "doanh_nghiep" ? "Đang lưu…" : "Lưu doanh nghiệp"}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="admin-tc-panel is-wide admin-tc-history">
              <div className="admin-tc-panel-head">
                <h2>Lịch sử thay đổi</h2>
                <p>Mỗi lần lưu append một dòng — không ghi đè cấu hình cũ.</p>
              </div>
              {lichSu.length === 0 ? (
                <p className="admin-tc-history-empty">Chưa có dòng lịch sử.</p>
              ) : (
                <ul className="admin-tc-history-list">
                  {lichSu.map((row) => (
                    <li
                      key={row.id || row.capNhatLuc}
                      className="admin-tc-history-item"
                    >
                      <time dateTime={row.capNhatLuc}>
                        {fmtLuc(row.capNhatLuc)}
                      </time>
                      <span className="rate">
                        {(row.csdt.tyLe * 100).toFixed(2)}%
                      </span>
                      <div className="meta">
                        <strong>{fmtVnd(row.csdt.nguongVnd)}₫</strong>
                        {row.ghiChu ? (
                          <span className="note">{row.ghiChu}</span>
                        ) : (
                          <span className="note">Không có ghi chú</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

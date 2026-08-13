"use client";

import { useCallback, useEffect, useState } from "react";

type KyRow = {
  id: string;
  idToChuc: string;
  orgTen: string | null;
  orgSlug: string | null;
  loaiKy: "kich_hoat" | "thang";
  ngayChot: string;
  hanTra: string;
  phiPhaiTraVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  conNoVnd: number;
  trangThai: string;
  maThamChieu: string;
  soHoaDon: string | null;
  xuatHoaDonLuc: string | null;
};

type GdRow = {
  id: string;
  sepayId: string;
  soTienVnd: number;
  noiDung: string | null;
  taiKhoanNguon: string | null;
  nhanLuc: string;
  taoLuc: string;
};

type KnRow = {
  id: string;
  idToChuc: string;
  idKy: string | null;
  noiDung: string;
  maGiaoDich: string | null;
  bienLaiAnhId: string | null;
  trangThai: string;
  phanHoiAdmin: string | null;
  taoLuc: string;
  orgTen?: string | null;
  orgSlug?: string | null;
  kyMaThamChieu?: string | null;
};

type SuggestKy = {
  id: string;
  maThamChieu: string;
  trangThai: string;
  ngayChot: string;
  conNoVnd: number;
  orgTen: string | null;
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
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

export function AdminCsdtPhiScreen() {
  const [tab, setTab] = useState<"ky" | "gd" | "kn">("ky");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [kys, setKys] = useState<KyRow[]>([]);
  const [gds, setGds] = useState<GdRow[]>([]);
  const [kns, setKns] = useState<KnRow[]>([]);

  /* Gán GD */
  const [ganGdId, setGanGdId] = useState<string | null>(null);
  const [maSearch, setMaSearch] = useState("");
  const [suggest, setSuggest] = useState<SuggestKy[]>([]);
  const [hoaDonDraft, setHoaDonDraft] = useState<Record<string, string>>({});

  /* Khiếu nại */
  const [knSel, setKnSel] = useState<KnRow | null>(null);
  const [phanHoi, setPhanHoi] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/csdt-phi", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        kys?: KyRow[];
        giaoDich?: GdRow[];
        khieuNai?: KnRow[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải.");
        return;
      }
      setKys(json?.kys ?? []);
      setGds(json?.giaoDich ?? []);
      setKns(json?.khieuNai ?? []);
      const drafts: Record<string, string> = {};
      for (const k of json?.kys ?? []) {
        drafts[k.id] = k.soHoaDon ?? "";
      }
      setHoaDonDraft(drafts);
    } catch {
      setErr("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveHoaDon(kyId: string) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/csdt-phi/periods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyId,
          soHoaDon: hoaDonDraft[kyId]?.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu số HĐ.");
        return;
      }
      setMsg("Đã lưu số hóa đơn.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function searchKy() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/csdt-phi/link-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: true,
          maThamChieu: maSearch.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        kys?: SuggestKy[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tìm kỳ.");
        return;
      }
      setSuggest(json?.kys ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function ganKy(kyId: string) {
    if (!ganGdId) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/csdt-phi/link-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thanhToanId: ganGdId, kyId }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        daTraKy?: boolean;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Gán thất bại.");
        return;
      }
      setMsg(
        json?.daTraKy
          ? "Đã gán — kỳ đủ tiền, trạng thái da_tra."
          : "Đã gán giao dịch vào kỳ.",
      );
      setGanGdId(null);
      setSuggest([]);
      setMaSearch("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function xuLyKn(trangThai: "dang_xu_ly" | "da_xu_ly" | "tu_choi") {
    if (!knSel) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/csdt-phi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "khieu_nai",
          knId: knSel.id,
          trangThai,
          phanHoi,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không cập nhật khiếu nại.");
        return;
      }
      setMsg("Đã cập nhật khiếu nại.");
      setKnSel(null);
      setPhanHoi("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Phí CSĐT</h1>
        <p className="page-desc">
          Đối soát kỳ nợ, giao dịch Sepay chưa khớp mã, khiếu nại cơ sở.
        </p>
      </header>
      <div className="page-body">
        <div className="admin-tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(
            [
              ["ky", `Kỳ nợ (${kys.length})`],
              ["gd", `GD chưa khớp (${gds.length})`],
              ["kn", `Khiếu nại (${kns.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-sm${tab === id ? "" : " btn-ghost"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            Tải lại
          </button>
        </div>

        {err ? <p className="form-error">{err}</p> : null}
        {msg ? <p className="form-hint">{msg}</p> : null}
        {loading ? <p className="muted">Đang tải…</p> : null}

        {!loading && tab === "ky" ? (
          kys.length === 0 ? (
            <p className="muted">Không có kỳ chờ / quá hạn.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cơ sở</th>
                    <th>Chốt</th>
                    <th>Hạn</th>
                    <th>Còn nợ</th>
                    <th>TT</th>
                    <th>Mã CK</th>
                    <th>Số HĐ</th>
                  </tr>
                </thead>
                <tbody>
                  {kys.map((k) => (
                    <tr key={k.id}>
                      <td>
                        {k.orgTen ?? "—"}
                        {k.orgSlug ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            /{k.orgSlug}
                          </div>
                        ) : null}
                      </td>
                      <td>{fmtYmd(k.ngayChot)}</td>
                      <td>{fmtYmd(k.hanTra)}</td>
                      <td>{fmtVnd(k.conNoVnd)}</td>
                      <td>{k.trangThai}</td>
                      <td>
                        <code>{k.maThamChieu}</code>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            className="input input-sm"
                            style={{ width: 110 }}
                            value={hoaDonDraft[k.id] ?? ""}
                            onChange={(e) =>
                              setHoaDonDraft((d) => ({
                                ...d,
                                [k.id]: e.target.value,
                              }))
                            }
                            placeholder="Số HĐ"
                          />
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={busy}
                            onClick={() => void saveHoaDon(k.id)}
                          >
                            Lưu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {!loading && tab === "gd" ? (
          <>
            {gds.length === 0 ? (
              <p className="muted">Không có giao dịch chưa khớp.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sepay</th>
                      <th>Số tiền</th>
                      <th>Nội dung</th>
                      <th>Nhận</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {gds.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <code>{g.sepayId}</code>
                        </td>
                        <td>{fmtVnd(g.soTienVnd)}</td>
                        <td style={{ maxWidth: 280 }}>
                          <span className="muted">{g.noiDung || "—"}</span>
                        </td>
                        <td>{fmtLuc(g.nhanLuc)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setGanGdId(g.id);
                              setSuggest([]);
                              setMaSearch("");
                            }}
                          >
                            Gán kỳ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ganGdId ? (
              <div
                className="card"
                style={{ marginTop: 16, padding: 16, maxWidth: 480 }}
              >
                <h3 style={{ marginTop: 0 }}>Gán giao dịch → kỳ</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  Nhập mã CK (`CINSxxxxxxxxxx`) của kỳ cần gán.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    value={maSearch}
                    onChange={(e) => setMaSearch(e.target.value.toUpperCase())}
                    placeholder="CINS…"
                  />
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || !maSearch.trim()}
                    onClick={() => void searchKy()}
                  >
                    Tìm
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setGanGdId(null)}
                  >
                    Hủy
                  </button>
                </div>
                {suggest.length > 0 ? (
                  <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
                    {suggest.map((s) => (
                      <li
                        key={s.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border, #ddd)",
                        }}
                      >
                        <div>
                          <code>{s.maThamChieu}</code>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {s.orgTen} · chốt {fmtYmd(s.ngayChot)} · nợ{" "}
                            {fmtVnd(s.conNoVnd)} · {s.trangThai}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() => void ganKy(s.id)}
                        >
                          Gán
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {!loading && tab === "kn" ? (
          kns.length === 0 ? (
            <p className="muted">Không có khiếu nại mở.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {kns.map((k) => (
                <div
                  key={k.id}
                  className="card"
                  style={{ padding: 14, cursor: "pointer" }}
                  onClick={() => {
                    setKnSel(k);
                    setPhanHoi(k.phanHoiAdmin ?? "");
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{k.orgTen ?? k.idToChuc}</strong>
                    <span className="muted">{k.trangThai}</span>
                  </div>
                  <p style={{ margin: "8px 0" }}>{k.noiDung}</p>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtLuc(k.taoLuc)}
                    {k.maGiaoDich ? ` · GD ${k.maGiaoDich}` : ""}
                    {k.kyMaThamChieu ? ` · kỳ ${k.kyMaThamChieu}` : ""}
                  </div>
                </div>
              ))}

              {knSel ? (
                <div className="card" style={{ padding: 16, maxWidth: 520 }}>
                  <h3 style={{ marginTop: 0 }}>Xử lý khiếu nại</h3>
                  <p>{knSel.noiDung}</p>
                  <label className="form-label">Phản hồi</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={phanHoi}
                    onChange={(e) => setPhanHoi(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => void xuLyKn("dang_xu_ly")}
                    >
                      Đang xử lý
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => void xuLyKn("da_xu_ly")}
                    >
                      Đã xử lý
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={busy}
                      onClick={() => void xuLyKn("tu_choi")}
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setKnSel(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </>
  );
}

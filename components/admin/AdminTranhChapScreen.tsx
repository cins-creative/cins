"use client";

import { useCallback, useEffect, useState } from "react";

import { SHOP_LY_DO_KHIEU_NAI_LABEL } from "@/lib/shop/khieu-nai-labels";

type KnItem = {
  id: string;
  idDonHang: string;
  maDon?: string | null;
  lyDo: keyof typeof SHOP_LY_DO_KHIEU_NAI_LABEL;
  moTa: string | null;
  trangThai: string;
  taoLuc: string;
};

type PhiKy = {
  id: string;
  idNguoiBan: string;
  ky: string;
  phiPhaiTra: number;
  trangThai: string;
  bienLaiAnhUrl: string | null;
  hanTra: string | null;
};

export function AdminTranhChapScreen() {
  const [tab, setTab] = useState<"kn" | "phi" | "cau_hinh">("kn");
  const [items, setItems] = useState<KnItem[]>([]);
  const [phis, setPhis] = useState<PhiKy[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<KnItem | null>(null);
  const [phanQuyet, setPhanQuyet] = useState("");
  const [nghiengVe, setNghiengVe] = useState<
    "nguoi_mua" | "nguoi_ban" | "khong_ket_luan"
  >("khong_ket_luan");
  const [busy, setBusy] = useState(false);
  const [tyLePercent, setTyLePercent] = useState("5");
  const [cauHinhMsg, setCauHinhMsg] = useState<string | null>(null);

  const loadCauHinh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shop/fee-config", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        cauHinh?: { tyLe?: number };
      } | null;
      if (res.ok && typeof json?.cauHinh?.tyLe === "number") {
        setTyLePercent(String(Number((json.cauHinh.tyLe * 100).toFixed(2))));
      }
    } catch {
      /* bỏ qua */
    }
  }, []);

  const loadKn = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/disputes", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        khieuNai?: KnItem[];
        phiKy?: PhiKy[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải.");
        return;
      }
      setItems(json?.khieuNai ?? []);
      setPhis(json?.phiKy ?? []);
    } catch {
      setErr("Không tải.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKn();
    void loadCauHinh();
  }, [loadKn, loadCauHinh]);

  async function saveTyLe() {
    setBusy(true);
    setCauHinhMsg(null);
    setErr(null);
    const pct = Number(tyLePercent.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setErr("Nhập % từ 0 đến 100.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/shop/fee-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tyLePercent: pct }),
      });
      const json = (await res.json().catch(() => null)) as {
        cauHinh?: { tyLe?: number };
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu.");
        return;
      }
      if (typeof json?.cauHinh?.tyLe === "number") {
        setTyLePercent(String(Number((json.cauHinh.tyLe * 100).toFixed(2))));
      }
      setCauHinhMsg("Đã lưu tỷ lệ. Kỳ/dòng phí cũ giữ snapshot riêng.");
    } finally {
      setBusy(false);
    }
  }

  async function phanXu() {
    if (!selected) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/complaints/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "phan_xu",
          nghiengVe,
          phanQuyet,
          dong: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không phán xử được.");
        return;
      }
      setSelected(null);
      setPhanQuyet("");
      await loadKn();
    } finally {
      setBusy(false);
    }
  }

  async function xacNhanPhi(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shop/fees/periods/${id}/report-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "xac_nhan" }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không xác nhận.");
        return;
      }
      await loadKn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Tranh chấp &amp; phí shop</h1>
        <p>
          Trọng tài cấp 1 — không hoàn tiền. Nghiêng về người mua → loại trừ GMV
          phí kỳ. Xác nhận biên lai phí nền tảng.
        </p>
      </header>

      <div className="admin-gd-tabs" role="tablist">
        <button
          type="button"
          className={tab === "cau_hinh" ? "is-active" : undefined}
          onClick={() => setTab("cau_hinh")}
        >
          Tỷ lệ phí
        </button>
        <button
          type="button"
          className={tab === "kn" ? "is-active" : undefined}
          onClick={() => setTab("kn")}
        >
          Khiếu nại ({items.length})
        </button>
        <button
          type="button"
          className={tab === "phi" ? "is-active" : undefined}
          onClick={() => setTab("phi")}
        >
          Phí chờ xác nhận ({phis.length})
        </button>
      </div>

      {err ? <p className="admin-panel-err">{err}</p> : null}
      {loading && tab !== "cau_hinh" ? (
        <p className="admin-panel-loading">Đang tải…</p>
      ) : null}

      {tab === "cau_hinh" ? (
        <div className="admin-gd-detail" style={{ maxWidth: 420 }}>
          <h2>Tỷ lệ phí nền tảng</h2>
          <p>
            % GMV trên đơn hoàn thành. Đổi chỉ áp dụng dòng phí mới; kỳ đã chốt
            giữ snapshot.
          </p>
          <label>
            Tỷ lệ (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={tyLePercent}
              onChange={(e) => setTyLePercent(e.target.value)}
            />
          </label>
          <button type="button" disabled={busy} onClick={() => void saveTyLe()}>
            Lưu tỷ lệ
          </button>
          {cauHinhMsg ? <p role="status">{cauHinhMsg}</p> : null}
        </div>
      ) : null}

      {tab === "kn" && !loading ? (
        <div className="admin-gd-layout">
          <ul className="admin-gd-list">
            {items.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  className={selected?.id === k.id ? "is-active" : undefined}
                  onClick={() => setSelected(k)}
                >
                  <strong>{k.maDon ?? k.idDonHang.slice(0, 8)}</strong>
                  <span>
                    {SHOP_LY_DO_KHIEU_NAI_LABEL[k.lyDo] ?? k.lyDo} ·{" "}
                    {k.trangThai}
                  </span>
                </button>
              </li>
            ))}
            {items.length === 0 ? <li>Không có khiếu nại mở.</li> : null}
          </ul>
          {selected ? (
            <div className="admin-gd-detail">
              <h2>{selected.maDon ?? selected.idDonHang}</h2>
              <p>{selected.moTa || "—"}</p>
              <label>
                Nghiêng về
                <select
                  value={nghiengVe}
                  onChange={(e) =>
                    setNghiengVe(
                      e.target.value as
                        | "nguoi_mua"
                        | "nguoi_ban"
                        | "khong_ket_luan",
                    )
                  }
                >
                  <option value="nguoi_mua">Người mua</option>
                  <option value="nguoi_ban">Người bán</option>
                  <option value="khong_ket_luan">Không kết luận</option>
                </select>
              </label>
              <label>
                Phán quyết
                <textarea
                  rows={4}
                  value={phanQuyet}
                  onChange={(e) => setPhanQuyet(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || phanQuyet.trim().length < 4}
                onClick={() => void phanXu()}
              >
                Phán xử &amp; đóng
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "phi" && !loading ? (
        <ul className="admin-gd-list">
          {phis.map((p) => (
            <li key={p.id} className="admin-gd-phi-row">
              <div>
                <strong>Kỳ {p.ky}</strong>
                <span>
                  {p.phiPhaiTra.toLocaleString("vi-VN")} VND · {p.trangThai}
                  {p.hanTra ? ` · hạn ${p.hanTra}` : ""}
                </span>
                {p.bienLaiAnhUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.bienLaiAnhUrl}
                    alt="Biên lai phí"
                    style={{ maxWidth: 160, marginTop: 8 }}
                  />
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void xacNhanPhi(p.id)}
              >
                Xác nhận đã nhận phí
              </button>
            </li>
          ))}
          {phis.length === 0 ? <li>Không có biên lai chờ xác nhận.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

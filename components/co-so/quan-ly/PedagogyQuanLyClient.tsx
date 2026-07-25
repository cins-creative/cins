"use client";

import { useCallback, useEffect, useState } from "react";

type Nop = {
  id: string;
  hocVienLopId: string;
  baiTapId: string;
  tenBaiTap: string;
  tenHienThi: string;
  taoLuc: string;
};

type Bai = { id: string; ten: string };

type Props = { orgId: string };

function formatNopTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PedagogyQuanLyClient({ orgId }: Props) {
  const [cho, setCho] = useState<Nop[]>([]);
  const [canDuyet, setCanDuyet] = useState(false);
  const [baiTiepByNop, setBaiTiepByNop] = useState<Record<string, string>>({});
  const [baiCache, setBaiCache] = useState<Bai[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/nop-bai`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải nộp bài.");
      setCho(data.choDuyet ?? []);
      setCanDuyet(Boolean(data.canDuyet));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBaiCache([]);
  }, []);

  async function duyet(nop: Nop, trangThai: "dat" | "lam_lai") {
    setBusy(nop.id);
    setFlash(null);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${orgId}/nop-bai`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duyet",
          nopId: nop.id,
          trangThai,
          baiTiepId: trangThai === "dat" ? baiTiepByNop[nop.id] || null : null,
          publishThongBao: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duyệt thất bại.");
      setFlash(
        trangThai === "dat"
          ? "Đã duyệt đạt — mở bài tiếp (nếu chọn) và gửi thông báo."
          : "Đã yêu cầu học viên làm lại.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="cso-lh">
      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <div className="cso-hv-table-wrap">
        <table className="cso-hv-table">
          <thead>
            <tr>
              <th scope="col">Học viên</th>
              <th scope="col">Bài nộp</th>
              <th scope="col">Bài tiếp</th>
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
                    <strong>Không có bài chờ duyệt</strong>
                    Bài nộp từ phòng lớp sẽ hiện ở đây.
                  </div>
                </td>
              </tr>
            ) : (
              cho.map((n) => (
                <tr key={n.id}>
                  <td>
                    <p className="cso-hv-name">{n.tenHienThi}</p>
                  </td>
                  <td>
                    <p className="cso-hv-course">{n.tenBaiTap}</p>
                    <p className="cso-hv-lop">{formatNopTime(n.taoLuc)}</p>
                  </td>
                  <td>
                    <input
                      className="cso-ql-input cso-lh-bai-tiep"
                      placeholder="UUID bài tiếp (tuỳ chọn)"
                      value={baiTiepByNop[n.id] ?? ""}
                      onChange={(e) =>
                        setBaiTiepByNop((prev) => ({
                          ...prev,
                          [n.id]: e.target.value,
                        }))
                      }
                      list="bai-tiep-hints"
                      aria-label={`Bài tiếp cho ${n.tenHienThi}`}
                    />
                  </td>
                  <td>
                    {canDuyet ? (
                      <div className="cso-hv-actions">
                        <button
                          type="button"
                          disabled={busy === n.id}
                          className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
                          onClick={() => void duyet(n, "dat")}
                        >
                          {busy === n.id ? "…" : "Đạt"}
                        </button>
                        <button
                          type="button"
                          disabled={busy === n.id}
                          className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                          onClick={() => void duyet(n, "lam_lai")}
                        >
                          Làm lại
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <datalist id="bai-tiep-hints">
          {baiCache.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ten}
            </option>
          ))}
        </datalist>
      </div>
    </div>
  );
}

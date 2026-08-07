"use client";

import { useCallback, useEffect, useState } from "react";

type TbItem = {
  id: string;
  doiTuong: "shop" | "csdt";
  tieuDe: string;
  noiDung: string;
  tyLeDuKien: number | null;
  hieuLucDuKien: string | null;
  congBoLuc: string;
  trangThai: "nhap" | "da_cong_bo" | "huy";
  taoLuc: string;
  capNhatLuc: string;
};

const TT_LABEL: Record<TbItem["trangThai"], string> = {
  nhap: "Nháp",
  da_cong_bo: "Đã công bố",
  huy: "Huỷ",
};

function fmtLuc(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return iso;
  }
}

type Props = { canEdit: boolean };

export function AdminPhiThongBaoPanel({ canEdit }: Props) {
  const [items, setItems] = useState<TbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [doiTuong, setDoiTuong] = useState<"shop" | "csdt">("shop");
  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [tyLePct, setTyLePct] = useState("");
  const [hieuLuc, setHieuLuc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tai-chinh/phi-thong-bao", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: TbItem[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải được.");
        return;
      }
      setItems(json?.items ?? []);
    } catch {
      setErr("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDraft() {
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        doiTuong,
        tieuDe,
        noiDung,
      };
      if (tyLePct.trim()) {
        body.tyLeDuKienPercent = Number(tyLePct);
      }
      if (hieuLuc.trim()) body.hieuLucDuKien = hieuLuc.trim();

      const res = await fetch("/api/admin/tai-chinh/phi-thong-bao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tạo được.");
        return;
      }
      setTieuDe("");
      setNoiDung("");
      setTyLePct("");
      setHieuLuc("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setTrangThai(id: string, trangThai: TbItem["trangThai"]) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tai-chinh/phi-thong-bao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, trangThai }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không cập nhật được.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-tc-panel is-wide">
      <div className="admin-tc-panel-head">
        <h2>Thông báo phí sàn</h2>
        <p>
          Chỉ để <strong>hiển thị</strong> lộ trình / định hướng trên trang
          chính sách và Settings. Không tự đổi tỷ lệ — muốn đổi % thật → khối
          phí phía trên.
        </p>
      </div>
      <div className="admin-tc-callout">
        Shop →{" "}
        <a href="/chinh-sach/phi-san" target="_blank" rel="noreferrer">
          /chinh-sach/phi-san
        </a>
        {" · "}
        CSĐT →{" "}
        <a href="/chinh-sach/phi-csdt" target="_blank" rel="noreferrer">
          /chinh-sach/phi-csdt
        </a>
      </div>

      {err ? <p className="admin-tc-err">{err}</p> : null}

      {canEdit ? (
        <div className="admin-tc-panel-body is-2col" style={{ marginTop: 12 }}>
          <div className="admin-tc-field">
            <label htmlFor="ptb-doi">Đối tượng</label>
            <select
              id="ptb-doi"
              value={doiTuong}
              disabled={busy}
              onChange={(e) =>
                setDoiTuong(e.target.value === "csdt" ? "csdt" : "shop")
              }
            >
              <option value="shop">Shop (cửa hàng)</option>
              <option value="csdt">CSĐT</option>
            </select>
          </div>
          <div className="admin-tc-field">
            <label htmlFor="ptb-hieu">Hiệu lực dự kiến (tuỳ chọn)</label>
            <input
              id="ptb-hieu"
              type="date"
              value={hieuLuc}
              disabled={busy}
              onChange={(e) => setHieuLuc(e.target.value)}
            />
          </div>
          <div className="admin-tc-field">
            <label htmlFor="ptb-tyle">Tỷ lệ dự kiến % (tuỳ chọn)</label>
            <input
              id="ptb-tyle"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={tyLePct}
              disabled={busy}
              onChange={(e) => setTyLePct(e.target.value)}
              placeholder="Vd: 5"
            />
          </div>
          <div className="admin-tc-field is-span-2">
            <label htmlFor="ptb-td">Tiêu đề</label>
            <input
              id="ptb-td"
              value={tieuDe}
              disabled={busy}
              onChange={(e) => setTieuDe(e.target.value)}
              placeholder="Vd: Định hướng phí sàn Q4"
            />
          </div>
          <div className="admin-tc-field is-span-2">
            <label htmlFor="ptb-nd">Nội dung</label>
            <textarea
              id="ptb-nd"
              rows={3}
              value={noiDung}
              disabled={busy}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Nội dung công bố cho người dùng…"
            />
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <div className="admin-tc-panel-foot">
          <button
            type="button"
            className="admin-tc-btn"
            disabled={busy || tieuDe.trim().length < 3 || noiDung.trim().length < 10}
            onClick={() => void createDraft()}
          >
            {busy ? "Đang lưu…" : "Tạo nháp"}
          </button>
        </div>
      ) : null}

      <div className="admin-tc-panel-body" style={{ marginTop: 16 }}>
        {loading ? (
          <p className="admin-tc-muted">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="admin-tc-muted">Chưa có thông báo.</p>
        ) : (
          <ul className="admin-tc-list">
            {items.map((it) => (
              <li key={it.id} className="admin-tc-list-item">
                <div className="admin-tc-list-main">
                  <strong>
                    [{it.doiTuong === "shop" ? "Shop" : "CSĐT"}] {it.tieuDe}
                  </strong>
                  <span className="admin-tc-muted">
                    {" "}
                    · {TT_LABEL[it.trangThai]}
                    {it.hieuLucDuKien
                      ? ` · HL ${it.hieuLucDuKien}`
                      : ""}
                    {it.tyLeDuKien != null
                      ? ` · ${Math.round(it.tyLeDuKien * 10000) / 100}%`
                      : ""}
                    {it.congBoLuc
                      ? ` · CB ${fmtLuc(it.congBoLuc)}`
                      : ""}
                  </span>
                  <p
                    className="admin-tc-muted"
                    style={{
                      margin: "6px 0 0",
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                    }}
                  >
                    {it.noiDung}
                  </p>
                </div>
                {canEdit ? (
                  <div className="admin-tc-list-actions">
                    {it.trangThai !== "da_cong_bo" ? (
                      <button
                        type="button"
                        className="admin-tc-btn is-ghost"
                        disabled={busy}
                        onClick={() => void setTrangThai(it.id, "da_cong_bo")}
                      >
                        Công bố
                      </button>
                    ) : null}
                    {it.trangThai !== "huy" ? (
                      <button
                        type="button"
                        className="admin-tc-btn is-ghost"
                        disabled={busy}
                        onClick={() => void setTrangThai(it.id, "huy")}
                      >
                        Huỷ
                      </button>
                    ) : null}
                    {it.trangThai === "huy" || it.trangThai === "da_cong_bo" ? (
                      <button
                        type="button"
                        className="admin-tc-btn is-ghost"
                        disabled={busy}
                        onClick={() => void setTrangThai(it.id, "nhap")}
                      >
                        Về nháp
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

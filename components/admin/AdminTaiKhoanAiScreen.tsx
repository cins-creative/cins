"use client";

import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AutopilotBanThaoRow,
  AutopilotDaDangRow,
  AutopilotMucRow,
  AutopilotNguonRow,
  AutopilotNickRow,
  AutopilotOverview,
  AutopilotTab,
} from "@/lib/admin/autopilot-types";

const TABS: { id: AutopilotTab; label: string }[] = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "nick", label: "Nick" },
  { id: "nguon", label: "Nguồn" },
  { id: "muc", label: "Hàng đợi" },
  { id: "duyet", label: "Duyệt" },
  { id: "da-dang", label: "Đã đăng" },
];

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kenhLabel(k: string | null | undefined): string {
  switch (k) {
    case "artstation":
      return "ArtStation";
    case "behance":
      return "Behance";
    case "pixiv":
      return "Pixiv";
    case "truyen":
      return "Truyện";
    default:
      return k || "—";
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    ok?: boolean;
  };
  if (!res.ok || (data && "ok" in data && data.ok === false)) {
    throw new Error(
      (data && "error" in data && data.error) || `HTTP ${res.status}`,
    );
  }
  return data;
}

async function postAction(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/admin/autopilot/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } & Record<string, unknown>;
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export function AdminTaiKhoanAiScreen() {
  const [tab, setTab] = useState<AutopilotTab>("tong-quan");
  const [overview, setOverview] = useState<AutopilotOverview | null>(null);
  const [nicks, setNicks] = useState<AutopilotNickRow[]>([]);
  const [nguons, setNguons] = useState<AutopilotNguonRow[]>([]);
  const [mucs, setMucs] = useState<AutopilotMucRow[]>([]);
  const [banThaos, setBanThaos] = useState<AutopilotBanThaoRow[]>([]);
  const [daDangs, setDaDangs] = useState<AutopilotDaDangRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [formNguon, setFormNguon] = useState({
    nenTang: "artstation",
    urlHoSo: "",
    niche: "",
    tenHienThi: "",
  });
  const [formMuc, setFormMuc] = useState({
    url: "",
    tieuDe: "",
    tacGia: "",
  });

  const load = useCallback(async (view: AutopilotTab) => {
    setLoading(true);
    setErr(null);
    try {
      if (view === "tong-quan") {
        const data = await getJson<{ overview: AutopilotOverview }>(
          "/api/admin/autopilot?view=tong-quan",
        );
        setOverview(data.overview);
      } else if (view === "nick") {
        const data = await getJson<{ items: AutopilotNickRow[] }>(
          "/api/admin/autopilot?view=nick",
        );
        setNicks(data.items);
      } else if (view === "nguon") {
        const data = await getJson<{ items: AutopilotNguonRow[] }>(
          "/api/admin/autopilot?view=nguon",
        );
        setNguons(data.items);
      } else if (view === "muc") {
        const data = await getJson<{ items: AutopilotMucRow[] }>(
          "/api/admin/autopilot?view=muc&trangThai=moi&limit=80",
        );
        setMucs(data.items);
      } else if (view === "duyet") {
        const data = await getJson<{ items: AutopilotBanThaoRow[] }>(
          "/api/admin/autopilot?view=duyet&trangThai=cho_duyet&limit=80",
        );
        setBanThaos(data.items);
        setSelected(new Set());
      } else if (view === "da-dang") {
        const data = await getJson<{ items: AutopilotDaDangRow[] }>(
          "/api/admin/autopilot?view=da-dang&limit=60",
        );
        setDaDangs(data.items);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const run = useCallback(
    async (body: Record<string, unknown>, okMsg?: string) => {
      setBusy(true);
      setErr(null);
      setMsg(null);
      try {
        const data = await postAction(body);
        setMsg(okMsg || "Đã xong.");
        if (typeof data.tao === "number") setMsg(`Đã soạn ${data.tao} bản thảo.`);
        if (typeof data.duyet === "number") setMsg(`Đã duyệt ${data.duyet}.`);
        if (typeof data.huy === "number") setMsg(`Đã hủy ${data.huy}.`);
        if (typeof data.dang === "number") {
          setMsg(
            `Đăng ${data.dang} · bỏ qua ${data.boQua ?? 0} · lỗi ${data.loi ?? 0}`,
          );
        }
        if (typeof data.synced === "number") {
          setMsg(
            `Đồng bộ ${data.synced} nick (thiếu profile: ${data.thieu ?? 0}).`,
          );
        }
        await load(tab);
        if (tab !== "tong-quan") {
          const ov = await getJson<{ overview: AutopilotOverview }>(
            "/api/admin/autopilot?view=tong-quan",
          );
          setOverview(ov.overview);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Thao tác thất bại");
      } finally {
        setBusy(false);
      }
    },
    [load, tab],
  );

  const badgeDuyet = overview?.dem.choDuyet ?? 0;

  const allSelected = useMemo(
    () => banThaos.length > 0 && banThaos.every((b) => selected.has(b.id)),
    [banThaos, selected],
  );

  return (
    <>
      <header className="page-header admin-bai-viet-header">
        <div className="admin-bai-viet-header__copy">
          <h1 className="page-title">Tài khoản AI</h1>
          <p className="page-subtitle">
            Autopilot seeding — nick curator ArtStation / Behance / Pixiv, duyệt
            bản thảo rồi đăng Journey.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading || busy}
            onClick={() => void load(tab)}
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      </header>

      <nav className="admin-bai-viet-tabs" aria-label="Tài khoản AI">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-bai-viet-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === "duyet" && badgeDuyet > 0 ? (
              <span className="admin-bai-viet-tab-badge">
                {badgeDuyet > 99 ? "99+" : badgeDuyet}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {(msg || err) && (
        <div
          className={`tkai-flash${err ? " tkai-flash--err" : ""}`}
          role="status"
        >
          {err || msg}
        </div>
      )}

      <div className="page-body tkai-body">
        {loading ? (
          <p className="admin-panel-loading">
            <Loader2 className="tkai-spin" size={16} /> Đang tải…
          </p>
        ) : null}

        {!loading && tab === "tong-quan" && overview ? (
          <section className="tkai-overview">
            <div className="tkai-stats">
              <Stat label="Nick bật" value={`${overview.dem.nickBat}/${overview.dem.nick}`} />
              <Stat label="Nguồn bật" value={`${overview.dem.nguonBat}/${overview.dem.nguon}`} />
              <Stat label="Mục mới" value={overview.dem.mucMoi} />
              <Stat label="Chờ duyệt" value={overview.dem.choDuyet} />
              <Stat label="Sẵn sàng" value={overview.dem.sanSang} />
              <Stat label="Đã đăng OK" value={overview.dem.daDangOk} />
            </div>
            <p className="tkai-meta">
              Ngày VN: <strong>{overview.ngayVn}</strong>
              {" · "}
              Secret đăng bài: {overview.env.coSecretDangBai ? "có" : "thiếu"}
              {" · "}
              Site URL: {overview.env.coSiteUrl ? "có" : "thiếu"}
            </p>
            <div className="tkai-kenh">
              {Object.entries(overview.theoKenh).map(([k, n]) =>
                n > 0 ? (
                  <span key={k} className="tkai-chip">
                    {kenhLabel(k)} ×{n}
                  </span>
                ) : null,
              )}
            </div>
            <div className="tkai-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void run({ action: "dong_bo_nick" })}
              >
                Đồng bộ 10 nick
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || overview.dem.mucMoi === 0}
                onClick={() => void run({ action: "chuan_bi", gioiHan: 20 })}
              >
                Soạn bản thảo (20)
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || overview.dem.sanSang === 0}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Đăng tối đa 10 bản thảo san_sang theo hạn mức hôm nay?`,
                    )
                  )
                    return;
                  void run({ action: "chay_dang", gioiHan: 10 });
                }}
              >
                Đăng sẵn sàng (10)
              </button>
            </div>
            <ol className="tkai-flow">
              <li>Extension Behance/Pixiv hoặc CLI quét ArtStation → hàng đợi mục</li>
              <li>Soạn bản thảo → chờ duyệt</li>
              <li>Duyệt tay → sẵn sàng → đăng (hạn mức/ngày VN)</li>
            </ol>
          </section>
        ) : null}

        {!loading && tab === "nick" ? (
          <section>
            <div className="tkai-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void run({ action: "dong_bo_nick" })}
              >
                Đồng bộ roster
              </button>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Slug</th>
                    <th>Kênh</th>
                    <th>Hôm nay</th>
                    <th>Hạn/ngày</th>
                    <th>Bật</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {nicks.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link href={`/${n.slug}/journey`} target="_blank">
                          @{n.slug}
                        </Link>
                      </td>
                      <td>
                        <span className="tkai-chip">{kenhLabel(n.kenh)}</span>
                      </td>
                      <td>
                        {n.homNayDaDang}/{n.homNayHanMuc}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          className="tkai-input-sm"
                          defaultValue={n.hanMucNgay}
                          disabled={busy}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v === n.hanMucNgay || Number.isNaN(v)) return;
                            void run({
                              action: "cap_nhat_nick",
                              id: n.id,
                              hanMucNgay: v,
                            });
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-ghost tkai-toggle${n.dangBat ? " is-on" : ""}`}
                          disabled={busy}
                          onClick={() =>
                            void run({
                              action: "cap_nhat_nick",
                              id: n.id,
                              dangBat: !n.dangBat,
                            })
                          }
                        >
                          {n.dangBat ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td className="tkai-muted">{n.ghiChu || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!loading && tab === "nguon" ? (
          <section>
            <form
              className="tkai-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  {
                    action: "them_nguon",
                    nenTang: formNguon.nenTang,
                    urlHoSo: formNguon.urlHoSo,
                    niche: formNguon.niche || null,
                    tenHienThi: formNguon.tenHienThi || null,
                  },
                  "Đã lưu nguồn.",
                ).then(() =>
                  setFormNguon((f) => ({ ...f, urlHoSo: "", tenHienThi: "" })),
                );
              }}
            >
              <select
                value={formNguon.nenTang}
                onChange={(e) =>
                  setFormNguon((f) => ({ ...f, nenTang: e.target.value }))
                }
              >
                <option value="artstation">ArtStation</option>
                <option value="behance">Behance</option>
                <option value="pixiv">Pixiv</option>
              </select>
              <input
                required
                placeholder="https://…/users/… hoặc profile"
                value={formNguon.urlHoSo}
                onChange={(e) =>
                  setFormNguon((f) => ({ ...f, urlHoSo: e.target.value }))
                }
              />
              <input
                placeholder="Tên hiển thị"
                value={formNguon.tenHienThi}
                onChange={(e) =>
                  setFormNguon((f) => ({ ...f, tenHienThi: e.target.value }))
                }
              />
              <input
                placeholder="niche, phẩy"
                value={formNguon.niche}
                onChange={(e) =>
                  setFormNguon((f) => ({ ...f, niche: e.target.value }))
                }
              />
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Thêm nguồn
              </button>
            </form>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nền tảng</th>
                    <th>Hồ sơ</th>
                    <th>Niche</th>
                    <th>Quét lần cuối</th>
                    <th>Bật</th>
                  </tr>
                </thead>
                <tbody>
                  {nguons.map((n) => (
                    <tr key={n.id}>
                      <td>{kenhLabel(n.nenTang)}</td>
                      <td>
                        <a href={n.urlHoSo} target="_blank" rel="noreferrer">
                          {n.tenHienThi || n.maNgoai || n.urlHoSo}
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="tkai-muted">{n.niche || "—"}</td>
                      <td>{fmt(n.lanQuetLuc)}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-ghost tkai-toggle${n.dangBat ? " is-on" : ""}`}
                          disabled={busy}
                          onClick={() =>
                            void run({
                              action: "cap_nhat_nguon",
                              id: n.id,
                              dangBat: !n.dangBat,
                            })
                          }
                        >
                          {n.dangBat ? "ON" : "OFF"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!loading && tab === "muc" ? (
          <section>
            <form
              className="tkai-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  {
                    action: "nhap_muc",
                    url: formMuc.url,
                    tieuDe: formMuc.tieuDe || null,
                    tacGia: formMuc.tacGia || null,
                  },
                  "Đã thêm mục.",
                ).then(() => setFormMuc({ url: "", tieuDe: "", tacGia: "" }));
              }}
            >
              <input
                required
                placeholder="URL artwork / gallery"
                value={formMuc.url}
                onChange={(e) =>
                  setFormMuc((f) => ({ ...f, url: e.target.value }))
                }
              />
              <input
                placeholder="Tiêu đề"
                value={formMuc.tieuDe}
                onChange={(e) =>
                  setFormMuc((f) => ({ ...f, tieuDe: e.target.value }))
                }
              />
              <input
                placeholder="Tác giả nguồn"
                value={formMuc.tacGia}
                onChange={(e) =>
                  setFormMuc((f) => ({ ...f, tacGia: e.target.value }))
                }
              />
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Nhập mục
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || mucs.length === 0}
                onClick={() => void run({ action: "chuan_bi", gioiHan: 20 })}
              >
                Soạn → chờ duyệt
              </button>
            </form>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cover</th>
                    <th>Tiêu đề</th>
                    <th>Nguồn</th>
                    <th>Tác giả</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mucs.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.anhBiaUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={m.anhBiaUrl}
                            alt=""
                            className="tkai-thumb"
                          />
                        ) : (
                          <span className="tkai-muted">—</span>
                        )}
                      </td>
                      <td>
                        <a href={m.urlCanonic} target="_blank" rel="noreferrer">
                          {m.tieuDeGoc || m.urlCanonic}
                        </a>
                      </td>
                      <td>{kenhLabel(m.nenTang)}</td>
                      <td className="tkai-muted">{m.tenTacGia || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void run({ action: "bo_qua_muc", id: m.id })
                          }
                        >
                          Bỏ qua
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!mucs.length ? (
                    <tr>
                      <td colSpan={5} className="tkai-muted">
                        Không có mục mới.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!loading && tab === "duyet" ? (
          <section>
            <div className="tkai-actions">
              <label className="tkai-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(banThaos.map((b) => b.id)));
                    } else setSelected(new Set());
                  }}
                />
                Chọn tất cả ({banThaos.length})
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || selected.size === 0}
                onClick={() =>
                  void run({
                    action: "duyet_ban_thao",
                    ids: [...selected],
                  })
                }
              >
                <Check size={14} /> Duyệt ({selected.size})
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || selected.size === 0}
                onClick={() =>
                  void run({
                    action: "huy_ban_thao",
                    ids: [...selected],
                  })
                }
              >
                <X size={14} /> Hủy
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Đăng tối đa 10 bản đã duyệt?")) return;
                  void run({ action: "chay_dang", gioiHan: 10 });
                }}
              >
                Đăng sẵn sàng
              </button>
            </div>
            <div className="tkai-cards">
              {banThaos.map((b) => (
                <article key={b.id} className="tkai-card">
                  <label className="tkai-card__check">
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(b.id);
                          else next.delete(b.id);
                          return next;
                        });
                      }}
                    />
                  </label>
                  {b.anhBiaUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={b.anhBiaUrl} alt="" className="tkai-card__img" />
                  ) : (
                    <div className="tkai-card__img tkai-card__img--empty">
                      Không cover
                    </div>
                  )}
                  <div className="tkai-card__body">
                    <div className="tkai-card__meta">
                      <span className="tkai-chip">@{b.slug || "?"}</span>
                      <span className="tkai-chip">{kenhLabel(b.nenTang)}</span>
                      {!b.anhBiaUrl ? (
                        <span className="tkai-chip tkai-chip--warn">
                          thiếu ảnh
                        </span>
                      ) : null}
                    </div>
                    <h3>{b.tieuDe || "(không tiêu đề)"}</h3>
                    <p>{b.moTa || "—"}</p>
                    {b.urlCanonic ? (
                      <a href={b.urlCanonic} target="_blank" rel="noreferrer">
                        Xem nguồn gốc
                      </a>
                    ) : null}
                    <p className="tkai-muted tkai-attr">{b.dongGhiNguon}</p>
                  </div>
                </article>
              ))}
              {!banThaos.length ? (
                <p className="tkai-muted">Không có bản thảo chờ duyệt.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {!loading && tab === "da-dang" ? (
          <section>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Lúc</th>
                    <th>Nick</th>
                    <th>Kết quả</th>
                    <th>Bài / nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {daDangs.map((d) => (
                    <tr key={d.id}>
                      <td>{fmt(d.taoLuc)}</td>
                      <td>@{d.slugNick || "?"}</td>
                      <td>
                        {d.thanhCong ? (
                          <span className="tkai-chip is-ok">OK</span>
                        ) : (
                          <span className="tkai-chip tkai-chip--warn">
                            {d.loi || "Lỗi"}
                          </span>
                        )}
                      </td>
                      <td>
                        {d.duongDan ? (
                          <a href={d.duongDan} target="_blank" rel="noreferrer">
                            {d.slugBai || d.duongDan}
                          </a>
                        ) : d.urlCanonic ? (
                          <a
                            href={d.urlCanonic}
                            target="_blank"
                            rel="noreferrer"
                            className="tkai-muted"
                          >
                            {d.urlCanonic}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                  {!daDangs.length ? (
                    <tr>
                      <td colSpan={4} className="tkai-muted">
                        Chưa có nhật ký đăng.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tkai-stat">
      <div className="tkai-stat__v">{value}</div>
      <div className="tkai-stat__l">{label}</div>
    </div>
  );
}

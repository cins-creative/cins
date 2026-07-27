"use client";

import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AutopilotBanThaoRow,
  AutopilotDaDangRow,
  AutopilotMucRow,
  AutopilotNickRow,
  AutopilotOverview,
  AutopilotPipelineBuoc,
  AutopilotTab,
} from "@/lib/admin/autopilot-types";

const TABS: { id: AutopilotTab; label: string }[] = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "pipeline", label: "Pipeline" },
  { id: "nick", label: "Nick" },
];

const PIPELINE_BUOC: {
  id: AutopilotPipelineBuoc;
  label: string;
  hint: string;
}[] = [
  { id: "moi", label: "Hàng đợi", hint: "Mục mới — chưa soạn" },
  { id: "cho_duyet", label: "Chờ duyệt", hint: "Bản thảo chờ bạn duyệt" },
  { id: "san_sang", label: "Đã duyệt", hint: "Sẵn sàng · cron đăng" },
  { id: "da_dang", label: "Đã đăng", hint: "Nhật ký publish" },
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

function nickInitial(slug: string, tenHienThi: string | null): string {
  const src = (tenHienThi || slug || "?").trim();
  return src.charAt(0).toUpperCase() || "?";
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
  const [tab, setTab] = useState<AutopilotTab>("pipeline");
  const [buoc, setBuoc] = useState<AutopilotPipelineBuoc>("cho_duyet");
  const [overview, setOverview] = useState<AutopilotOverview | null>(null);
  const [nicks, setNicks] = useState<AutopilotNickRow[]>([]);
  const [mucs, setMucs] = useState<AutopilotMucRow[]>([]);
  const [banThaos, setBanThaos] = useState<AutopilotBanThaoRow[]>([]);
  const [daDangs, setDaDangs] = useState<AutopilotDaDangRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showExt, setShowExt] = useState(false);

  const [formMuc, setFormMuc] = useState({
    url: "",
    tieuDe: "",
    tacGia: "",
  });

  const refreshOverview = useCallback(async () => {
    const ov = await getJson<{ overview: AutopilotOverview }>(
      "/api/admin/autopilot?view=tong-quan",
    );
    setOverview(ov.overview);
  }, []);

  const loadPipeline = useCallback(
    async (step: AutopilotPipelineBuoc) => {
      setLoading(true);
      setErr(null);
      try {
        await refreshOverview();
        if (step === "moi") {
          const data = await getJson<{ items: AutopilotMucRow[] }>(
            "/api/admin/autopilot?view=muc&trangThai=moi&limit=80",
          );
          setMucs(data.items);
        } else if (step === "cho_duyet" || step === "san_sang") {
          const data = await getJson<{ items: AutopilotBanThaoRow[] }>(
            `/api/admin/autopilot?view=duyet&trangThai=${step}&limit=80`,
          );
          setBanThaos(data.items);
          setSelected(new Set());
        } else {
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
    },
    [refreshOverview],
  );

  const load = useCallback(
    async (view: AutopilotTab, step: AutopilotPipelineBuoc) => {
      if (view === "pipeline") {
        await loadPipeline(step);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        if (view === "tong-quan") {
          await refreshOverview();
        } else if (view === "nick") {
          const data = await getJson<{ items: AutopilotNickRow[] }>(
            "/api/admin/autopilot?view=nick",
          );
          setNicks(data.items);
          await refreshOverview();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    },
    [loadPipeline, refreshOverview],
  );

  useEffect(() => {
    void load(tab, buoc);
  }, [tab, buoc, load]);

  const goPipeline = useCallback((step: AutopilotPipelineBuoc) => {
    setBuoc(step);
    setTab("pipeline");
  }, []);

  const run = useCallback(
    async (
      body: Record<string, unknown>,
      opts?: { okMsg?: string; nextBuoc?: AutopilotPipelineBuoc },
    ) => {
      setBusy(true);
      setErr(null);
      setMsg(null);
      try {
        const data = await postAction(body);
        setMsg(opts?.okMsg || "Đã xong.");
        if (typeof data.tao === "number") {
          setMsg(`Đã soạn ${data.tao} bản thảo → Chờ duyệt.`);
        }
        if (typeof data.duyet === "number") {
          setMsg(
            `Đã duyệt ${data.duyet} → Đã duyệt (sẵn sàng). Cron 08/14/20 VN · 1 bài/nick/lần.`,
          );
        }
        if (typeof data.thuHoi === "number") {
          setMsg(`Thu hồi ${data.thuHoi} → Chờ duyệt.`);
        }
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
        if (opts?.nextBuoc) {
          setBuoc(opts.nextBuoc);
          setTab("pipeline");
        } else {
          await load(tab, buoc);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Thao tác thất bại");
      } finally {
        setBusy(false);
      }
    },
    [load, tab, buoc],
  );

  const dem = overview?.dem;
  const buocCount = (id: AutopilotPipelineBuoc): number => {
    if (!dem) return 0;
    switch (id) {
      case "moi":
        return dem.mucMoi;
      case "cho_duyet":
        return dem.choDuyet;
      case "san_sang":
        return dem.sanSang;
      case "da_dang":
        return dem.daDangOk;
    }
  };

  const allSelected = useMemo(
    () => banThaos.length > 0 && banThaos.every((b) => selected.has(b.id)),
    [banThaos, selected],
  );

  const toggleSelect = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <>
      <header className="page-header admin-bai-viet-header">
        <div className="admin-bai-viet-header__copy">
          <h1 className="page-title">Tài khoản AI</h1>
          <p className="page-subtitle">
            Autopilot seeding — một pipeline: hàng đợi → duyệt → đăng Journey.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading || busy}
            onClick={() => void load(tab, buoc)}
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
            {t.id === "pipeline" && (dem?.choDuyet ?? 0) > 0 ? (
              <span className="admin-bai-viet-tab-badge">
                {(dem?.choDuyet ?? 0) > 99 ? "99+" : dem?.choDuyet}
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
              <button
                type="button"
                className="tkai-stat tkai-stat--btn"
                onClick={() => goPipeline("moi")}
              >
                <div className="tkai-stat__v">{overview.dem.mucMoi}</div>
                <div className="tkai-stat__l">Hàng đợi</div>
              </button>
              <button
                type="button"
                className="tkai-stat tkai-stat--btn"
                onClick={() => goPipeline("cho_duyet")}
              >
                <div className="tkai-stat__v">{overview.dem.choDuyet}</div>
                <div className="tkai-stat__l">Chờ duyệt</div>
              </button>
              <button
                type="button"
                className="tkai-stat tkai-stat--btn"
                onClick={() => goPipeline("san_sang")}
              >
                <div className="tkai-stat__v">{overview.dem.sanSang}</div>
                <div className="tkai-stat__l">Đã duyệt</div>
              </button>
              <button
                type="button"
                className="tkai-stat tkai-stat--btn"
                onClick={() => goPipeline("da_dang")}
              >
                <div className="tkai-stat__v">{overview.dem.daDangOk}</div>
                <div className="tkai-stat__l">Đã đăng OK</div>
              </button>
              <div className="tkai-stat">
                <div className="tkai-stat__v">
                  {overview.dem.nickBat}/{overview.dem.nick}
                </div>
                <div className="tkai-stat__l">Nick bật</div>
              </div>
            </div>
            <p className="tkai-meta">
              Ngày VN: <strong>{overview.ngayVn}</strong>
              {" · "}
              Secret đăng bài: {overview.env.coSecretDangBai ? "có" : "thiếu"}
              {" · "}
              Site URL: {overview.env.coSiteUrl ? "có" : "thiếu"}
            </p>
            <p className="tkai-meta">
              Pipeline: soạn → duyệt tay → cron{" "}
              <strong>08:00 / 14:00 / 20:00 VN</strong> · 1 bài/nick/lần.
            </p>
            <div className="tkai-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || overview.dem.choDuyet === 0}
                onClick={() => goPipeline("cho_duyet")}
              >
                Đi duyệt ({overview.dem.choDuyet})
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || overview.dem.mucMoi === 0}
                onClick={() => goPipeline("moi")}
              >
                Hàng đợi ({overview.dem.mucMoi})
              </button>
            </div>

            <button
              type="button"
              className="tkai-collapse-toggle"
              onClick={() => setShowExt((v) => !v)}
            >
              {showExt ? "Ẩn" : "Hiện"} công cụ extension scrap
            </button>
            {showExt ? (
              <div className="tkai-ext-block">
                <p className="tkai-meta">
                  Tải zip → <code>chrome://extensions</code> → Load unpacked.
                  Secret: <code>CINS_NOI_BO_DANG_BAI_SECRET</code>.
                </p>
                <div className="tkai-ext-grid">
                  <article className="tkai-ext-card">
                    <h3>Behance</h3>
                    <div className="tkai-ext-card__actions">
                      <a
                        className="btn btn-primary"
                        href="/downloads/cins-behance-import.zip"
                        download
                      >
                        <Download size={14} />
                        Tải zip
                      </a>
                    </div>
                  </article>
                  <article className="tkai-ext-card">
                    <h3>Pixiv</h3>
                    <div className="tkai-ext-card__actions">
                      <a
                        className="btn btn-primary"
                        href="/downloads/cins-pixiv-import.zip"
                        download
                      >
                        <Download size={14} />
                        Tải zip
                      </a>
                    </div>
                  </article>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {!loading && tab === "pipeline" ? (
          <section className="tkai-pipeline">
            <nav className="tkai-pipeline-steps" aria-label="Pipeline đăng bài">
              {PIPELINE_BUOC.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`tkai-pipeline-step${buoc === s.id ? " is-active" : ""}`}
                  onClick={() => setBuoc(s.id)}
                  title={s.hint}
                >
                  <span className="tkai-pipeline-step__n">{i + 1}</span>
                  <span className="tkai-pipeline-step__label">{s.label}</span>
                  <span className="tkai-pipeline-step__count">
                    {buocCount(s.id)}
                  </span>
                </button>
              ))}
            </nav>
            <p className="tkai-meta tkai-pipeline-hint">
              {PIPELINE_BUOC.find((s) => s.id === buoc)?.hint}
              {" · "}
              Chuyển trạng thái bằng nút trên từng thẻ hoặc thanh hành động.
            </p>

            {buoc === "moi" ? (
              <>
                <div className="tkai-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || mucs.length === 0}
                    onClick={() =>
                      void run(
                        { action: "chuan_bi", gioiHan: 20 },
                        { nextBuoc: "cho_duyet" },
                      )
                    }
                  >
                    Soạn → Chờ duyệt (20)
                  </button>
                </div>
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
                      { okMsg: "Đã thêm mục." },
                    ).then(() =>
                      setFormMuc({ url: "", tieuDe: "", tacGia: "" }),
                    );
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
                  <button
                    type="submit"
                    className="btn btn-ghost"
                    disabled={busy}
                  >
                    Nhập tay
                  </button>
                </form>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Cover</th>
                        <th>Tiêu đề</th>
                        <th>URL</th>
                        <th>Kênh</th>
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
                          <td>{m.tieuDeGoc || "—"}</td>
                          <td>
                            <a
                              href={m.urlCanonic}
                              target="_blank"
                              rel="noreferrer"
                              className="tkai-url"
                              title={m.urlCanonic}
                            >
                              <span className="tkai-url__text">
                                {m.urlCanonic}
                              </span>
                              <ExternalLink size={12} />
                            </a>
                          </td>
                          <td>{kenhLabel(m.nenTang)}</td>
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
                            Hàng đợi trống.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {buoc === "cho_duyet" || buoc === "san_sang" ? (
              <>
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
                    Chọn ({selected.size}/{banThaos.length})
                  </label>
                  {buoc === "cho_duyet" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy || selected.size === 0}
                        onClick={() =>
                          void run(
                            {
                              action: "duyet_ban_thao",
                              ids: [...selected],
                            },
                            { nextBuoc: "san_sang" },
                          )
                        }
                      >
                        <Check size={14} /> Duyệt → Đã duyệt ({selected.size})
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
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy || selected.size === 0}
                        onClick={() =>
                          void run(
                            {
                              action: "thu_hoi_ban_thao",
                              ids: [...selected],
                            },
                            { nextBuoc: "cho_duyet" },
                          )
                        }
                      >
                        <RotateCcw size={14} /> Thu hồi → Chờ duyệt (
                        {selected.size})
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy || (dem?.sanSang ?? 0) === 0}
                        onClick={() => {
                          if (!window.confirm("Đăng tối đa 10 bản đã duyệt?"))
                            return;
                          void run(
                            { action: "chay_dang", gioiHan: 10 },
                            { nextBuoc: "da_dang" },
                          );
                        }}
                      >
                        Đăng ngay (10)
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
                    </>
                  )}
                </div>
                {buoc === "san_sang" ? (
                  <p className="tkai-meta tkai-duyet-hint">
                    Cron tự đăng <strong>08:00 / 14:00 / 20:00 VN</strong>, tối
                    đa <strong>1 bài/nick/lần</strong>. Thu hồi nếu chưa muốn
                    xếp lịch.
                  </p>
                ) : null}
                <div className="tkai-cards">
                  {banThaos.map((b) => (
                    <article key={b.id} className="tkai-card">
                      <label className="tkai-card__check">
                        <input
                          type="checkbox"
                          checked={selected.has(b.id)}
                          onChange={(e) =>
                            toggleSelect(b.id, e.target.checked)
                          }
                        />
                      </label>
                      {b.anhBiaUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={b.anhBiaUrl}
                          alt=""
                          className="tkai-card__img"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="tkai-card__img tkai-card__img--empty">
                          Không cover
                        </div>
                      )}
                      <div className="tkai-card__body">
                        <div className="tkai-card__meta">
                          <span className="tkai-chip tkai-chip--nick">
                            <span
                              className={`tkai-chip__ava${b.avatarUrl ? " has-img" : ""}`}
                              aria-hidden
                            >
                              {b.avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={b.avatarUrl} alt="" />
                              ) : (
                                nickInitial(b.slug || "?", b.tenHienThi)
                              )}
                            </span>
                            @{b.slug || "?"}
                          </span>
                          <span className="tkai-chip">
                            {kenhLabel(b.nenTang)}
                          </span>
                          {!b.anhBiaUrl ? (
                            <span className="tkai-chip tkai-chip--warn">
                              thiếu ảnh
                            </span>
                          ) : null}
                        </div>
                        <h3>{b.tieuDe || "(không tiêu đề)"}</h3>
                        <p>{b.moTa || "—"}</p>
                        <p className="tkai-muted tkai-attr">{b.dongGhiNguon}</p>
                        {b.duKienDang ? (
                          <p className="tkai-du-kien">
                            Dự kiến: <strong>{b.duKienDang}</strong>
                            {b.hanMucConLai != null ? (
                              <span className="tkai-muted">
                                {" "}
                                · slot còn {b.hanMucConLai}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        <div className="tkai-card__links">
                          <Link
                            href={`/admin/tai-khoan-ai/ban-thao/${b.id}`}
                            target="_blank"
                            className="tkai-card__icon-btn"
                            title="Xem bài viết"
                            aria-label="Xem bài viết"
                          >
                            <FileText size={15} strokeWidth={2.25} />
                          </Link>
                          {b.urlCanonic ? (
                            <a
                              href={b.urlCanonic}
                              target="_blank"
                              rel="noreferrer"
                              className="tkai-card__icon-btn"
                              title="Nguồn gốc"
                              aria-label="Nguồn gốc"
                            >
                              <ExternalLink size={15} strokeWidth={2.25} />
                            </a>
                          ) : null}
                          {buoc === "cho_duyet" ? (
                            <button
                              type="button"
                              className="btn btn-ghost tkai-card__link"
                              disabled={busy}
                              onClick={() =>
                                void run({
                                  action: "duyet_ban_thao",
                                  ids: [b.id],
                                })
                              }
                            >
                              <Check size={14} /> Duyệt
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost tkai-card__link"
                              disabled={busy}
                              onClick={() =>
                                void run({
                                  action: "thu_hoi_ban_thao",
                                  ids: [b.id],
                                })
                              }
                            >
                              <RotateCcw size={14} /> Thu hồi
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                  {!banThaos.length ? (
                    <p className="tkai-muted">
                      {buoc === "cho_duyet"
                        ? "Không có bản thảo chờ duyệt."
                        : "Không có bản đã duyệt."}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {buoc === "da_dang" ? (
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
                          <div className="tkai-card__links">
                            {d.duongDan ? (
                              <a
                                href={d.duongDan}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost tkai-card__link"
                              >
                                <ExternalLink size={14} />
                                Xem bài
                              </a>
                            ) : null}
                            {d.urlCanonic ? (
                              <a
                                href={d.urlCanonic}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost tkai-card__link"
                              >
                                <ExternalLink size={14} />
                                Nguồn
                              </a>
                            ) : null}
                            {!d.duongDan && !d.urlCanonic ? "—" : null}
                          </div>
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
            ) : null}
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
                        <div className="admin-nguoi-dung-user">
                          <span
                            className={`admin-nguoi-dung-ava${n.avatarUrl ? " admin-nguoi-dung-ava--has-img" : ""}`}
                            aria-hidden
                          >
                            {n.avatarUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={n.avatarUrl} alt="" />
                            ) : (
                              nickInitial(n.slug, n.tenHienThi)
                            )}
                          </span>
                          <Link href={`/${n.slug}/journey`} target="_blank">
                            @{n.slug}
                          </Link>
                        </div>
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
      </div>
    </>
  );
}

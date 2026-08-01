"use client";

import {
  Check,
  Copy,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { AutopilotNickRow } from "@/lib/admin/autopilot-types";

type Props = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  setMsg: (v: string | null) => void;
  setErr: (v: string | null) => void;
  postAction: (
    body: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  coVault: boolean;
  /** KPI strip từ overview (optional). */
  kpiText?: string | null;
};

function chipNenTang(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h.includes("facebook") || h.includes("fb.com")) return "FB";
    if (h.includes("behance")) return "Behance";
    if (h.includes("vimeo")) return "Vimeo";
    if (h.includes("artstation")) return "AS";
    if (h.includes("pixiv")) return "Pixiv";
    return "Web";
  } catch {
    return "Web";
  }
}

function kpiBadge(n: AutopilotNickRow) {
  const muc = n.kpiMucTieu;
  if (muc === null) return <span className="tkai-kpi tkai-kpi--muted">—</span>;
  if (muc === 0) return <span className="tkai-kpi tkai-kpi--muted">nghỉ</span>;
  const du = n.daDangHomNayKpi >= muc;
  return (
    <span className={`tkai-kpi${du ? " tkai-kpi--ok" : " tkai-kpi--bad"}`}>
      {n.daDangHomNayKpi}/{muc}
      {du ? " ✓" : ""}
    </span>
  );
}

/**
 * Roster nick seeding — up tay thủ công (không bot đăng / tương tác ảo).
 */
export function AdminTaiKhoanClonePanel({
  busy,
  setBusy,
  setMsg,
  setErr,
  postAction,
  coVault,
  kpiText,
}: Props) {
  const [nicks, setNicks] = useState<AutopilotNickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [chiChuaXong, setChiChuaXong] = useState(false);
  const [form, setForm] = useState<{
    tenHienThi: string;
    tenThat: string;
    lienKetNguon: string;
    lienHe: string;
    trangThaiXinPhep: "chua_lien_he" | "dang_cho" | "dong_y" | "tu_choi";
  }>({
    tenHienThi: "",
    tenThat: "",
    lienKetNguon: "",
    lienHe: "",
    trangThaiXinPhep: "chua_lien_he",
  });
  const [banGiao, setBanGiao] = useState<{
    id: string;
    slug: string;
    queryDich: string;
    xacNhanSlug: string;
    tenDich?: string | null;
  } | null>(null);
  const [dichGoiY, setDichGoiY] = useState<
    Array<{
      slug: string;
      tenHienThi: string;
      email: string | null;
      soNoiDung: number;
      avatarUrl: string | null;
    }>
  >([]);
  const [dichDangTim, setDichDangTim] = useState(false);
  const [moForm, setMoForm] = useState(false);
  const [sua, setSua] = useState<{
    id: string;
    slug: string;
    tenHienThi: string;
    tenThat: string;
    lienHe: string;
    lienKetNguon: string;
    trangThaiXinPhep: "chua_lien_he" | "dang_cho" | "dong_y" | "tu_choi";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/autopilot?view=roster", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: AutopilotNickRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Lỗi tải");
      const items = data.items || [];
      items.sort((a, b) => {
        const aBad =
          (a.kpiMucTieu ?? 0) > 0 && a.daDangHomNayKpi < (a.kpiMucTieu ?? 0)
            ? 0
            : 1;
        const bBad =
          (b.kpiMucTieu ?? 0) > 0 && b.daDangHomNayKpi < (b.kpiMucTieu ?? 0)
            ? 0
            : 1;
        if (aBad !== bBad) return aBad - bBad;
        return a.slug.localeCompare(b.slug);
      });
      setNicks(items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải nick");
    } finally {
      setLoading(false);
    }
  }, [setErr]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Debounce ~300ms — gợi ý user CINs cho bàn giao */
  useEffect(() => {
    if (!banGiao) {
      setDichGoiY([]);
      return;
    }
    const q = banGiao.queryDich.trim();
    if (q.length < 1 || banGiao.tenDich) {
      setDichGoiY([]);
      setDichDangTim(false);
      return;
    }
    let huy = false;
    setDichDangTim(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/nguoi-dung/list?q=${encodeURIComponent(q)}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as {
            rows?: Array<{
              slug: string;
              tenHienThi: string;
              email: string | null;
              soNoiDung: number;
              avatarUrl: string | null;
            }>;
          };
          if (huy) return;
          const rows = (data.rows || [])
            .filter((r) => r.slug !== banGiao.slug)
            .slice(0, 12)
            .sort((a, b) => a.soNoiDung - b.soNoiDung);
          setDichGoiY(rows);
        } catch {
          if (!huy) setDichGoiY([]);
        } finally {
          if (!huy) setDichDangTim(false);
        }
      })();
    }, 300);
    return () => {
      huy = true;
      clearTimeout(t);
    };
  }, [banGiao?.queryDich, banGiao?.slug, banGiao?.tenDich]);

  const run = async (
    body: Record<string, unknown>,
    okMsg?: string,
  ): Promise<Record<string, unknown> | null> => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await postAction(body);
      if (okMsg) setMsg(okMsg);
      await load();
      return data;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const taoNick = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await run(
      {
        action: "tao_clone",
        tenHienThi: form.tenHienThi,
        tenThat: form.tenThat || null,
        lienKetNguon: form.lienKetNguon,
        lienHe: form.lienHe || null,
        trangThaiXinPhep: form.trangThaiXinPhep,
      },
      "Đã tạo nick.",
    );
    if (data) {
      setForm({
        tenHienThi: "",
        tenThat: "",
        lienKetNguon: "",
        lienHe: "",
        trangThaiXinPhep: "chua_lien_he",
      });
      setMoForm(false);
    }
  };

  const luuSua = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sua) return;
    const ok = await run(
      {
        action: "cap_nhat_clone",
        id: sua.id,
        tenHienThi: sua.tenHienThi,
        tenThat: sua.tenThat || null,
        lienHe: sua.lienHe || null,
        lienKetNguon: sua.lienKetNguon,
        trangThaiXinPhep: sua.trangThaiXinPhep,
      },
      `Đã cập nhật @${sua.slug}.`,
    );
    if (ok) setSua(null);
  };

  const xoaNick = async (n: AutopilotNickRow) => {
    if ((n.soNoiDung ?? 0) > 0) {
      setErr(
        `@${n.slug} còn ${n.soNoiDung} nội dung — xóa bài hoặc bàn giao trước.`,
      );
      return;
    }
    if (
      !confirm(
        `Xóa nick @${n.slug}? Không hoàn tác. Chỉ xóa được khi 0 nội dung.`,
      )
    ) {
      return;
    }
    await run({ action: "xoa_clone", id: n.id }, `Đã xóa @${n.slug}.`);
  };

  const hien = chiChuaXong
    ? nicks.filter(
        (n) =>
          (n.kpiMucTieu ?? 0) > 0 && n.daDangHomNayKpi < (n.kpiMucTieu ?? 0),
      )
    : nicks;

  return (
    <section className="tkai-clone">
      {!coVault ? (
        <div className="tkai-flash tkai-flash--err" role="alert">
          Thiếu <code>CINS_CLONE_PASSWORD_KEY</code> (openssl rand -hex 32) —
          không tạo / hiện mật khẩu được.
        </div>
      ) : null}

      {kpiText ? (
        <div className="tkai-kpi-bar">
          <div className="tkai-kpi-bar__text">{kpiText}</div>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() =>
              void run(
                { action: "phan_bo_kpi_lai" },
                "Đã phân bổ lại KPI hôm nay.",
              )
            }
          >
            Phân bổ lại
          </button>
        </div>
      ) : null}

      <p className="tkai-meta">
        Nick seeding — admin up thủ công. Slug tự sinh từ tên. Bàn giao khi
        artist nhận tài khoản.
      </p>

      {!moForm ? (
        <div className="tkai-actions tkai-actions--top">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !coVault}
            onClick={() => setMoForm(true)}
          >
            <UserPlus size={14} /> Thêm tài khoản
          </button>
        </div>
      ) : (
        <form className="tkai-form tkai-clone-form" onSubmit={taoNick}>
          <label className="tkai-field">
            <span>Tên hiển thị *</span>
            <input
              required
              autoFocus
              placeholder="Tên trên CINs"
              value={form.tenHienThi}
              onChange={(e) =>
                setForm((f) => ({ ...f, tenHienThi: e.target.value }))
              }
            />
          </label>
          <label className="tkai-field">
            <span>Tên artist thật</span>
            <input
              placeholder="Tên pháp lý / nghệ danh"
              value={form.tenThat}
              onChange={(e) =>
                setForm((f) => ({ ...f, tenThat: e.target.value }))
              }
            />
          </label>
          <label className="tkai-field">
            <span>URL liên hệ</span>
            <input
              type="text"
              placeholder="FB/email để xin phép — vd. https://facebook.com/…"
              value={form.lienHe}
              onChange={(e) =>
                setForm((f) => ({ ...f, lienHe: e.target.value }))
              }
            />
          </label>
          <label className="tkai-field">
            <span>Xin phép</span>
            <select
              value={form.trangThaiXinPhep}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  trangThaiXinPhep: e.target
                    .value as typeof f.trangThaiXinPhep,
                }))
              }
            >
              <option value="chua_lien_he">Chưa liên hệ</option>
              <option value="dang_cho">Đang chờ</option>
              <option value="dong_y">Đồng ý</option>
              <option value="tu_choi">Từ chối</option>
            </select>
          </label>
          <label className="tkai-field tkai-field--wide">
            <span>Link portfolio / update</span>
            <textarea
              placeholder="Khác URL liên hệ — mỗi dòng 1 URL (Behance, Vimeo, ArtStation, web…)"
              value={form.lienKetNguon}
              rows={3}
              onChange={(e) =>
                setForm((f) => ({ ...f, lienKetNguon: e.target.value }))
              }
            />
          </label>
          <div className="tkai-clone-form__actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !coVault}
            >
              <UserPlus size={14} /> Tạo nick
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setMoForm(false)}
            >
              <X size={14} /> Hủy
            </button>
          </div>
        </form>
      )}

      <div className="tkai-actions">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || loading}
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> Làm mới
        </button>
        <label className="tkai-meta" style={{ display: "inline-flex", gap: 6 }}>
          <input
            type="checkbox"
            checked={chiChuaXong}
            onChange={(e) => setChiChuaXong(e.target.checked)}
          />
          Chỉ chưa đủ KPI hôm nay
        </label>
      </div>

      {loading ? (
        <p className="admin-panel-loading">
          <Loader2 className="tkai-spin" size={16} /> Đang tải…
        </p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nick</th>
                <th>Xin phép</th>
                <th>Liên hệ</th>
                <th>Portfolio</th>
                <th>KPI</th>
                <th>Nội dung</th>
                <th>Mật khẩu</th>
                <th>Bàn giao</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {hien.map((n) => (
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
                          (n.tenHienThi || n.slug || "?").charAt(0).toUpperCase()
                        )}
                      </span>
                      <Link href={`/${n.slug}/journey`} target="_blank">
                        @{n.slug}
                      </Link>
                    </div>
                    <div className="tkai-muted">
                      {n.tenThat || n.tenHienThi || "—"}
                    </div>
                  </td>
                  <td>
                    <span className="tkai-chip">
                      {n.trangThaiXinPhep || "—"}
                    </span>
                  </td>
                  <td>
                    {n.lienHe ? (
                      /^https?:\/\//i.test(n.lienHe.trim()) ? (
                        <a
                          href={n.lienHe.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tkai-chip tkai-chip--link"
                          title={n.lienHe}
                        >
                          <Link2 size={12} /> {chipNenTang(n.lienHe)}
                        </a>
                      ) : (
                        <span className="tkai-meta" title={n.lienHe}>
                          {n.lienHe}
                        </span>
                      )
                    ) : (
                      <span className="tkai-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="tkai-url-chips">
                      {(n.lienKetNguon || []).slice(0, 2).map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tkai-chip tkai-chip--link"
                          title={u}
                        >
                          <Link2 size={12} /> {chipNenTang(u)}
                        </a>
                      ))}
                      {(n.lienKetNguon || []).length > 2 ? (
                        <span className="tkai-muted">
                          +{(n.lienKetNguon || []).length - 2}
                        </span>
                      ) : null}
                      {!n.lienKetNguon?.length ? (
                        <span className="tkai-muted">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{kpiBadge(n)}</td>
                  <td>
                    <span className="tkai-meta">{n.soNoiDung ?? 0}</span>
                  </td>
                  <td>
                    {n.matKhau ? (
                      <div className="tkai-pw-cell">
                        <code className="tkai-pw tkai-pw--inline">{n.matKhau}</code>
                        <button
                          type="button"
                          className="btn btn-ghost tkai-card__link"
                          title="Copy mật khẩu"
                          onClick={() => {
                            void navigator.clipboard.writeText(n.matKhau!);
                            setMsg(`Đã copy mật khẩu @${n.slug}.`);
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="tkai-muted">
                        {n.coMatKhauVault
                          ? coVault
                            ? "Lỗi giải mã"
                            : "Thiếu vault key"
                          : "—"}
                      </span>
                    )}
                  </td>
                  <td>
                    {n.trangThaiBanGiao === "cho_ban_giao" ? (
                      <div className="tkai-ban-giao">
                        <span className="tkai-chip is-ok">
                          Gán → @{n.slugDich || "?"}
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() =>
                            setBanGiao({
                              id: n.id,
                              slug: n.slug,
                              queryDich: "",
                              xacNhanSlug: "",
                            })
                          }
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              { action: "huy_gan_dich", id: n.id },
                              "Đã hủy gán.",
                            )
                          }
                        >
                          Hủy gán
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() =>
                          setBanGiao({
                            id: n.id,
                            slug: n.slug,
                            queryDich: "",
                            xacNhanSlug: "",
                          })
                        }
                      >
                        Gán tài khoản thật
                      </button>
                    )}
                  </td>
                  <td>
                    <div className="tkai-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy}
                        title="Sửa"
                        aria-label={`Sửa @${n.slug}`}
                        onClick={() =>
                          setSua({
                            id: n.id,
                            slug: n.slug,
                            tenHienThi: n.tenHienThi || n.slug,
                            tenThat: n.tenThat || "",
                            lienHe: n.lienHe || "",
                            lienKetNguon: (n.lienKetNguon || []).join("\n"),
                            trangThaiXinPhep: (["chua_lien_he", "dang_cho", "dong_y", "tu_choi"].includes(
                              n.trangThaiXinPhep || "",
                            )
                              ? n.trangThaiXinPhep
                              : "chua_lien_he") as
                              | "chua_lien_he"
                              | "dang_cho"
                              | "dong_y"
                              | "tu_choi",
                          })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost tkai-row-actions__danger"
                        disabled={busy}
                        title="Xóa"
                        aria-label={`Xóa @${n.slug}`}
                        onClick={() => void xoaNick(n)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!hien.length ? (
                <tr>
                  <td colSpan={9} className="tkai-muted">
                    {chiChuaXong
                      ? "Không còn nick thiếu KPI hôm nay."
                      : "Chưa có nick."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {sua ? (
        <div className="tkai-modal" role="dialog" aria-modal>
          <div className="tkai-modal__card">
            <header className="tkai-modal__head">
              <strong>Sửa @{sua.slug}</strong>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSua(null)}
              >
                <X size={16} />
              </button>
            </header>
            <form className="tkai-form tkai-clone-form" onSubmit={luuSua}>
              <label className="tkai-field">
                <span>Tên hiển thị *</span>
                <input
                  required
                  value={sua.tenHienThi}
                  onChange={(e) =>
                    setSua((s) =>
                      s ? { ...s, tenHienThi: e.target.value } : s,
                    )
                  }
                />
              </label>
              <label className="tkai-field">
                <span>Tên artist thật</span>
                <input
                  value={sua.tenThat}
                  onChange={(e) =>
                    setSua((s) =>
                      s ? { ...s, tenThat: e.target.value } : s,
                    )
                  }
                />
              </label>
              <label className="tkai-field">
                <span>URL liên hệ</span>
                <input
                  value={sua.lienHe}
                  onChange={(e) =>
                    setSua((s) =>
                      s ? { ...s, lienHe: e.target.value } : s,
                    )
                  }
                />
              </label>
              <label className="tkai-field">
                <span>Xin phép</span>
                <select
                  value={sua.trangThaiXinPhep}
                  onChange={(e) =>
                    setSua((s) =>
                      s
                        ? {
                            ...s,
                            trangThaiXinPhep: e.target
                              .value as typeof s.trangThaiXinPhep,
                          }
                        : s,
                    )
                  }
                >
                  <option value="chua_lien_he">Chưa liên hệ</option>
                  <option value="dang_cho">Đang chờ</option>
                  <option value="dong_y">Đồng ý</option>
                  <option value="tu_choi">Từ chối</option>
                </select>
              </label>
              <label className="tkai-field tkai-field--wide">
                <span>Link portfolio / update</span>
                <textarea
                  value={sua.lienKetNguon}
                  rows={3}
                  onChange={(e) =>
                    setSua((s) =>
                      s ? { ...s, lienKetNguon: e.target.value } : s,
                    )
                  }
                />
              </label>
              <div className="tkai-clone-form__actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                >
                  Lưu
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setSua(null)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {banGiao ? (
        <div className="tkai-modal" role="dialog" aria-modal>
          <div className="tkai-modal__card">
            <header className="tkai-modal__head">
              <strong>Bàn giao @{banGiao.slug}</strong>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setBanGiao(null)}
              >
                <X size={16} />
              </button>
            </header>
            <p className="tkai-meta">
              Tìm user CINs (tên / slug / email). Ưu tiên tài khoản trống
              (0 nội dung). Sau apply không hoàn tác.
            </p>
            <div className="tkai-user-search">
              <input
                placeholder="Gõ tên, @slug hoặc email…"
                value={banGiao.queryDich}
                autoComplete="off"
                onChange={(e) =>
                  setBanGiao((b) =>
                    b
                      ? {
                          ...b,
                          queryDich: e.target.value,
                          tenDich: null,
                        }
                      : b,
                  )
                }
              />
              {dichDangTim ? (
                <p className="tkai-meta tkai-user-search__hint">
                  <Loader2 className="tkai-spin" size={12} /> Đang tìm…
                </p>
              ) : null}
              {dichGoiY.length > 0 ? (
                <ul className="tkai-user-search__list" role="listbox">
                  {dichGoiY.map((u) => (
                    <li key={u.slug}>
                      <button
                        type="button"
                        className="tkai-user-search__item"
                        onClick={() => {
                          setDichGoiY([]);
                          setBanGiao((b) =>
                            b
                              ? {
                                  ...b,
                                  queryDich: u.slug,
                                  tenDich: u.tenHienThi,
                                }
                              : b,
                          );
                        }}
                      >
                        <span
                          className={`admin-nguoi-dung-ava${u.avatarUrl ? " admin-nguoi-dung-ava--has-img" : ""}`}
                          aria-hidden
                        >
                          {u.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={u.avatarUrl} alt="" />
                          ) : (
                            (u.tenHienThi || u.slug).charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="tkai-user-search__meta">
                          <strong>{u.tenHienThi || u.slug}</strong>
                          <span className="tkai-muted">
                            @{u.slug}
                            {u.email ? ` · ${u.email}` : ""}
                            {" · "}
                            {u.soNoiDung === 0
                              ? "trống"
                              : `${u.soNoiDung} bài`}
                          </span>
                        </span>
                        {u.soNoiDung === 0 ? (
                          <span className="tkai-chip is-ok">OK</span>
                        ) : (
                          <span className="tkai-chip tkai-chip--warn">có bài</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : banGiao.queryDich.trim().length > 0 && !dichDangTim ? (
                <p className="tkai-meta tkai-user-search__hint">
                  Không khớp user nào.
                </p>
              ) : null}
              {banGiao.tenDich ? (
                <p className="tkai-meta">
                  Đã chọn: <strong>{banGiao.tenDich}</strong> (@
                  {banGiao.queryDich})
                </p>
              ) : null}
            </div>
            <div className="tkai-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || !banGiao.queryDich.trim()}
                onClick={() =>
                  void run(
                    {
                      action: "gan_dich",
                      id: banGiao.id,
                      queryDich: banGiao.queryDich,
                    },
                    "Đã gán — xác nhận Apply.",
                  ).then((d) => {
                    if (d) setBanGiao(null);
                  })
                }
              >
                Gán (chưa apply)
              </button>
            </div>
            <hr className="tkai-hr" />
            <p className="tkai-meta">
              Apply: gõ đúng slug <strong>{banGiao.slug}</strong>
            </p>
            <input
              placeholder={`Gõ ${banGiao.slug}`}
              value={banGiao.xacNhanSlug}
              onChange={(e) =>
                setBanGiao((b) =>
                  b ? { ...b, xacNhanSlug: e.target.value } : b,
                )
              }
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                busy ||
                banGiao.xacNhanSlug.trim().toLowerCase() !==
                  banGiao.slug.toLowerCase()
              }
              onClick={() =>
                void run(
                  {
                    action: "apply_ban_giao",
                    id: banGiao.id,
                    xacNhanSlug: banGiao.xacNhanSlug,
                  },
                  "Đã bàn giao.",
                ).then((d) => {
                  if (d) {
                    if (d.canhBaoXoaAuth) {
                      setErr(String(d.canhBaoXoaAuth));
                    }
                    setBanGiao(null);
                  }
                })
              }
            >
              <Check size={14} /> Apply bàn giao
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

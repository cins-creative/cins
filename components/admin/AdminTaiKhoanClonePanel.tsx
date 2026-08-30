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
import { webHref } from "@/lib/cins/manage-site";

type Props = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  setMsg: (v: string | null) => void;
  setErr: (v: string | null) => void;
  postAction: (
    body: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  coVault: boolean;
  /** KPI tổng ngày từ overview (null = chưa migrate / lỗi). */
  kpi?: {
    mucTieuNgay: number;
    baiMoiLuot: number;
    tongDaDang: number;
    soTaiKhoanDu: number;
    soTaiKhoanCan: number;
    daPhanBo: boolean;
  } | null;
  onKpiUpdated?: () => void;
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
  kpi,
  onKpiUpdated,
}: Props) {
  const [nicks, setNicks] = useState<AutopilotNickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [chiChuaXong, setChiChuaXong] = useState(false);
  const [mucTieuDraft, setMucTieuDraft] = useState(20);
  const [baiMoiLuotDraft, setBaiMoiLuotDraft] = useState(1);
  const [form, setForm] = useState<{
    tenHienThi: string;
    tenThat: string;
    lienKetNguon: string;
    lienHe: string;
    trangThaiXinPhep: "chua_lien_he" | "dang_cho" | "dong_y" | "tu_choi";
    ghiChu: string;
  }>({
    tenHienThi: "",
    tenThat: "",
    lienKetNguon: "",
    lienHe: "",
    trangThaiXinPhep: "chua_lien_he",
    ghiChu: "",
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
    ghiChu: string;
  } | null>(null);
  const [chiTiet, setChiTiet] = useState<AutopilotNickRow | null>(null);
  const [pwMoi, setPwMoi] = useState<{ slug: string; matKhau: string } | null>(
    null,
  );

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
        const aClone = a.loai === "clone" ? 0 : 1;
        const bClone = b.loai === "clone" ? 0 : 1;
        if (aClone !== bClone) return aClone - bClone;
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

  useEffect(() => {
    if (!kpi) return;
    setMucTieuDraft(kpi.mucTieuNgay);
    setBaiMoiLuotDraft(kpi.baiMoiLuot);
  }, [kpi?.mucTieuNgay, kpi?.baiMoiLuot]);

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

  const luuKpiCauHinh = async (epPhanBoLai: boolean) => {
    const data = await run(
      {
        action: "cap_nhat_kpi_cau_hinh",
        mucTieuNgay: mucTieuDraft,
        baiMoiLuot: baiMoiLuotDraft,
        epPhanBoLai,
      },
      epPhanBoLai
        ? "Đã lưu KPI và phân bổ lại hôm nay."
        : "Đã lưu cấu hình KPI (chưa phân bổ lại).",
    );
    if (data) onKpiUpdated?.();
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
        ghiChu: form.ghiChu || null,
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
        ghiChu: "",
      });
      setMoForm(false);
      const mk = typeof data.matKhau === "string" ? data.matKhau : null;
      const slug = typeof data.slug === "string" ? data.slug : null;
      if (mk && slug) setPwMoi({ slug, matKhau: mk });
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
        ghiChu: sua.ghiChu || null,
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

  const datLaiMk = async (n: AutopilotNickRow) => {
    if (
      !confirm(
        `Đặt lại mật khẩu @${n.slug}? Mật khẩu cũ hết hiệu lực; vault ghi lại bằng key hiện tại.`,
      )
    ) {
      return;
    }
    const data = await run(
      { action: "dat_lai_mat_khau", id: n.id },
      `Đã đặt lại mật khẩu @${n.slug}.`,
    );
    const mk = typeof data?.matKhau === "string" ? data.matKhau : null;
    if (mk) {
      setPwMoi({ slug: n.slug, matKhau: mk });
      setChiTiet((c) => (c && c.id === n.id ? { ...c, matKhau: mk } : c));
    }
  };

  const moSua = (n: AutopilotNickRow) => {
    setSua({
      id: n.id,
      slug: n.slug,
      tenHienThi: n.tenHienThi || n.slug,
      tenThat: n.tenThat || "",
      lienHe: n.lienHe || "",
      lienKetNguon: (n.lienKetNguon || []).join("\n"),
      ghiChu: n.ghiChu || "",
      trangThaiXinPhep: (["chua_lien_he", "dang_cho", "dong_y", "tu_choi"].includes(
        n.trangThaiXinPhep || "",
      )
        ? n.trangThaiXinPhep
        : "chua_lien_he") as "chua_lien_he" | "dang_cho" | "dong_y" | "tu_choi",
    });
  };

  /** Mở card chi tiết khi click row — bỏ qua click vào link/nút/input bên trong. */
  const moChiTiet = (
    e: React.MouseEvent<HTMLTableRowElement>,
    n: AutopilotNickRow,
  ) => {
    const t = e.target as HTMLElement;
    if (t.closest("a, button, input, select, textarea, label")) return;
    setChiTiet(n);
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
      ) : nicks.some((n) => n.coMatKhauVault && !n.matKhau) ? (
        <div className="tkai-flash tkai-flash--err" role="alert">
          Key hiện tại không mở được vault (key lệch so với lúc mã hóa, hoặc
          blob hỏng). Đặt lại mật khẩu trên từng nick — Auth + vault ghi mới.
        </div>
      ) : null}

      <div className="tkai-kpi-bar">
        <div className="tkai-kpi-bar__text">
          {kpi
            ? `KPI hôm nay · ${kpi.tongDaDang}/${kpi.mucTieuNgay} bài · ${kpi.soTaiKhoanDu}/${kpi.soTaiKhoanCan} đủ`
            : "KPI hôm nay — chưa có dữ liệu (migrate / phân bổ lần đầu)."}
        </div>
        <div className="tkai-kpi-bar__setup">
          <label className="tkai-kpi-bar__field">
            <span>Mục tiêu/ngày</span>
            <input
              type="number"
              min={0}
              max={500}
              inputMode="numeric"
              disabled={busy}
              value={mucTieuDraft}
              onChange={(e) =>
                setMucTieuDraft(
                  Math.min(500, Math.max(0, Number(e.target.value) || 0)),
                )
              }
            />
          </label>
          <label className="tkai-kpi-bar__field">
            <span>Bài/lượt</span>
            <input
              type="number"
              min={1}
              max={20}
              inputMode="numeric"
              disabled={busy}
              value={baiMoiLuotDraft}
              onChange={(e) =>
                setBaiMoiLuotDraft(
                  Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                )
              }
            />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            title="Lưu cấu hình và phân bổ lại KPI hôm nay cho roster"
            onClick={() => void luuKpiCauHinh(true)}
          >
            Lưu & phân bổ
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            title="Giữ cấu hình hiện tại, chỉ phân bổ lại theo freeze hôm nay"
            onClick={() =>
              void (async () => {
                const data = await run(
                  { action: "phan_bo_kpi_lai" },
                  "Đã phân bổ lại KPI hôm nay.",
                );
                if (data) onKpiUpdated?.();
              })()
            }
          >
            Phân bổ lại
          </button>
        </div>
      </div>

      <p className="tkai-meta">
        Nick seeding — admin up thủ công. Slug tự sinh từ tên. Bàn giao khi
        artist nhận tài khoản. Mục tiêu/ngày = tổng bài cần up; bài/lượt =
        mỗi nick được giao bao nhiêu bài khi phân bổ.
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
          <label className="tkai-field tkai-field--wide">
            <span>Ghi chú</span>
            <textarea
              placeholder="Ghi chú vận hành nội bộ (tùy chọn)"
              value={form.ghiChu}
              rows={2}
              onChange={(e) =>
                setForm((f) => ({ ...f, ghiChu: e.target.value }))
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
                <th className="tkai-col-portfolio">Portfolio</th>
                <th>KPI</th>
                <th>Ghi chú</th>
                <th>Nội dung</th>
                <th>Mật khẩu</th>
                <th>Bàn giao</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {hien.map((n) => (
                <tr
                  key={n.id}
                  data-clickable
                  title="Click xem chi tiết"
                  onClick={(e) => moChiTiet(e, n)}
                >
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
                      <Link href={webHref(`/${n.slug}/journey`)} target="_blank">
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
                  <td className="tkai-col-portfolio">
                    <div className="tkai-url-chips">
                      {(n.lienKetNguon || []).map((u) => (
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
                      {!n.lienKetNguon?.length ? (
                        <span className="tkai-muted">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{kpiBadge(n)}</td>
                  <td>
                    {n.ghiChu ? (
                      <span className="tkai-ghi-chu" title={n.ghiChu}>
                        {n.ghiChu}
                      </span>
                    ) : (
                      <span className="tkai-muted">—</span>
                    )}
                  </td>
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
                    ) : n.coMatKhauVault ? (
                      <div className="tkai-pw-cell">
                        <span className="tkai-muted">
                          {coVault ? "Lỗi giải mã" : "Thiếu vault key"}
                        </span>
                        {coVault ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busy}
                            title="Đặt lại mật khẩu"
                            onClick={() => void datLaiMk(n)}
                          >
                            Đặt lại
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="tkai-muted">—</span>
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
                        onClick={() => moSua(n)}
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
                  <td colSpan={10} className="tkai-muted">
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

      {chiTiet ? (
        <div
          className="tkai-modal"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setChiTiet(null);
          }}
        >
          <div className="tkai-modal__card tkai-detail">
            <header className="tkai-modal__head">
              <div className="tkai-detail__user">
                <span
                  className={`admin-nguoi-dung-ava${chiTiet.avatarUrl ? " admin-nguoi-dung-ava--has-img" : ""}`}
                  aria-hidden
                >
                  {chiTiet.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={chiTiet.avatarUrl} alt="" />
                  ) : (
                    (chiTiet.tenHienThi || chiTiet.slug || "?")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </span>
                <span className="tkai-detail__name">
                  <strong>{chiTiet.tenHienThi || chiTiet.slug}</strong>
                  <Link href={webHref(`/${chiTiet.slug}/journey`)} target="_blank">
                    @{chiTiet.slug}
                  </Link>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                aria-label="Đóng"
                onClick={() => setChiTiet(null)}
              >
                <X size={16} />
              </button>
            </header>
            <dl className="tkai-detail__grid">
              <dt>Tên artist thật</dt>
              <dd>{chiTiet.tenThat || "—"}</dd>
              <dt>Xin phép</dt>
              <dd>
                <span className="tkai-chip">
                  {chiTiet.trangThaiXinPhep || "—"}
                </span>
              </dd>
              <dt>Liên hệ</dt>
              <dd>
                {chiTiet.lienHe ? (
                  /^https?:\/\//i.test(chiTiet.lienHe.trim()) ? (
                    <a
                      href={chiTiet.lienHe.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tkai-chip tkai-chip--link"
                    >
                      <Link2 size={12} /> {chipNenTang(chiTiet.lienHe)}
                    </a>
                  ) : (
                    chiTiet.lienHe
                  )
                ) : (
                  "—"
                )}
              </dd>
              <dt>Portfolio</dt>
              <dd>
                {chiTiet.lienKetNguon?.length ? (
                  <span className="tkai-url-chips">
                    {chiTiet.lienKetNguon.map((u) => (
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
                  </span>
                ) : (
                  "—"
                )}
              </dd>
              <dt>KPI hôm nay</dt>
              <dd>{kpiBadge(chiTiet)}</dd>
              <dt>Nội dung</dt>
              <dd>{chiTiet.soNoiDung ?? 0} bài</dd>
              <dt>Mật khẩu</dt>
              <dd>
                {chiTiet.matKhau ? (
                  <span className="tkai-pw-cell">
                    <code className="tkai-pw tkai-pw--inline">
                      {chiTiet.matKhau}
                    </code>
                    <button
                      type="button"
                      className="btn btn-ghost tkai-card__link"
                      title="Copy mật khẩu"
                      onClick={() => {
                        void navigator.clipboard.writeText(chiTiet.matKhau!);
                        setMsg(`Đã copy mật khẩu @${chiTiet.slug}.`);
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </span>
                ) : chiTiet.coMatKhauVault && coVault ? (
                  <span className="tkai-pw-cell">
                    <span className="tkai-muted">Lỗi giải mã</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => void datLaiMk(chiTiet)}
                    >
                      Đặt lại
                    </button>
                  </span>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Bàn giao</dt>
              <dd>
                {chiTiet.trangThaiBanGiao === "cho_ban_giao"
                  ? `Gán → @${chiTiet.slugDich || "?"}`
                  : chiTiet.trangThaiBanGiao || "—"}
              </dd>
              <dt>Ghi chú</dt>
              <dd>{chiTiet.ghiChu || "—"}</dd>
            </dl>
            <div className="tkai-clone-form__actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  moSua(chiTiet);
                  setChiTiet(null);
                }}
              >
                <Pencil size={14} /> Sửa
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setChiTiet(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pwMoi ? (
        <div
          className="tkai-modal"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setPwMoi(null);
          }}
        >
          <div className="tkai-modal__card">
            <header className="tkai-modal__head">
              <strong>Mật khẩu @{pwMoi.slug}</strong>
              <button
                type="button"
                className="btn btn-ghost"
                aria-label="Đóng"
                onClick={() => setPwMoi(null)}
              >
                <X size={16} />
              </button>
            </header>
            <p className="tkai-meta">
              Copy ngay — không hiện lại nếu key lệch lần sau.
            </p>
            <div className="tkai-pw-cell">
              <code className="tkai-pw tkai-pw--inline">{pwMoi.matKhau}</code>
              <button
                type="button"
                className="btn btn-ghost tkai-card__link"
                title="Copy mật khẩu"
                onClick={() => {
                  void navigator.clipboard.writeText(pwMoi.matKhau);
                  setMsg(`Đã copy mật khẩu @${pwMoi.slug}.`);
                }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              <label className="tkai-field tkai-field--wide">
                <span>Ghi chú</span>
                <textarea
                  placeholder="Ghi chú vận hành nội bộ (tùy chọn)"
                  value={sua.ghiChu}
                  rows={2}
                  onChange={(e) =>
                    setSua((s) =>
                      s ? { ...s, ghiChu: e.target.value } : s,
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

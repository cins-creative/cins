import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AutopilotBanThaoRow,
  AutopilotDaDangRow,
  AutopilotMucRow,
  AutopilotNguonRow,
  AutopilotNickRow,
  AutopilotOverview,
  NenTangAuto,
} from "@/lib/admin/autopilot-types";
import { layHanMucHomNay, tangHanMuc } from "@/lib/autopilot/han-muc";
import {
  kenhTuNiche,
  NICK_SEED,
  nicheVoiKenh,
} from "@/lib/autopilot/nick-seed";
import { diemTrungNiche, ngayVn, tachNiche } from "@/lib/autopilot/ngay-vn";
import {
  doanNenTangTuUrl,
  nhanNenTang,
  taoDongGhiNguon,
  type NenTangNguon,
} from "@/lib/editor/khoi-bai-nguon";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

function adminDb(): SupabaseClient {
  if (!hasServiceRoleEnv()) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY");
  }
  return createServiceRoleClient();
}

/** Supabase embed có thể trả object hoặc mảng 1 phần tử tùy typings. */
function asOne<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!raw) throw new Error("Thiếu NEXT_PUBLIC_SITE_URL");
  return raw;
}

function secretDangBai(): string {
  const s = process.env.CINS_NOI_BO_DANG_BAI_SECRET?.trim();
  if (!s) throw new Error("Thiếu CINS_NOI_BO_DANG_BAI_SECRET");
  return s;
}

function truncate(s: string, max: number): string {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function soanHeuristic(params: {
  tieuDeGoc?: string | null;
  moTaGoc?: string | null;
  tenTacGia?: string | null;
  nenTang: string;
}): { tieuDe: string; moTa: string } {
  const nen = nhanNenTang(
    (["artstation", "behance", "pixiv", "khac"].includes(params.nenTang)
      ? params.nenTang
      : "khac") as NenTangNguon,
  );
  const goc = truncate(params.tieuDeGoc || "", 120);
  const tacGia = String(params.tenTacGia || "").trim();
  const tieuDe =
    goc && !/^https?:/i.test(goc)
      ? goc
      : tacGia
        ? `Gợi ý từ ${nen}: ${tacGia}`
        : `Gợi ý từ ${nen}`;
  let moTa = truncate(params.moTaGoc || "", 400);
  if (!moTa) {
    moTa = tacGia
      ? `Chia sẻ tác phẩm của ${tacGia} trên ${nen} — tham khảo phong cách, không phải portfolio cá nhân.`
      : `Chia sẻ tác phẩm đáng chú ý trên ${nen} — xem bản gốc qua liên kết.`;
  }
  return { tieuDe: truncate(tieuDe, 120), moTa };
}

type NickRowDb = {
  id: string;
  slug: string;
  niche: string[] | null;
  dang_bat: boolean;
};

function chonNick(
  muc: {
    nen_tang: string;
    meta?: { niche?: unknown } | null;
    _nguonNiche?: string | null;
  },
  nicks: NickRowDb[],
  roundRobinIdx: number,
): NickRowDb {
  const nen = muc.nen_tang;
  const metaNiche = tachNiche(muc.meta?.niche);
  const nguonNiche = tachNiche(muc._nguonNiche);
  const mucNiche = [...new Set([...metaNiche, ...nguonNiche])].filter(
    (t) => !String(t).startsWith("nguon:"),
  );

  const cungKenh = nicks.filter((n) => {
    const k = kenhTuNiche(n.niche || []);
    if (nen === "artstation") return k === "artstation";
    if (nen === "behance") return k === "behance";
    if (nen === "pixiv") return k === "pixiv";
    return k === "artstation" || k === "behance" || k === "pixiv";
  });
  const pool = cungKenh.length
    ? cungKenh
    : nicks.filter((n) => kenhTuNiche(n.niche || []) !== "truyen");
  const sorted = [...(pool.length ? pool : nicks)].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );
  const nick = sorted[roundRobinIdx % sorted.length]!;
  void diemTrungNiche(
    mucNiche,
    (nick.niche || []).filter((t) => !String(t).startsWith("nguon:")),
  );
  return nick;
}

export async function layAutopilotOverview(): Promise<AutopilotOverview> {
  const db = adminDb();
  const [
    nickAll,
    nickBat,
    nguonAll,
    nguonBat,
    mucMoi,
    choDuyet,
    sanSang,
    daDangOk,
    nicks,
  ] = await Promise.all([
    db.from("auto_tai_khoan").select("id", { count: "exact", head: true }),
    db
      .from("auto_tai_khoan")
      .select("id", { count: "exact", head: true })
      .eq("dang_bat", true),
    db.from("auto_nguon").select("id", { count: "exact", head: true }),
    db
      .from("auto_nguon")
      .select("id", { count: "exact", head: true })
      .eq("dang_bat", true),
    db
      .from("auto_muc")
      .select("id", { count: "exact", head: true })
      .eq("trang_thai", "moi"),
    db
      .from("auto_ban_thao")
      .select("id", { count: "exact", head: true })
      .eq("trang_thai", "cho_duyet"),
    db
      .from("auto_ban_thao")
      .select("id", { count: "exact", head: true })
      .eq("trang_thai", "san_sang"),
    db
      .from("auto_da_dang")
      .select("id", { count: "exact", head: true })
      .eq("thanh_cong", true),
    db.from("auto_tai_khoan").select("niche").eq("dang_bat", true),
  ]);

  const theoKenh: Record<string, number> = {
    artstation: 0,
    behance: 0,
    pixiv: 0,
    truyen: 0,
    khac: 0,
  };
  for (const n of nicks.data || []) {
    const k = kenhTuNiche((n as { niche: string[] }).niche) || "khac";
    theoKenh[k] = (theoKenh[k] || 0) + 1;
  }

  return {
    ngayVn: ngayVn(),
    dem: {
      nick: nickAll.count ?? 0,
      nickBat: nickBat.count ?? 0,
      nguon: nguonAll.count ?? 0,
      nguonBat: nguonBat.count ?? 0,
      mucMoi: mucMoi.count ?? 0,
      choDuyet: choDuyet.count ?? 0,
      sanSang: sanSang.count ?? 0,
      daDangOk: daDangOk.count ?? 0,
    },
    env: {
      coSecretDangBai: Boolean(process.env.CINS_NOI_BO_DANG_BAI_SECRET?.trim()),
      coSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
      coAnthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    },
    theoKenh,
  };
}

export async function lietKeNick(): Promise<AutopilotNickRow[]> {
  const db = adminDb();
  const { data, error } = await db
    .from("auto_tai_khoan")
    .select(
      "id, slug, id_nguoi_dung, niche, dang_bat, han_muc_ngay, ghi_chu",
    )
    .order("slug");
  if (error) throw new Error(error.message);

  const rows: AutopilotNickRow[] = [];
  for (const r of data || []) {
    const hm = await layHanMucHomNay(db, {
      id: r.id,
      han_muc_ngay: r.han_muc_ngay,
    });
    rows.push({
      id: r.id,
      slug: r.slug,
      idNguoiDung: r.id_nguoi_dung,
      niche: r.niche || [],
      kenh: kenhTuNiche(r.niche || []),
      dangBat: r.dang_bat,
      hanMucNgay: r.han_muc_ngay,
      ghiChu: r.ghi_chu,
      homNayDaDang: hm.soDaDang,
      homNayHanMuc: hm.hanMuc,
    });
  }
  return rows;
}

export async function dongBoNick(): Promise<{ synced: number; thieu: number }> {
  const db = adminDb();
  const slugs = NICK_SEED.map((n) => n.slug);
  const { data: profiles, error: pErr } = await db
    .from("user_nguoi_dung")
    .select("id, slug")
    .in("slug", slugs);
  if (pErr) throw new Error(pErr.message);

  const bySlug = new Map((profiles || []).map((p) => [p.slug, p.id]));
  let synced = 0;
  let thieu = 0;

  for (const nick of NICK_SEED) {
    const idNguoiDung = bySlug.get(nick.slug) || null;
    if (!idNguoiDung) thieu += 1;
    const { error } = await db.from("auto_tai_khoan").upsert(
      {
        slug: nick.slug,
        id_nguoi_dung: idNguoiDung,
        niche: nicheVoiKenh(nick),
        dang_bat: nick.dangBat !== false,
        han_muc_ngay: 3,
        ghi_chu: nick.ghiChu,
        cap_nhat_luc: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
    if (error) throw new Error(`${nick.slug}: ${error.message}`);
    synced += 1;
  }
  return { synced, thieu };
}

export async function capNhatNick(params: {
  id: string;
  dangBat?: boolean;
  hanMucNgay?: number;
}): Promise<void> {
  const db = adminDb();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (typeof params.dangBat === "boolean") patch.dang_bat = params.dangBat;
  if (typeof params.hanMucNgay === "number") {
    const n = Math.min(50, Math.max(0, Math.floor(params.hanMucNgay)));
    patch.han_muc_ngay = n;
  }
  const { error } = await db
    .from("auto_tai_khoan")
    .update(patch)
    .eq("id", params.id);
  if (error) throw new Error(error.message);
}

export async function lietKeNguon(opts?: {
  nenTang?: string;
  limit?: number;
}): Promise<AutopilotNguonRow[]> {
  const db = adminDb();
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));
  let q = db
    .from("auto_nguon")
    .select(
      "id, nen_tang, url_ho_so, ma_ngoai, ten_hien_thi, niche, dang_bat, lan_quet_luc, ghi_chu",
    )
    .order("cap_nhat_luc", { ascending: false })
    .limit(limit);
  if (opts?.nenTang) q = q.eq("nen_tang", opts.nenTang);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({
    id: r.id,
    nenTang: r.nen_tang,
    urlHoSo: r.url_ho_so,
    maNgoai: r.ma_ngoai,
    tenHienThi: r.ten_hien_thi,
    niche: r.niche,
    dangBat: r.dang_bat,
    lanQuetLuc: r.lan_quet_luc,
    ghiChu: r.ghi_chu,
  }));
}

export async function themNguon(params: {
  nenTang: "artstation" | "behance" | "pixiv";
  urlHoSo: string;
  maNgoai?: string | null;
  tenHienThi?: string | null;
  niche?: string | null;
}): Promise<{ id: string }> {
  const db = adminDb();
  const url = params.urlHoSo.trim();
  if (!/^https:\/\//i.test(url)) throw new Error("URL phải là https://…");

  let maNgoai = params.maNgoai?.trim() || null;
  if (!maNgoai && params.nenTang === "pixiv") {
    const m = url.match(/\/users\/(\d+)/i);
    maNgoai = m?.[1] || null;
  }

  const { data, error } = await db
    .from("auto_nguon")
    .upsert(
      {
        nen_tang: params.nenTang,
        url_ho_so: url,
        ma_ngoai: maNgoai,
        ten_hien_thi: params.tenHienThi?.trim() || null,
        niche: params.niche?.trim() || null,
        dang_bat: true,
        cap_nhat_luc: new Date().toISOString(),
      },
      { onConflict: "nen_tang,url_ho_so" },
    )
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function capNhatNguon(params: {
  id: string;
  dangBat?: boolean;
  niche?: string | null;
  tenHienThi?: string | null;
}): Promise<void> {
  const db = adminDb();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (typeof params.dangBat === "boolean") patch.dang_bat = params.dangBat;
  if (params.niche !== undefined) patch.niche = params.niche?.trim() || null;
  if (params.tenHienThi !== undefined) {
    patch.ten_hien_thi = params.tenHienThi?.trim() || null;
  }
  const { error } = await db
    .from("auto_nguon")
    .update(patch)
    .eq("id", params.id);
  if (error) throw new Error(error.message);
}

export async function lietKeMuc(opts?: {
  trangThai?: string;
  nenTang?: string;
  limit?: number;
}): Promise<AutopilotMucRow[]> {
  const db = adminDb();
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
  let q = db
    .from("auto_muc")
    .select(
      "id, url_canonic, nen_tang, tieu_de_goc, ten_tac_gia, anh_bia_url, trang_thai, tao_luc",
    )
    .order("tao_luc", { ascending: false })
    .limit(limit);
  if (opts?.trangThai) q = q.eq("trang_thai", opts.trangThai);
  if (opts?.nenTang) q = q.eq("nen_tang", opts.nenTang);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({
    id: r.id,
    urlCanonic: r.url_canonic,
    nenTang: r.nen_tang,
    tieuDeGoc: r.tieu_de_goc,
    tenTacGia: r.ten_tac_gia,
    anhBiaUrl: r.anh_bia_url,
    trangThai: r.trang_thai,
    taoLuc: r.tao_luc,
  }));
}

export async function boQuaMuc(id: string): Promise<void> {
  const db = adminDb();
  const { error } = await db
    .from("auto_muc")
    .update({
      trang_thai: "bo_qua",
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("trang_thai", "moi");
  if (error) throw new Error(error.message);
}

export async function nhapMuc(params: {
  url: string;
  nenTang?: NenTangAuto;
  tieuDe?: string | null;
  tacGia?: string | null;
  moTa?: string | null;
  anhBia?: string | null;
}): Promise<{ them: boolean }> {
  const db = adminDb();
  const url = params.url.trim().split("?")[0]!;
  if (!/^https:\/\//i.test(url)) throw new Error("URL phải là https://…");

  let nenTang = params.nenTang || doanNenTangTuUrl(url);
  if (!["artstation", "behance", "pixiv", "khac"].includes(nenTang)) {
    nenTang = "khac";
  }

  const { data: existing } = await db
    .from("auto_muc")
    .select("id")
    .eq("url_canonic", url)
    .maybeSingle();
  if (existing) return { them: false };

  const { error } = await db.from("auto_muc").insert({
    url_canonic: url,
    nen_tang: nenTang,
    tieu_de_goc: (params.tieuDe || url).trim().slice(0, 500),
    mo_ta_goc: params.moTa?.trim() || null,
    ten_tac_gia: params.tacGia?.trim() || null,
    anh_bia_url: params.anhBia?.trim() || null,
    meta: { nhapTay: true, tuAdmin: true },
    trang_thai: "moi",
  });
  if (error) throw new Error(error.message);
  return { them: true };
}

export async function lietKeBanThao(opts?: {
  trangThai?: string;
  limit?: number;
}): Promise<AutopilotBanThaoRow[]> {
  const db = adminDb();
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
  const trangThai = opts?.trangThai || "cho_duyet";
  const { data, error } = await db
    .from("auto_ban_thao")
    .select(
      `
      id, tieu_de, mo_ta, dong_ghi_nguon, trang_thai, tao_luc,
      auto_tai_khoan ( slug ),
      auto_muc ( url_canonic, nen_tang, anh_bia_url, ten_tac_gia )
    `,
    )
    .eq("trang_thai", trangThai)
    .order("tao_luc", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data || []).map((r) => {
    const tk = asOne(r.auto_tai_khoan as { slug?: string } | { slug?: string }[]);
    const muc = asOne(
      r.auto_muc as
        | {
            url_canonic?: string;
            nen_tang?: string;
            anh_bia_url?: string;
            ten_tac_gia?: string;
          }
        | {
            url_canonic?: string;
            nen_tang?: string;
            anh_bia_url?: string;
            ten_tac_gia?: string;
          }[],
    );
    return {
      id: r.id,
      tieuDe: r.tieu_de,
      moTa: r.mo_ta,
      dongGhiNguon: r.dong_ghi_nguon,
      trangThai: r.trang_thai,
      taoLuc: r.tao_luc,
      slug: tk?.slug || null,
      urlCanonic: muc?.url_canonic || null,
      nenTang: muc?.nen_tang || null,
      anhBiaUrl: muc?.anh_bia_url || null,
      tenTacGia: muc?.ten_tac_gia || null,
    };
  });
}

export async function duyetBanThao(ids: string[]): Promise<{ duyet: number }> {
  const db = adminDb();
  const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    100,
  );
  if (!unique.length) return { duyet: 0 };

  let duyet = 0;
  for (const id of unique) {
    const { data: bt, error } = await db
      .from("auto_ban_thao")
      .select("id, id_muc")
      .eq("id", id)
      .eq("trang_thai", "cho_duyet")
      .maybeSingle<{ id: string; id_muc: string }>();
    if (error) throw new Error(error.message);
    if (!bt) continue;

    const { error: upBt } = await db
      .from("auto_ban_thao")
      .update({
        trang_thai: "san_sang",
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", bt.id)
      .eq("trang_thai", "cho_duyet");
    if (upBt) throw new Error(upBt.message);

    if (bt.id_muc) {
      await db
        .from("auto_muc")
        .update({
          trang_thai: "san_sang",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", bt.id_muc);
    }
    duyet += 1;
  }
  return { duyet };
}

export async function huyBanThao(ids: string[]): Promise<{ huy: number }> {
  const db = adminDb();
  const unique = [...new Set(ids.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    100,
  );
  let huy = 0;
  for (const id of unique) {
    const { data: bt } = await db
      .from("auto_ban_thao")
      .select("id, id_muc, trang_thai")
      .eq("id", id)
      .in("trang_thai", ["cho_duyet", "san_sang", "nhap"])
      .maybeSingle<{ id: string; id_muc: string; trang_thai: string }>();
    if (!bt) continue;

    await db
      .from("auto_ban_thao")
      .update({
        trang_thai: "huy",
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", bt.id);

    if (bt.id_muc) {
      await db
        .from("auto_muc")
        .update({
          trang_thai: "bo_qua",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", bt.id_muc);
    }
    huy += 1;
  }
  return { huy };
}

export async function chuanBiDang(opts?: {
  gioiHan?: number;
}): Promise<{ tao: number }> {
  const db = adminDb();
  const gioiHan = Math.min(50, Math.max(1, opts?.gioiHan ?? 20));

  const { data: nicks, error: nickErr } = await db
    .from("auto_tai_khoan")
    .select("id, slug, niche, dang_bat, han_muc_ngay")
    .eq("dang_bat", true)
    .order("slug");
  if (nickErr) throw new Error(nickErr.message);
  if (!nicks?.length) {
    throw new Error("Chưa có nick bật — bấm Đồng bộ nick trước.");
  }

  const { data: daCoBanThao, error: btErr } = await db
    .from("auto_ban_thao")
    .select("id_muc")
    .neq("trang_thai", "huy");
  if (btErr) throw new Error(btErr.message);
  const mucDaCo = new Set((daCoBanThao || []).map((r) => r.id_muc));

  const { data: mucs, error: mucErr } = await db
    .from("auto_muc")
    .select(
      "id, id_nguon, url_canonic, nen_tang, tieu_de_goc, mo_ta_goc, ten_tac_gia, meta, trang_thai",
    )
    .eq("trang_thai", "moi")
    .order("tao_luc", { ascending: true })
    .limit(Math.min(200, gioiHan * 3));
  if (mucErr) throw new Error(mucErr.message);

  const hangDoi = (mucs || [])
    .filter((m) => !mucDaCo.has(m.id))
    .slice(0, gioiHan);
  if (!hangDoi.length) return { tao: 0 };

  const idNguons = [
    ...new Set(hangDoi.map((m) => m.id_nguon).filter(Boolean)),
  ] as string[];
  const nguonNicheMap = new Map<string, string | null>();
  if (idNguons.length) {
    const { data: nguons } = await db
      .from("auto_nguon")
      .select("id, niche")
      .in("id", idNguons);
    for (const n of nguons || []) nguonNicheMap.set(n.id, n.niche);
  }

  let rr = 0;
  let tao = 0;
  for (const muc of hangDoi) {
    const nick = chonNick(
      {
        nen_tang: muc.nen_tang,
        meta: muc.meta as { niche?: unknown } | null,
        _nguonNiche: nguonNicheMap.get(muc.id_nguon || "") || null,
      },
      nicks as NickRowDb[],
      rr,
    );
    rr += 1;

    const soan = soanHeuristic({
      tieuDeGoc: muc.tieu_de_goc,
      moTaGoc: muc.mo_ta_goc,
      tenTacGia: muc.ten_tac_gia,
      nenTang: muc.nen_tang,
    });
    const dongGhiNguon = taoDongGhiNguon({
      urlNguon: muc.url_canonic,
      nenTang: muc.nen_tang as NenTangNguon,
      tenTacGiaNguon: muc.ten_tac_gia,
    });

    const { error: insErr } = await db.from("auto_ban_thao").insert({
      id_muc: muc.id,
      id_tai_khoan: nick.id,
      tieu_de: soan.tieuDe.slice(0, 200),
      mo_ta: soan.moTa,
      dong_ghi_nguon: dongGhiNguon,
      blocks: null,
      trang_thai: "cho_duyet",
    });
    if (insErr) continue;

    await db
      .from("auto_muc")
      .update({
        trang_thai: "cho_duyet",
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", muc.id);
    tao += 1;
  }
  return { tao };
}

export async function lietKeDaDang(opts?: {
  limit?: number;
}): Promise<AutopilotDaDangRow[]> {
  const db = adminDb();
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 40));
  const { data, error } = await db
    .from("auto_da_dang")
    .select(
      `
      id, url_canonic, thanh_cong, loi, duong_dan, slug_bai, tao_luc,
      auto_tai_khoan ( slug )
    `,
    )
    .order("tao_luc", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map((r) => {
    const tk = asOne(r.auto_tai_khoan as { slug?: string } | { slug?: string }[]);
    return {
      id: r.id,
      urlCanonic: r.url_canonic,
      thanhCong: r.thanh_cong,
      loi: r.loi,
      duongDan: r.duong_dan,
      slugBai: r.slug_bai,
      taoLuc: r.tao_luc,
      slugNick: tk?.slug || null,
    };
  });
}

type BanThaoDang = {
  id: string;
  tieu_de: string | null;
  mo_ta: string | null;
  dong_ghi_nguon: string | null;
  tk: {
    id: string;
    slug: string;
    dang_bat: boolean;
    han_muc_ngay: number;
  };
  muc: {
    id: string;
    url_canonic: string;
    nen_tang: string;
    ten_tac_gia: string | null;
    anh_bia_url: string | null;
  };
};

export async function chayDang(opts?: {
  gioiHan?: number;
  slug?: string;
}): Promise<{ dang: number; boQua: number; loi: number }> {
  const db = adminDb();
  const gioiHan = Math.min(30, Math.max(1, opts?.gioiHan ?? 10));
  const slugFilter = opts?.slug?.trim().toLowerCase() || "";
  const secret = secretDangBai();
  const base = siteUrl();

  const { data: rows, error } = await db
    .from("auto_ban_thao")
    .select(
      `
      id, tieu_de, mo_ta, dong_ghi_nguon, trang_thai,
      id_tai_khoan, id_muc,
      auto_tai_khoan ( id, slug, dang_bat, han_muc_ngay ),
      auto_muc ( id, url_canonic, nen_tang, ten_tac_gia, anh_bia_url, trang_thai )
    `,
    )
    .eq("trang_thai", "san_sang")
    .order("tao_luc", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);

  let hang: BanThaoDang[] = [];
  for (const r of rows || []) {
    const tk = asOne(
      r.auto_tai_khoan as
        | BanThaoDang["tk"]
        | BanThaoDang["tk"][]
        | null,
    );
    const muc = asOne(
      r.auto_muc as BanThaoDang["muc"] | BanThaoDang["muc"][] | null,
    );
    if (!tk?.dang_bat || !muc?.url_canonic) continue;
    if (slugFilter && tk.slug !== slugFilter) continue;
    hang.push({
      id: r.id,
      tieu_de: r.tieu_de,
      mo_ta: r.mo_ta,
      dong_ghi_nguon: r.dong_ghi_nguon,
      tk,
      muc,
    });
  }

  if (!hang.length) return { dang: 0, boQua: 0, loi: 0 };

  const urls = hang.map((r) => r.muc.url_canonic);
  const { data: daDangOk } = await db
    .from("auto_da_dang")
    .select("url_canonic")
    .eq("thanh_cong", true)
    .in("url_canonic", urls);
  const urlDaDang = new Set((daDangOk || []).map((r) => r.url_canonic));
  hang = hang.filter((r) => !urlDaDang.has(r.muc.url_canonic));

  const theoNick = new Map<string, BanThaoDang[]>();
  for (const r of hang) {
    const slug = r.tk.slug;
    if (!theoNick.has(slug)) theoNick.set(slug, []);
    theoNick.get(slug)!.push(r);
  }

  let dang = 0;
  let boQua = 0;
  let loi = 0;
  let conTong = gioiHan;

  for (const [slug, list] of theoNick) {
    if (conTong <= 0) break;
    const tk = list[0]!.tk;
    const hm = await layHanMucHomNay(db, tk);
    let conNick = hm.conLai;

    for (const bt of list) {
      if (conTong <= 0 || conNick <= 0) {
        boQua += 1;
        continue;
      }
      const muc = bt.muc;

      const res = await fetch(`${base}/api/noi-bo/tac-pham/dang`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          slugChu: slug,
          urlNguon: muc.url_canonic,
          tieuDe: bt.tieu_de || "",
          moTa: bt.mo_ta || "",
          nenTang: muc.nen_tang,
          tenTacGiaNguon: muc.ten_tac_gia || undefined,
          dongGhiNguon: bt.dong_ghi_nguon || undefined,
          anhBiaUrl: muc.anh_bia_url || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        idTacPham?: string;
        idCotMoc?: string;
        slugBai?: string;
        duongDan?: string;
      } | null;

      await db.from("auto_da_dang").insert({
        id_ban_thao: bt.id,
        id_tai_khoan: tk.id,
        id_muc: muc.id,
        url_canonic: muc.url_canonic,
        id_tac_pham: data?.idTacPham || null,
        id_cot_moc: data?.idCotMoc || null,
        slug_bai: data?.slugBai || null,
        duong_dan: data?.duongDan || null,
        thanh_cong: Boolean(data?.ok),
        loi: data?.ok ? null : data?.error || `HTTP ${res.status}`,
        phan_hoi: data || { status: res.status },
      });

      if (!data?.ok) {
        await db
          .from("auto_muc")
          .update({
            trang_thai: "loi",
            cap_nhat_luc: new Date().toISOString(),
          })
          .eq("id", muc.id);
        loi += 1;
        continue;
      }

      await db
        .from("auto_ban_thao")
        .update({
          trang_thai: "da_dung",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", bt.id);
      await db
        .from("auto_muc")
        .update({
          trang_thai: "da_dang",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", muc.id);

      hm.soDaDang += 1;
      await tangHanMuc(db, hm.id, hm.soDaDang);
      dang += 1;
      conNick -= 1;
      conTong -= 1;
    }
  }

  return { dang, boQua, loi };
}

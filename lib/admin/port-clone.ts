/**
 * Admin kéo portfolio vào nick seeding (clone / AI roster), user thật, hoặc ORG.
 * Plan: docs → Clone portfolio extensions.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { lietKeNick } from "@/lib/admin/autopilot";
import type { AutopilotNickRow } from "@/lib/admin/autopilot-types";
import { insertDiemFeedChoBaiMoi } from "@/lib/cins/feed-scoring-write";
import { ensureEmbedAutoCover } from "@/lib/editor/ensure-embed-auto-cover";
import type { Block } from "@/lib/editor/types";
import {
  applyPortImport,
  buildPortPreview,
  type PortImportPreview,
  type PortPlatform,
} from "@/lib/port/import";
import { getAvatarUrl } from "@/lib/journey/profile";
import { orgLoaiLabel, orgPostHref } from "@/lib/search/helpers";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";
import {
  ORG_BAI_DANG_API_SELECT,
} from "@/lib/truong/bai-dang-api-fields";
import {
  sanitizeBaiDangBlocksInput,
  validateOrgBaiDangContent,
} from "@/lib/truong/bai-dang-blocks";
import { sanitizeBaiDangCoverIdInput } from "@/lib/truong/bai-dang-cover";
import { resolveOrgBaiDangLoaiForWrite } from "@/lib/truong/bai-dang";

const PLATFORMS: readonly PortPlatform[] = ["behance", "artstation", "carrd"];
const USER_SEARCH_LIMIT = 24;
const ORG_SEARCH_LIMIT = 24;

/** Org có Journey `org_bai_dang` — không gồm cộng đồng (post = content_cot_moc). */
const PORT_CLONE_ORG_LOAI = [
  "truong_dai_hoc",
  "co_so_dao_tao",
  "studio",
  "doanh_nghiep",
] as const;

function adminDb(): SupabaseClient {
  if (!hasServiceRoleEnv()) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY");
  }
  return createServiceRoleClient();
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!raw) throw new Error("Thiếu NEXT_PUBLIC_SITE_URL");
  return raw;
}

export type PortCloneNick = {
  id: string;
  slug: string;
  tenHienThi: string | null;
  loai: string;
  avatarUrl: string | null;
  idNguoiDung: string;
};

export type PortCloneUserThat = {
  idNguoiDung: string;
  slug: string;
  tenHienThi: string | null;
  avatarUrl: string | null;
};

export type PortCloneOrg = {
  idToChuc: string;
  slug: string;
  ten: string;
  loaiToChuc: string;
  loaiLabel: string;
  avatarUrl: string | null;
};

type ImportTargetUser = {
  kind: "user";
  slug: string;
  idNguoiDung: string;
};

type ImportTargetOrg = {
  kind: "org";
  idToChuc: string;
  slug: string;
  loaiToChuc: string;
};

type ImportTarget = ImportTargetUser | ImportTargetOrg;

/** Roster cho extension — ưu tiên clone, kèm ai có profile. */
export async function lietKeNickPortClone(): Promise<PortCloneNick[]> {
  const rows = await lietKeNick({ skipPhanBo: true });
  const mapped = rows
    .filter((n): n is AutopilotNickRow & { idNguoiDung: string } =>
      Boolean(n.idNguoiDung),
    )
    .map((n) => ({
      id: n.id,
      slug: n.slug,
      tenHienThi: n.tenHienThi || n.tenThat,
      loai: n.loai,
      avatarUrl: n.avatarUrl,
      idNguoiDung: n.idNguoiDung,
    }));
  mapped.sort((a, b) => {
    const pa = a.loai === "clone" ? 0 : 1;
    const pb = b.loai === "clone" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.slug.localeCompare(b.slug);
  });
  return mapped;
}

/**
 * Search user thật (đã onboarding), loại trừ profile nằm trong `auto_tai_khoan`.
 */
export async function timUserThatPortClone(
  qRaw: string,
): Promise<PortCloneUserThat[]> {
  const q = qRaw.trim().replace(/^@+/, "");
  if (q.length < 2) return [];

  const db = adminDb();
  const { data: seedingRows, error: seedErr } = await db
    .from("auto_tai_khoan")
    .select("id_nguoi_dung")
    .not("id_nguoi_dung", "is", null);
  if (seedErr) throw new Error(seedErr.message);
  const seedingIds = new Set(
    (seedingRows ?? [])
      .map((r) =>
        typeof (r as { id_nguoi_dung?: string }).id_nguoi_dung === "string"
          ? (r as { id_nguoi_dung: string }).id_nguoi_dung
          : "",
      )
      .filter(Boolean),
  );

  const safe = q.replace(/[%_]/g, "").trim();
  if (safe.length < 2) return [];
  const like = `%${safe}%`;

  const [bySlug, byName] = await Promise.all([
    db
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
      .not("giai_doan", "is", null)
      .ilike("slug", like)
      .order("slug", { ascending: true })
      .limit(USER_SEARCH_LIMIT),
    db
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
      .not("giai_doan", "is", null)
      .ilike("ten_hien_thi", like)
      .order("slug", { ascending: true })
      .limit(USER_SEARCH_LIMIT),
  ]);

  if (bySlug.error) throw new Error(bySlug.error.message);
  if (byName.error) throw new Error(byName.error.message);

  const seen = new Set<string>();
  const items: PortCloneUserThat[] = [];
  for (const row of [...(bySlug.data ?? []), ...(byName.data ?? [])]) {
    const id = String((row as { id?: string }).id || "");
    if (!id || seen.has(id) || seedingIds.has(id)) continue;
    seen.add(id);
    items.push({
      idNguoiDung: id,
      slug: String((row as { slug?: string }).slug || ""),
      tenHienThi:
        ((row as { ten_hien_thi?: string | null }).ten_hien_thi || null) ?? null,
      avatarUrl: getAvatarUrl(
        (row as { avatar_id?: string | null }).avatar_id ?? null,
      ),
    });
    if (items.length >= USER_SEARCH_LIMIT) break;
  }
  return items.filter((u) => u.slug);
}

/**
 * Search org có Journey `org_bai_dang` (trường / CSĐT / studio).
 */
export async function timOrgPortClone(qRaw: string): Promise<PortCloneOrg[]> {
  const q = qRaw.trim().replace(/^@+/, "");
  if (q.length < 2) return [];

  const safe = q.replace(/[%_]/g, "").trim();
  if (safe.length < 2) return [];
  const like = `%${safe}%`;

  const db = adminDb();
  const [bySlug, byTen] = await Promise.all([
    db
      .from("org_to_chuc")
      .select("id, ten, slug, loai_to_chuc, avatar_id, trang_thai_hoat_dong")
      .in("loai_to_chuc", [...PORT_CLONE_ORG_LOAI])
      .neq("trang_thai_hoat_dong", "da_dong_cua")
      .ilike("slug", like)
      .order("slug", { ascending: true })
      .limit(ORG_SEARCH_LIMIT),
    db
      .from("org_to_chuc")
      .select("id, ten, slug, loai_to_chuc, avatar_id, trang_thai_hoat_dong")
      .in("loai_to_chuc", [...PORT_CLONE_ORG_LOAI])
      .neq("trang_thai_hoat_dong", "da_dong_cua")
      .ilike("ten", like)
      .order("slug", { ascending: true })
      .limit(ORG_SEARCH_LIMIT),
  ]);

  if (bySlug.error) throw new Error(bySlug.error.message);
  if (byTen.error) throw new Error(byTen.error.message);

  const seen = new Set<string>();
  const items: PortCloneOrg[] = [];
  for (const row of [...(bySlug.data ?? []), ...(byTen.data ?? [])]) {
    const id = String((row as { id?: string }).id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const loai = String(
      (row as { loai_to_chuc?: string }).loai_to_chuc || "",
    );
    const slug = String((row as { slug?: string }).slug || "");
    if (!slug) continue;
    items.push({
      idToChuc: id,
      slug,
      ten: String((row as { ten?: string }).ten || slug),
      loaiToChuc: loai,
      loaiLabel: orgLoaiLabel(loai),
      avatarUrl: getAvatarUrl(
        (row as { avatar_id?: string | null }).avatar_id ?? null,
      ),
    });
    if (items.length >= ORG_SEARCH_LIMIT) break;
  }
  return items;
}

async function resolveNick(idTaiKhoan: string): Promise<ImportTargetUser> {
  const db = adminDb();
  const { data, error } = await db
    .from("auto_tai_khoan")
    .select("id, slug, id_nguoi_dung")
    .eq("id", idTaiKhoan)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id_nguoi_dung) {
    throw new Error("Nick chưa gắn profile — không import được.");
  }
  return {
    kind: "user",
    slug: data.slug as string,
    idNguoiDung: data.id_nguoi_dung as string,
  };
}

async function resolveUserThat(idNguoiDung: string): Promise<ImportTargetUser> {
  const db = adminDb();
  const { data, error } = await db
    .from("user_nguoi_dung")
    .select("id, slug, giai_doan")
    .eq("id", idNguoiDung)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id || !data.slug) {
    throw new Error("Không tìm thấy user.");
  }
  if (data.giai_doan == null) {
    throw new Error("User chưa hoàn tất onboarding.");
  }
  return {
    kind: "user",
    slug: data.slug as string,
    idNguoiDung: data.id as string,
  };
}

async function resolveOrg(idToChuc: string): Promise<ImportTargetOrg> {
  const db = adminDb();
  const { data, error } = await db
    .from("org_to_chuc")
    .select("id, slug, loai_to_chuc, trang_thai_hoat_dong")
    .eq("id", idToChuc)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id || !data.slug) {
    throw new Error("Không tìm thấy tổ chức.");
  }
  const loai = String(data.loai_to_chuc || "");
  if (
    !(PORT_CLONE_ORG_LOAI as readonly string[]).includes(loai)
  ) {
    throw new Error(
      "ORG này không dùng org_bai_dang (cộng đồng đăng qua Journey thành viên).",
    );
  }
  if (data.trang_thai_hoat_dong === "da_dong_cua") {
    throw new Error("Tổ chức đã đóng cửa.");
  }
  return {
    kind: "org",
    idToChuc: data.id as string,
    slug: data.slug as string,
    loaiToChuc: loai,
  };
}

function countTargets(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
  idToChuc?: string | null;
}): number {
  return [
    params.idTaiKhoan?.trim(),
    params.idNguoiDung?.trim(),
    params.idToChuc?.trim(),
  ].filter(Boolean).length;
}

async function resolveImportTarget(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
  idToChuc?: string | null;
}): Promise<ImportTarget> {
  const idTaiKhoan = params.idTaiKhoan?.trim() || "";
  const idNguoiDung = params.idNguoiDung?.trim() || "";
  const idToChuc = params.idToChuc?.trim() || "";
  if (countTargets(params) > 1) {
    throw new Error("Chỉ chọn một đích: nick seeding, user thật, hoặc ORG.");
  }
  if (idTaiKhoan) return resolveNick(idTaiKhoan);
  if (idNguoiDung) return resolveUserThat(idNguoiDung);
  if (idToChuc) return resolveOrg(idToChuc);
  throw new Error("Thiếu idTaiKhoan, idNguoiDung hoặc idToChuc.");
}

function loaiBaiDangChoPortOrg(loaiToChuc: string): string {
  if (loaiToChuc === "studio" || loaiToChuc === "doanh_nghiep") {
    return resolveOrgBaiDangLoaiForWrite("showcase");
  }
  return resolveOrgBaiDangLoaiForWrite("su_kien");
}

async function applyPortImportToOrg(params: {
  target: ImportTargetOrg;
  preview: PortImportPreview;
}): Promise<{ duongDan: string; slugBai: string }> {
  const { target, preview } = params;
  let blocks = sanitizeBaiDangBlocksInput(preview.blocks);
  if (!blocks.length) {
    throw new Error("Preview không có block.");
  }

  let coverId = sanitizeBaiDangCoverIdInput(preview.coverId, blocks);
  try {
    const autoCover = await ensureEmbedAutoCover({
      coverId,
      blocks: blocks as Block[],
    });
    blocks = autoCover.blocks;
    coverId = autoCover.coverId;
  } catch {
    /* best-effort */
  }

  const contentCheck = validateOrgBaiDangContent({
    tomTat: preview.moTa,
    coverId,
    blocks,
  });
  if (!contentCheck.ok) {
    throw new Error(contentCheck.error);
  }
  const tomTat = contentCheck.resolution.effectiveMoTa;

  const db = adminDb();
  const insertRow = {
    id_to_chuc: target.idToChuc,
    tieu_de: preview.tieuDe,
    tom_tat: tomTat,
    noi_dung_blocks: blocks,
    cover_id: coverId,
    loai_bai_dang: loaiBaiDangChoPortOrg(target.loaiToChuc),
    trang_thai: "da_dang",
  };

  const { data, error } = await db
    .from("org_bai_dang")
    .insert(insertRow)
    .select(ORG_BAI_DANG_API_SELECT)
    .single();
  if (error) throw new Error(error.message);

  const row = data as {
    id: string;
    tom_tat?: string | null;
    cover_id?: string | null;
    noi_dung_blocks?: unknown;
  };

  await insertDiemFeedChoBaiMoi({
    loai: "org_bai_dang",
    id: row.id,
    coverId: typeof row.cover_id === "string" ? row.cover_id : null,
    moTa: typeof row.tom_tat === "string" ? row.tom_tat : null,
    blocks: Array.isArray(row.noi_dung_blocks)
      ? (row.noi_dung_blocks as Block[])
      : null,
    hasTag: false,
  });

  return {
    duongDan: orgPostHref(target.loaiToChuc, target.slug, row.id),
    slugBai: row.id,
  };
}

export async function importPortVaoNick(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
  idToChuc?: string | null;
  platform: string;
  url: string;
  html: string;
  fallbackTitle?: string | null;
  apply?: boolean;
  preview?: PortImportPreview | null;
}): Promise<{
  preview: PortImportPreview;
  duongDan?: string;
  slugBai?: string;
}> {
  const platform = params.platform as PortPlatform;
  if (!PLATFORMS.includes(platform)) {
    throw new Error("Nền tảng chưa hỗ trợ (behance / artstation / carrd).");
  }
  const target = await resolveImportTarget({
    idTaiKhoan: params.idTaiKhoan,
    idNguoiDung: params.idNguoiDung,
    idToChuc: params.idToChuc,
  });

  let preview: PortImportPreview;
  if (params.apply && params.preview && Array.isArray(params.preview.blocks)) {
    preview = params.preview;
  } else {
    const html = String(params.html || "");
    if (!html) throw new Error("Thiếu html / JSON project.");
    if (html.length > 6_000_000) throw new Error("Nội dung project quá lớn.");
    preview = await buildPortPreview({
      platform,
      url: params.url,
      html,
      fallbackTitle: params.fallbackTitle,
    });
  }

  if (!params.apply) {
    return { preview };
  }

  if (preview.soAnh <= 0 && preview.soVideo <= 0 && preview.blocks.length === 0) {
    throw new Error("Không còn media để đăng (có thể toàn bộ ảnh >10MB).");
  }
  if (preview.blocks.length === 0) {
    throw new Error("Preview không có block.");
  }

  if (target.kind === "org") {
    const result = await applyPortImportToOrg({ target, preview });
    return { preview, ...result };
  }

  const result = await applyPortImport({
    idNguoiDung: target.idNguoiDung,
    slugChu: target.slug,
    preview,
    cheDoHienThi: "public",
  });
  if (!result.ok) {
    throw new Error(result.error || "Không đăng được bài.");
  }
  return {
    preview,
    duongDan: result.duongDan,
    slugBai: result.slugBai,
  };
}

/** Magic link đăng nhập đúng auth của nick/user → redirect tới bài.
 *  ORG: trả URL tuyệt đối (admin đã đăng nhập — không magic link). */
export async function taoMagicLinkMoBai(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
  idToChuc?: string | null;
  duongDan: string;
}): Promise<{ actionLink: string; email: string | null }> {
  const path = params.duongDan.startsWith("/")
    ? params.duongDan
    : `/${params.duongDan}`;
  const absolute = `${siteUrl()}${path}`;

  if (params.idToChuc?.trim()) {
    await resolveOrg(params.idToChuc.trim());
    return { actionLink: absolute, email: null };
  }

  const target = await resolveImportTarget({
    idTaiKhoan: params.idTaiKhoan,
    idNguoiDung: params.idNguoiDung,
  });
  if (target.kind !== "user") {
    return { actionLink: absolute, email: null };
  }

  const redirectTo = absolute;
  const db = adminDb();
  const { data: profile, error: pErr } = await db
    .from("user_nguoi_dung")
    .select("auth_user_id")
    .eq("id", target.idNguoiDung)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile?.auth_user_id) {
    throw new Error("Thiếu auth_user_id.");
  }

  const { data: authUser, error: aErr } = await db.auth.admin.getUserById(
    profile.auth_user_id as string,
  );
  if (aErr || !authUser.user?.email) {
    throw new Error(aErr?.message || "Không lấy được email auth.");
  }
  const email = authUser.user.email;

  const { data: linkData, error: lErr } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (lErr) throw new Error(lErr.message);
  const actionLink =
    linkData?.properties?.action_link ||
    (linkData as { action_link?: string } | null)?.action_link;
  if (!actionLink) {
    throw new Error("Không tạo được magic link.");
  }
  return { actionLink, email };
}

export function isPortClonePlatform(v: unknown): v is PortPlatform {
  return typeof v === "string" && PLATFORMS.includes(v as PortPlatform);
}

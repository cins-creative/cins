/**
 * Admin kéo portfolio vào nick seeding (clone / AI roster) hoặc user thật.
 * Plan: docs → Clone portfolio extensions.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { lietKeNick } from "@/lib/admin/autopilot";
import type { AutopilotNickRow } from "@/lib/admin/autopilot-types";
import {
  applyPortImport,
  buildPortPreview,
  type PortImportPreview,
  type PortPlatform,
} from "@/lib/port/import";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

const PLATFORMS: readonly PortPlatform[] = ["behance", "artstation", "carrd"];
const USER_SEARCH_LIMIT = 24;

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

type ImportTarget = {
  slug: string;
  idNguoiDung: string;
};

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

async function resolveNick(idTaiKhoan: string): Promise<ImportTarget> {
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
    slug: data.slug as string,
    idNguoiDung: data.id_nguoi_dung as string,
  };
}

async function resolveUserThat(idNguoiDung: string): Promise<ImportTarget> {
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
    slug: data.slug as string,
    idNguoiDung: data.id as string,
  };
}

async function resolveImportTarget(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
}): Promise<ImportTarget> {
  const idTaiKhoan = params.idTaiKhoan?.trim() || "";
  const idNguoiDung = params.idNguoiDung?.trim() || "";
  if (idTaiKhoan && idNguoiDung) {
    throw new Error("Chỉ chọn một đích: nick seeding hoặc user thật.");
  }
  if (idTaiKhoan) return resolveNick(idTaiKhoan);
  if (idNguoiDung) return resolveUserThat(idNguoiDung);
  throw new Error("Thiếu idTaiKhoan hoặc idNguoiDung.");
}

export async function importPortVaoNick(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
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

/** Magic link đăng nhập đúng auth của nick/user → redirect tới bài. */
export async function taoMagicLinkMoBai(params: {
  idTaiKhoan?: string | null;
  idNguoiDung?: string | null;
  duongDan: string;
}): Promise<{ actionLink: string; email: string }> {
  const target = await resolveImportTarget({
    idTaiKhoan: params.idTaiKhoan,
    idNguoiDung: params.idNguoiDung,
  });
  const path = params.duongDan.startsWith("/")
    ? params.duongDan
    : `/${params.duongDan}`;
  const redirectTo = `${siteUrl()}${path}`;

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

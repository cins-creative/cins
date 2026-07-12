import "server-only";

import { CONG_DONG_CATEGORY_MAX } from "@/lib/cong-dong/constants";
import { isCongDongAdmin } from "@/lib/cong-dong/membership";
import type { CongDongCategory } from "@/lib/cong-dong/types";
import { resolveHubArticleThumbSync, resolveHubArticleImages } from "@/lib/bai-viet/thumbnail";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export { CONG_DONG_CATEGORY_MAX };

const CATEGORY_KEY = "danh_muc";

const ALLOWED_LOAI = new Set(["nganh_dao_tao"]);

const CATEGORY_ARTICLE_SELECT =
  "id, slug, tieu_de, loai_bai_viet, tom_tat, meta_description, cover_id, thumbnail, linh_vuc:id_linh_vuc(slug, ten)";

type CategoryArticleRow = {
  id: string;
  slug: string;
  tieu_de: string;
  loai_bai_viet: string;
  tom_tat: string | null;
  meta_description: string | null;
  cover_id: string | null;
  thumbnail: string | null;
  linh_vuc: { slug: string; ten: string } | null;
};

async function mapCategoryArticleRow(
  row: CategoryArticleRow,
): Promise<CongDongCategory> {
  const { thumb_url } = await resolveHubArticleImages({
    thumbnail: row.thumbnail,
    cover_id: row.cover_id,
  });
  const thumbUrl =
    thumb_url ??
    resolveHubArticleThumbSync({
      thumbnail: row.thumbnail,
      cover_id: row.cover_id,
    });

  return {
    id: row.id,
    slug: row.slug,
    tieuDe: row.tieu_de?.trim() || "Không tiêu đề",
    loaiBaiViet: row.loai_bai_viet as CongDongCategory["loaiBaiViet"],
    tomTat: row.tom_tat?.trim() || null,
    metaDescription: row.meta_description?.trim() || null,
    thumbUrl,
    coverId: row.cover_id?.trim() || null,
    thumbnail: row.thumbnail?.trim() || null,
    linhVucTen: row.linh_vuc?.ten?.trim() || null,
    linhVucSlug: row.linh_vuc?.slug?.trim() || null,
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export function parseCategoryIdsFromCauHinh(cauHinh: unknown): string[] {
  const root = asRecord(cauHinh);
  const raw = root[CATEGORY_KEY] ?? root.danhMuc;
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= CONG_DONG_CATEGORY_MAX) break;
  }
  return ids;
}

async function hydrateCategoryArticles(
  ids: string[],
): Promise<CongDongCategory[]> {
  if (!ids.length) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("article_bai_viet")
    .select(CATEGORY_ARTICLE_SELECT)
    .in("id", ids)
    .in("loai_bai_viet", ["nganh_dao_tao"])
    .eq("trang_thai_noi_dung", "published")
    .returns<CategoryArticleRow[]>();

  const rows = data ?? [];
  const mapped = await Promise.all(
    rows.map((row) => mapCategoryArticleRow(row)),
  );
  const byId = new Map(mapped.map((item) => [item.id, item]));

  const out: CongDongCategory[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item && ALLOWED_LOAI.has(item.loaiBaiViet)) {
      out.push(item);
    }
  }
  return out;
}

export async function loadCongDongCategories(
  orgId: string,
): Promise<CongDongCategory[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();

  const ids = parseCategoryIdsFromCauHinh(data?.cau_hinh);
  return hydrateCategoryArticles(ids);
}

async function persistCategoryIds(
  orgId: string,
  ids: string[],
  existingCauHinh: unknown,
) {
  const admin = createServiceRoleClient();
  const merged = {
    ...asRecord(existingCauHinh),
    [CATEGORY_KEY]: ids,
  };
  await admin
    .from("org_to_chuc")
    .update({ cau_hinh: merged })
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong");
}

export async function validateCategoryArticleIds(
  ids: string[],
): Promise<
  | { ok: true; categories: CongDongCategory[] }
  | { ok: false; error: string }
> {
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed) continue;
    if (!unique.includes(trimmed)) unique.push(trimmed);
  }

  if (unique.length > CONG_DONG_CATEGORY_MAX) {
    return {
      ok: false,
      error: `Tối đa ${CONG_DONG_CATEGORY_MAX} ngành đào tạo.`,
    };
  }

  if (!unique.length) {
    return { ok: true, categories: [] };
  }

  const categories = await hydrateCategoryArticles(unique);
  if (categories.length !== unique.length) {
    return {
      ok: false,
      error: "Một hoặc nhiều ngành không hợp lệ hoặc chưa được xuất bản.",
    };
  }

  return { ok: true, categories };
}

export async function updateCongDongCategories(params: {
  orgId: string;
  adminId: string;
  articleIds: string[];
}): Promise<
  | { ok: true; categories: CongDongCategory[] }
  | { ok: false; error: string }
> {
  if (!(await isCongDongAdmin(params.adminId, params.orgId))) {
    return { ok: false, error: "Chỉ admin mới chỉnh chủ đề nhóm." };
  }

  const validated = await validateCategoryArticleIds(params.articleIds);
  if (!validated.ok) return validated;

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("org_to_chuc")
    .select("cau_hinh")
    .eq("id", params.orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ cau_hinh: unknown }>();

  if (!row) return { ok: false, error: "Không tìm thấy cộng đồng." };

  const ids = validated.categories.map((c) => c.id);
  await persistCategoryIds(params.orgId, ids, row.cau_hinh);
  return { ok: true, categories: validated.categories };
}

export type CongDongCategoryArticleHit = CongDongCategory;

export async function searchCongDongCategoryArticles(
  query: string,
  limit = 16,
  loai?: CongDongCategory["loaiBaiViet"] | "all",
): Promise<CongDongCategoryArticleHit[]> {
  const q = query.trim();
  const admin = createServiceRoleClient();

  const loaiFilter =
    loai && loai !== "all" ? [loai] : (["nganh_dao_tao"] as const);

  let req = admin
    .from("article_bai_viet")
    .select(CATEGORY_ARTICLE_SELECT)
    .in("loai_bai_viet", [...loaiFilter])
    .eq("trang_thai_noi_dung", "published")
    .order("tieu_de", { ascending: true })
    .limit(limit);

  if (q) {
    const safe = q.replace(/[%_,]/g, "\\$&");
    req = req.or(
      `tieu_de.ilike.%${safe}%,slug.ilike.%${safe}%,tom_tat.ilike.%${safe}%,meta_description.ilike.%${safe}%`,
    );
  }

  const { data } = await req.returns<CategoryArticleRow[]>();

  return Promise.all((data ?? []).map((row) => mapCategoryArticleRow(row)));
}

export type CongDongOrgCategoryPreview = {
  id: string;
  slug: string;
  ten: string;
  avatarId: string | null;
  soThanhVien: number;
};

/** Cộng đồng gắn với bài nghề/ngành — phục vụ discovery từ trang bài viết. */
export async function listCongDongOrgsForArticle(
  articleId: string,
  limit = 8,
): Promise<CongDongOrgCategoryPreview[]> {
  const id = articleId.trim();
  if (!id) return [];

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, avatar_id, cau_hinh")
    .eq("loai_to_chuc", "cong_dong")
    .order("ten", { ascending: true })
    .limit(200);

  if (!rows?.length) return [];

  const matched = rows.filter((row) =>
    parseCategoryIdsFromCauHinh(row.cau_hinh).includes(id),
  );
  if (!matched.length) return [];

  const orgIds = matched.map((r) => r.id);
  const { data: memberRows } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc")
    .in("id_to_chuc", orgIds);

  const countMap = new Map<string, number>();
  for (const row of memberRows ?? []) {
    countMap.set(row.id_to_chuc, (countMap.get(row.id_to_chuc) ?? 0) + 1);
  }

  return matched.slice(0, limit).map((row) => ({
    id: row.id,
    slug: row.slug,
    ten: row.ten,
    avatarId: row.avatar_id,
    soThanhVien: countMap.get(row.id) ?? 0,
  }));
}

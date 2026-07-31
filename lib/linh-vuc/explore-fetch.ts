import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export type ExploreLinhVuc = {
  id: string;
  ten: string;
  slug: string;
  mo_ta: string | null;
  thumbnail_id: string | null;
  thu_tu: number;
};

export type ExploreNhom = {
  id: string;
  ten: string;
  slug: string;
  thu_tu: number;
  linh_vuc: ExploreLinhVuc[];
};

export type ExploreCatalog = {
  nhoms: ExploreNhom[];
  ungrouped: ExploreLinhVuc[];
  total: number;
};

/** Read-only catalog — bảng linh_vuc* (anon OK). Không migrate. */
export async function fetchExploreCatalog(): Promise<ExploreCatalog> {
  const supabase = await createClient();

  const [{ data: linhVucList }, { data: nhomList }, { data: ganNhom }] =
    await Promise.all([
      supabase
        .from("linh_vuc")
        .select("id, ten, slug, mo_ta, thumbnail_id, thu_tu")
        .eq("trang_thai", "active")
        .order("thu_tu"),
      supabase
        .from("linh_vuc_nhom")
        .select("id, ten, slug, thu_tu")
        .eq("trang_thai", "active")
        .order("thu_tu"),
      supabase
        .from("linh_vuc_gan_nhom")
        .select("id_linh_vuc, id_nhom, thu_tu")
        .order("thu_tu"),
    ]);

  const allLv = (linhVucList ?? []) as ExploreLinhVuc[];
  const allNhom = nhomList ?? [];
  const allGan = ganNhom ?? [];

  const nhomMap = new Map<string, ExploreNhom>();
  for (const n of allNhom) {
    nhomMap.set(n.id, { ...n, linh_vuc: [] });
  }

  const groupedLvIds = new Set<string>();
  for (const g of allGan) {
    const nhom = nhomMap.get(g.id_nhom);
    const lv = allLv.find((l) => l.id === g.id_linh_vuc);
    if (nhom && lv) {
      nhom.linh_vuc.push(lv);
      groupedLvIds.add(g.id_linh_vuc);
    }
  }

  for (const nhom of nhomMap.values()) {
    nhom.linh_vuc.sort((a, b) => a.thu_tu - b.thu_tu);
  }

  return {
    nhoms: [...nhomMap.values()].filter((n) => n.linh_vuc.length > 0),
    ungrouped: allLv.filter((lv) => !groupedLvIds.has(lv.id)),
    total: allLv.length,
  };
}

export type LinhVucDetail = {
  id: string;
  ten: string;
  slug: string;
  mo_ta: string | null;
  thumbnail_id: string | null;
};

export type LinhVucWorkCard = {
  id: string;
  tieu_de: string;
  slug: string;
  cover_id: string | null;
  che_do_hien_thi: string;
  authorSlug: string | null;
  authorName: string | null;
};

export type LinhVucWorksResult = {
  works: LinhVucWorkCard[];
  count: number;
  /** true nếu RLS/anon chặn và không có service role — UI hiện empty + ghi chú */
  blockedByRls: boolean;
  errorMessage: string | null;
};

export async function fetchLinhVucBySlug(
  slug: string,
): Promise<LinhVucDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("linh_vuc")
    .select("id, ten, slug, mo_ta, thumbnail_id")
    .eq("slug", slug)
    .eq("trang_thai", "active")
    .maybeSingle();
  return (data as LinhVucDetail | null) ?? null;
}

/**
 * Works theo lĩnh vực. Ưu tiên service role (cùng pattern Journey) vì RLS anon
 * gọi current_profile_id → 401. Chỉ lọc public|feature. Không sửa RLS/DB.
 */
export async function fetchWorksByLinhVucId(
  linhVucId: string,
  page: number,
  pageSize: number,
): Promise<LinhVucWorksResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = hasServiceRoleEnv()
    ? createServiceRoleClient()
    : await createClient();

  const { data, count, error } = await client
    .from("content_tac_pham")
    .select(
      `
      id,
      tieu_de,
      slug,
      cover_id,
      che_do_hien_thi,
      id_nguoi_dung,
      content_tac_pham_linh_vuc!inner(id_linh_vuc),
      user_nguoi_dung:id_nguoi_dung(slug, ten_hien_thi)
    `,
      { count: "exact" },
    )
    .eq("content_tac_pham_linh_vuc.id_linh_vuc", linhVucId)
    .in("che_do_hien_thi", ["public", "feature"])
    .order("tao_luc", { ascending: false })
    .range(from, to);

  if (error) {
    const blocked =
      error.message.includes("current_profile_id") ||
      error.code === "42501" ||
      error.code === "PGRST301";
    return {
      works: [],
      count: 0,
      blockedByRls: blocked && !hasServiceRoleEnv(),
      errorMessage: error.message,
    };
  }

  const works: LinhVucWorkCard[] = (data ?? []).map((w) => {
    const author = w.user_nguoi_dung as {
      slug: string;
      ten_hien_thi: string;
    } | null;
    return {
      id: w.id as string,
      tieu_de: w.tieu_de as string,
      slug: w.slug as string,
      cover_id: (w.cover_id as string | null) ?? null,
      che_do_hien_thi: w.che_do_hien_thi as string,
      authorSlug: author?.slug ?? null,
      authorName: author?.ten_hien_thi ?? null,
    };
  });

  return {
    works,
    count: count ?? 0,
    blockedByRls: false,
    errorMessage: null,
  };
}

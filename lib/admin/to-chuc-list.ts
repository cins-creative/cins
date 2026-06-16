import "server-only";

import type {
  AdminToChucListParams,
  AdminToChucListResponse,
  AdminToChucListRow,
  AdminToChucListStats,
  AdminToChucLoaiFilter,
} from "@/lib/admin/to-chuc-types";
import { formatTinhThanh, getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const LOAI_LABEL: Record<string, string> = {
  truong_dai_hoc: "Trường ĐH",
  co_so_dao_tao: "Cơ sở đào tạo",
  cong_dong: "Cộng đồng",
  studio: "Studio",
  doanh_nghiep: "Studio",
};

type DbRow = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
  tinh_thanh: string | null;
  trang_thai_tin_cay: string;
  avatar_id: string | null;
  org_co_so_dao_tao:
    | { da_verify: boolean }
    | { da_verify: boolean }[]
    | null;
  org_truong_dai_hoc:
    | { da_verify: boolean }
    | { da_verify: boolean }[]
    | null;
};

function firstRelation<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function normalizeLoai(loai: string): Exclude<AdminToChucLoaiFilter, "all"> {
  if (loai === "doanh_nghiep") return "studio";
  if (
    loai === "truong_dai_hoc" ||
    loai === "co_so_dao_tao" ||
    loai === "cong_dong" ||
    loai === "studio"
  ) {
    return loai;
  }
  return "studio";
}

function mapRow(row: DbRow): AdminToChucListRow {
  const loai = normalizeLoai(row.loai_to_chuc);
  const coSo = firstRelation(row.org_co_so_dao_tao);
  const truong = firstRelation(row.org_truong_dai_hoc);
  const showVerify =
    (loai === "co_so_dao_tao" && coSo?.da_verify === false) ||
    (loai === "truong_dai_hoc" && truong?.da_verify === false);

  return {
    id: row.id,
    ten: row.ten,
    slug: row.slug,
    loai,
    loaiLabel:
      LOAI_LABEL[row.loai_to_chuc] ?? row.loai_to_chuc.replace(/_/g, " "),
    tinhThanh: formatTinhThanh(row.tinh_thanh) ?? "—",
    tinCay: row.trang_thai_tin_cay,
    avatarUrl: getAvatarUrl(row.avatar_id),
    journey: "—",
    showVerify,
  };
}

function buildStats(rows: AdminToChucListRow[]): AdminToChucListStats {
  return {
    total: rows.length,
    pendingVerify: rows.filter((row) => row.showVerify).length,
    verified: rows.filter((row) => row.tinCay === "verified_official").length,
    truong: rows.filter((row) => row.loai === "truong_dai_hoc").length,
    coSo: rows.filter((row) => row.loai === "co_so_dao_tao").length,
    congDong: rows.filter((row) => row.loai === "cong_dong").length,
    studio: rows.filter((row) => row.loai === "studio").length,
  };
}

function matchesLoai(row: AdminToChucListRow, loai: AdminToChucLoaiFilter): boolean {
  if (loai === "all") return true;
  return row.loai === loai;
}

function matchesQuery(row: AdminToChucListRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    row.ten.toLowerCase().includes(needle) ||
    row.slug.toLowerCase().includes(needle) ||
    row.loaiLabel.toLowerCase().includes(needle) ||
    row.tinhThanh.toLowerCase().includes(needle)
  );
}

export async function fetchAdminToChucList(
  params: AdminToChucListParams,
): Promise<AdminToChucListResponse> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_to_chuc")
    .select(
      `id, ten, slug, loai_to_chuc, tinh_thanh, trang_thai_tin_cay, avatar_id,
      org_co_so_dao_tao ( da_verify ),
      org_truong_dai_hoc ( da_verify )`,
    )
    .order("ten", { ascending: true })
    .returns<DbRow[]>();

  if (error) {
    return {
      rows: [],
      stats: {
        total: 0,
        pendingVerify: 0,
        verified: 0,
        truong: 0,
        coSo: 0,
        congDong: 0,
        studio: 0,
      },
    };
  }

  const allRows = (data ?? []).map(mapRow);
  const stats = buildStats(allRows);
  const rows = allRows.filter(
    (row) => matchesLoai(row, params.loai) && matchesQuery(row, params.q),
  );

  return { rows, stats };
}

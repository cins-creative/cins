import "server-only";

import type {
  AdminToChucListParams,
  AdminToChucListResponse,
  AdminToChucListRow,
  AdminToChucListStats,
  AdminToChucLoaiFilter,
} from "@/lib/admin/to-chuc-types";
import { formatTinhThanh, getAvatarUrl } from "@/lib/journey/profile";
import { fetchOrgOwnerSummaries } from "@/lib/admin/org-members";
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
  nguoi_tao: string | null;
};

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

export function mapRow(row: DbRow): AdminToChucListRow {
  const loai = normalizeLoai(row.loai_to_chuc);
  /* Verify áp dụng cho trường & cơ sở đào tạo. Nút verify LUÔN hiển thị cho
     các loại này (dạng toggle): chưa verify → "Cấp Verified", đã verify →
     "Gỡ Verified". Nhờ vậy nút không biến mất sau khi cấp — admin có thể khôi
     phục / thu hồi. Dựa trên trang_thai_tin_cay (không phụ thuộc bản ghi con
     org_truong_dai_hoc/org_co_so_dao_tao có thể chưa tồn tại). */
  const isVerifiableLoai =
    loai === "co_so_dao_tao" || loai === "truong_dai_hoc";
  const isVerified = row.trang_thai_tin_cay === "verified_official";
  const showVerify = isVerifiableLoai;

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
    nguoiTao: null,
    chuTrang: null,
    showVerify,
    isVerified,
  };
}

function buildStats(rows: AdminToChucListRow[]): AdminToChucListStats {
  return {
    total: rows.length,
    pendingVerify: rows.filter((row) => row.showVerify && !row.isVerified).length,
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
    row.tinhThanh.toLowerCase().includes(needle) ||
    (row.nguoiTao?.ten.toLowerCase().includes(needle) ?? false) ||
    (row.chuTrang?.ten.toLowerCase().includes(needle) ?? false)
  );
}

/** Gắn thông tin người tạo (tên + slug) vào từng row theo `org_to_chuc.nguoi_tao`. */
async function attachNguoiTao(
  admin: ReturnType<typeof createServiceRoleClient>,
  rows: AdminToChucListRow[],
  creatorIdByOrg: Map<string, string | null>,
): Promise<void> {
  const creatorIds = Array.from(
    new Set(
      Array.from(creatorIdByOrg.values()).filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  if (creatorIds.length === 0) return;

  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .in("id", creatorIds)
    .returns<{ id: string; slug: string | null; ten_hien_thi: string | null }[]>();

  const creatorMap = new Map<string, AdminToChucListRow["nguoiTao"]>();
  for (const u of data ?? []) {
    creatorMap.set(u.id, {
      id: u.id,
      ten: u.ten_hien_thi?.trim() || u.slug || "Người dùng",
      slug: u.slug,
    });
  }

  for (const row of rows) {
    const creatorId = creatorIdByOrg.get(row.id);
    row.nguoiTao = creatorId ? creatorMap.get(creatorId) ?? null : null;
  }
}

export async function fetchAdminToChucList(
  params: AdminToChucListParams,
): Promise<AdminToChucListResponse> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_to_chuc")
    .select(
      `id, ten, slug, loai_to_chuc, tinh_thanh, trang_thai_tin_cay, avatar_id, nguoi_tao`,
    )
    .neq("trang_thai_hoat_dong", "da_dong_cua")
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
  const creatorIdByOrg = new Map<string, string | null>(
    (data ?? []).map((row) => [row.id, row.nguoi_tao]),
  );
  await attachNguoiTao(admin, allRows, creatorIdByOrg);

  const ownerMap = await fetchOrgOwnerSummaries(allRows.map((row) => row.id));
  for (const row of allRows) {
    const owner = ownerMap.get(row.id);
    row.chuTrang = owner ?? null;
  }

  const stats = buildStats(allRows);
  const rows = allRows.filter(
    (row) => matchesLoai(row, params.loai) && matchesQuery(row, params.q),
  );

  return { rows, stats };
}

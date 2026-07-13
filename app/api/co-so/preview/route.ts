import { NextResponse } from "next/server";

import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";
import { labelTinhThanh } from "@/lib/truong/contact";
import { CO_SO_DEFAULT_TAB, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: org, error } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, loai_to_chuc, avatar_id, cover_id, tinh_thanh, org_co_so_dao_tao ( da_verify, loai_co_so )",
    )
    .eq("slug", slug)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      mo_ta: string | null;
      loai_to_chuc: string;
      avatar_id: string | null;
      cover_id: string | null;
      tinh_thanh: string | null;
      org_co_so_dao_tao:
        | { da_verify: boolean | null; loai_co_so: string | null }
        | { da_verify: boolean | null; loai_co_so: string | null }[]
        | null;
    }>();

  if (error || !org) {
    return NextResponse.json({ error: "Không tìm thấy cơ sở." }, { status: 404 });
  }

  const extRaw = org.org_co_so_dao_tao;
  const ext = Array.isArray(extRaw) ? (extRaw[0] ?? null) : extRaw;

  const { data: khoaRows } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", org.id);

  const khoaIds = (khoaRows ?? []).map((row) => row.id as string);
  const soKhoaHoc = khoaIds.length;
  let soHocVien = 0;
  if (khoaIds.length > 0) {
    const { data: hvRows } = await admin
      .from("user_hoc_vien_lop")
      .select("id_nguoi_dung")
      .in("id_khoa_hoc", khoaIds)
      .in("trang_thai", ["da_dang_ky", "dang_hoc"]);
    soHocVien = new Set(
      (hvRows ?? []).map((row) => row.id_nguoi_dung as string),
    ).size;
  }

  return NextResponse.json({
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      moTa: org.mo_ta,
      avatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: getCoverUrl(org.cover_id),
      tinhThanh: labelTinhThanh(org.tinh_thanh),
      soHocVien,
      soKhoaHoc,
      daVerify: Boolean(ext?.da_verify),
      loaiCoSo: ext?.loai_co_so ?? null,
      href: coSoTabPath(org.slug, CO_SO_DEFAULT_TAB),
    },
  });
}

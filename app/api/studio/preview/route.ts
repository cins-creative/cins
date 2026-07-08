import { NextResponse } from "next/server";

import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";
import { labelTinhThanh } from "@/lib/truong/contact";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: org, error } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, mo_ta, loai_to_chuc, avatar_id, cover_id, tinh_thanh")
    .eq("slug", slug)
    .in("loai_to_chuc", ["studio", "doanh_nghiep"])
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      mo_ta: string | null;
      loai_to_chuc: string;
      avatar_id: string | null;
      cover_id: string | null;
      tinh_thanh: string | null;
    }>();

  if (error || !org) {
    return NextResponse.json({ error: "Không tìm thấy studio." }, { status: 404 });
  }

  const [{ count: memberCount }, jobResult, { count: postCount }] =
    await Promise.all([
      admin
        .from("user_thanh_vien_to_chuc")
        .select("id", { count: "exact", head: true })
        .eq("id_to_chuc", org.id),
      admin
        .from("org_tuyen_dung")
        .select("id", { count: "exact", head: true })
        .eq("id_to_chuc", org.id)
        .eq("da_xoa", false)
        .eq("trang_thai", "dang_mo"),
      admin
        .from("org_bai_dang")
        .select("id", { count: "exact", head: true })
        .eq("id_to_chuc", org.id)
        .eq("trang_thai", "da_dang"),
    ]);

  const jobCount = jobResult.error ? 0 : (jobResult.count ?? 0);

  return NextResponse.json({
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      moTa: org.mo_ta,
      avatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: getCoverUrl(org.cover_id),
      tinhThanh: labelTinhThanh(org.tinh_thanh),
      soThanhVien: memberCount ?? 0,
      soTuyenDung: jobCount,
      soBaiViet: postCount ?? 0,
      loaiToChuc: org.loai_to_chuc,
      href: `/studio/${org.slug}`,
    },
  });
}

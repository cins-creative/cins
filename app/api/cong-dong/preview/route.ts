import { NextResponse } from "next/server";

import { getCoverUrl } from "@/lib/articles/cover";
import { loadCongDongStatsByOrgIds } from "@/lib/cong-dong/stats";
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
    .eq("loai_to_chuc", "cong_dong")
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
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const stats = await loadCongDongStatsByOrgIds([org.id]);
  const orgStats = stats.get(org.id) ?? { memberCount: 0, postCount: 0 };

  return NextResponse.json({
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      moTa: org.mo_ta,
      avatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: getCoverUrl(org.cover_id),
      tinhThanh: labelTinhThanh(org.tinh_thanh),
      soThanhVien: orgStats.memberCount,
      soBaiViet: orgStats.postCount,
      href: `/cong-dong/${org.slug}`,
    },
  });
}

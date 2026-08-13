import { NextResponse } from "next/server";

import { getCoverUrl } from "@/lib/articles/cover";
import { countOrgApprovedDoanTags } from "@/lib/journey/org-milestone-tag";
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

  const [{ count: soKhoaHoc }, soXacThuc] = await Promise.all([
    admin
      .from("org_khoa_hoc")
      .select("id", { count: "exact", head: true })
      .eq("id_to_chuc", org.id),
    countOrgApprovedDoanTags(org.id),
  ]);

  return NextResponse.json({
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      moTa: org.mo_ta,
      avatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: getCoverUrl(org.cover_id),
      tinhThanh: labelTinhThanh(org.tinh_thanh),
      soKhoaHoc: soKhoaHoc ?? 0,
      soXacThuc,
      daVerify: Boolean(ext?.da_verify),
      loaiCoSo: ext?.loai_co_so ?? null,
      href: coSoTabPath(org.slug, CO_SO_DEFAULT_TAB),
    },
  });
}

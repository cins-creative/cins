import { NextResponse } from "next/server";

import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { labelTinhThanh } from "@/lib/truong/contact";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: org, error } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, loai_to_chuc, avatar_id, cover_id, tinh_thanh, org_truong_dai_hoc ( da_verify, nam_thanh_lap )",
    )
    .eq("slug", slug)
    .eq("loai_to_chuc", "truong_dai_hoc")
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      mo_ta: string | null;
      loai_to_chuc: string;
      avatar_id: string | null;
      cover_id: string | null;
      tinh_thanh: string | null;
      org_truong_dai_hoc:
        | { da_verify: boolean | null; nam_thanh_lap: number | null }
        | { da_verify: boolean | null; nam_thanh_lap: number | null }[]
        | null;
    }>();

  if (error || !org) {
    return NextResponse.json({ error: "Không tìm thấy trường." }, { status: 404 });
  }

  const extRaw = org.org_truong_dai_hoc;
  const ext = Array.isArray(extRaw) ? (extRaw[0] ?? null) : extRaw;

  const { count: soNganh } = await admin
    .from("org_truong_nganh")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", org.id);

  return NextResponse.json({
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      moTa: org.mo_ta,
      avatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: getCoverUrl(org.cover_id),
      tinhThanh: labelTinhThanh(org.tinh_thanh),
      soNganh: soNganh ?? 0,
      namThanhLap: ext?.nam_thanh_lap ?? null,
      daVerify: Boolean(ext?.da_verify),
      href: truongTabPath(org.slug, TRUONG_DEFAULT_TAB),
    },
  });
}

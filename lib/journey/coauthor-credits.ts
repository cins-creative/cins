import "server-only";

import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type AdminClient = ReturnType<typeof createServiceRoleClient>;

/** Credits hiển thị trên card — owner + cộng sự accepted/pending (không declined). */
export async function loadCoAuthorCredits(
  admin: AdminClient,
  tacPhamIds: string[],
): Promise<Map<string, CoAuthorCredit[]>> {
  const out = new Map<string, CoAuthorCredit[]>();
  if (tacPhamIds.length === 0) return out;

  const { data: rows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, id_nguoi_dung, vai_tro, la_chu_so_huu, thu_tu, trang_thai")
    .in("id_tac_pham", tacPhamIds)
    .in("trang_thai", ["accepted", "pending"])
    .order("la_chu_so_huu", { ascending: false })
    .order("thu_tu", { ascending: true });

  if (!rows?.length) return out;

  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung as string))];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  for (const row of rows) {
    const p = profileById.get(row.id_nguoi_dung as string);
    const trangThai = row.trang_thai as "pending" | "accepted";
    const credit: CoAuthorCredit = {
      idNguoiDung: row.id_nguoi_dung as string,
      name: (p?.ten_hien_thi as string) || (p?.slug as string) || "?",
      role: (row.vai_tro as string) || null,
      slug: (p?.slug as string) ?? null,
      avatarUrl: getAvatarUrl((p?.avatar_id as string) || null) ?? null,
      initial: ((p?.ten_hien_thi as string) || (p?.slug as string) || "?")
        .slice(0, 1)
        .toUpperCase(),
      laChuSoHuu: Boolean(row.la_chu_so_huu),
      trangThai,
    };
    const list = out.get(row.id_tac_pham as string) ?? [];
    list.push(credit);
    out.set(row.id_tac_pham as string, list);
  }
  return out;
}

export async function loadCoAuthorCreditsForTacPham(
  tacPhamId: string,
): Promise<CoAuthorCredit[]> {
  const admin = createServiceRoleClient();
  const map = await loadCoAuthorCredits(admin, [tacPhamId]);
  return map.get(tacPhamId) ?? [];
}

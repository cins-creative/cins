import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CongDongEvent } from "@/lib/cong-dong/types";

type SuKienRow = {
  id: string;
  tieu_de: string | null;
  mo_ta: string | null;
  cover_id: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  dia_diem: string | null;
  loai_su_kien: string | null;
};

const LOAI_LABEL: Record<string, string> = {
  workshop: "Workshop",
  talkshow: "Talkshow",
  trien_lam: "Triển lãm",
  contest: "Contest",
  meetup: "Meetup",
  khoa_dao_tao_ngan: "Khóa ngắn",
  tour_cong_ty: "Tour công ty",
  tour_truong: "Tour trường",
  open_day: "Open day",
  screening: "Screening",
  hackathon: "Hackathon",
  career_fair: "Career fair",
};

function mapRow(row: SuKienRow): CongDongEvent {
  const loai = row.loai_su_kien?.trim() ?? "";
  return {
    id: row.id,
    tieuDe:
      row.tieu_de?.trim() ||
      row.mo_ta?.trim().slice(0, 80) ||
      "Sự kiện cộng đồng",
    moTa: row.mo_ta,
    coverId: row.cover_id,
    batDau: row.bat_dau,
    ketThuc: row.ket_thuc,
    diaDiem: row.dia_diem,
    loaiLabel: LOAI_LABEL[loai] ?? (loai ? loai.replace(/_/g, " ") : null),
  };
}

/** Sự kiện sắp diễn ra / đang mở — hiển thị cột banner dọc. */
export async function loadUpcomingCongDongEvents(
  orgId: string,
  limit = 4,
): Promise<CongDongEvent[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("org_su_kien")
    .select(
      "id, tieu_de, mo_ta, cover_id, bat_dau, ket_thuc, dia_diem, loai_su_kien",
    )
    .eq("id_to_chuc", orgId)
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: true })
    .limit(limit)
    .returns<SuKienRow[]>();

  if (error || !data) return [];
  return data.map(mapRow);
}

/**
 * Sự kiện sắp tới toàn cục cho trang chủ (module `su_kien`, brief §5).
 * `loaiFilter` lọc "theo cụm" persona; rỗng = không lọc loại.
 */
export async function loadUpcomingEventsForHome(
  loaiFilter: string[] = [],
  limit = 4,
): Promise<CongDongEvent[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  let query = admin
    .from("org_su_kien")
    .select(
      "id, tieu_de, mo_ta, cover_id, bat_dau, ket_thuc, dia_diem, loai_su_kien",
    )
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: true })
    .limit(limit);

  if (loaiFilter.length > 0) {
    query = query.in("loai_su_kien", loaiFilter);
  }

  const { data, error } = await query.returns<SuKienRow[]>();
  if (error || !data) return [];
  return data.map(mapRow);
}

import { NextResponse } from "next/server";

import { getSuKienByPublicKey } from "@/lib/to-chuc/su-kien";
import {
  labelLoaiSuKien,
  labelSuKienVe,
} from "@/lib/to-chuc/su-kien-constants";
import { suKienCardPath } from "@/lib/to-chuc/su-kien-routes";
import { formatSuKienDiaDiemDisplay } from "@/lib/truong/contact";

const MO_TA_MAX = 320;

/** Thông tin gọn cho popup sidebar — chỉ field hiển thị, không trả `noiDung` HTML. */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key")?.trim();
  if (!key) {
    return NextResponse.json({ error: "Thiếu mã sự kiện." }, { status: 400 });
  }

  const detail = await getSuKienByPublicKey(key);
  if (!detail) {
    return NextResponse.json(
      { error: "Không tìm thấy sự kiện." },
      { status: 404 },
    );
  }

  const { suKien } = detail;
  const moTa = suKien.moTa?.trim() || null;

  return NextResponse.json({
    suKien: {
      ten: suKien.ten,
      href: suKienCardPath({ id: suKien.id, slug: suKien.slug }),
      coverSrc: suKien.coverSrc,
      batDau: suKien.batDau,
      ketThuc: suKien.ketThuc,
      loaiLabel: labelLoaiSuKien(suKien.loaiSuKien),
      diaDiem: formatSuKienDiaDiemDisplay(suKien.tinhThanh, suKien.diaDiem),
      veLabel: labelSuKienVe(
        suKien.mienPhi,
        suKien.giaVe,
        suKien.loaiVe.length,
      ),
      soDangKy: suKien.soDangKy,
      slotToiDa: suKien.slotToiDa,
      moTa:
        moTa && moTa.length > MO_TA_MAX
          ? `${moTa.slice(0, MO_TA_MAX).trimEnd()}…`
          : moTa,
      orgTen: detail.orgTen,
      orgAvatarUrl: detail.orgAvatarUrl,
    },
  });
}

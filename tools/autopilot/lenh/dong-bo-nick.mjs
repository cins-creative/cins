import { NICK_SEED, nicheVoiKenh } from "../lib/nick-seed.mjs";

/**
 * Upsert 10 nick seeding vào auto_tai_khoan (map id_nguoi_dung từ slug).
 * Gắn tag nguon:artstation|behance|truyen trong niche.
 */
export async function chayDongBoNick(db) {
  const slugs = NICK_SEED.map((n) => n.slug);
  const { data: profiles, error: pErr } = await db
    .from("user_nguoi_dung")
    .select("id, slug")
    .in("slug", slugs);

  if (pErr) throw new Error(`Đọc user_nguoi_dung: ${pErr.message}`);

  const bySlug = new Map((profiles || []).map((p) => [p.slug, p.id]));
  let ok = 0;
  let thieu = 0;

  console.log("Phân kênh: 4 ArtStation · 4 Behance · 2 truyện (tắt tạm)\n");

  for (const nick of NICK_SEED) {
    const idNguoiDung = bySlug.get(nick.slug) || null;
    if (!idNguoiDung) {
      console.warn(`  ! chưa có profile CINs cho slug=${nick.slug}`);
      thieu += 1;
    }

    const dangBat = nick.dangBat !== false;
    const { error } = await db.from("auto_tai_khoan").upsert(
      {
        slug: nick.slug,
        id_nguoi_dung: idNguoiDung,
        niche: nicheVoiKenh(nick),
        dang_bat: dangBat,
        han_muc_ngay: 3,
        ghi_chu: nick.ghiChu,
        cap_nhat_luc: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );

    if (error) {
      console.error(`  ✗ ${nick.slug}: ${error.message}`);
    } else {
      const flag = dangBat ? "ON" : "OFF";
      console.log(
        `  ✓ [${flag}] ${nick.slug} · ${nick.kenh}` +
          (idNguoiDung ? "" : " (chưa map user)"),
      );
      ok += 1;
    }
  }

  console.log(`\nĐồng bộ xong: ${ok}/${NICK_SEED.length} (thiếu profile: ${thieu})`);
}

import { thuThapArtstation, artstationUsernameTuUrl } from "../lib/artstation.mjs";
import { thuThapBehance } from "../lib/behance.mjs";
import { coFetchWorker } from "../lib/fetch-html.mjs";
import { capNhatLanQuet, luuMucMoi } from "../lib/luu-muc.mjs";

/**
 * Quét auto_nguon đang bật → thu thập → auto_muc.
 * flags: { id?, nenTang?, gioiHan?, dryRun? }
 */
export async function chayQuetNguon(db, flags = {}) {
  if (!coFetchWorker()) {
    throw new Error(
      "Thiếu fetch worker (SINE_ART_WORKER_URL + SINE_ART_WORKER_SECRET).",
    );
  }

  const gioiHan = Math.max(1, Number(flags.gioiHan) || 50);
  const dryRun = Boolean(flags.dryRun || flags.chiXem);

  let q = db
    .from("auto_nguon")
    .select(
      "id, nen_tang, url_ho_so, ma_ngoai, ten_hien_thi, niche, dang_bat, lan_quet_luc",
    )
    .eq("dang_bat", true)
    .order("lan_quet_luc", { ascending: true, nullsFirst: true });

  if (flags.id) q = q.eq("id", flags.id);
  if (flags.nenTang) q = q.eq("nen_tang", String(flags.nenTang).toLowerCase());

  const { data: nguonList, error } = await q.limit(100);
  if (error) throw new Error(error.message);
  if (!nguonList?.length) {
    console.log("Không có nguồn nào (dang_bat) để quét.");
    return;
  }

  console.log(
    `Quét ${nguonList.length} nguồn (giới hạn ${gioiHan} mục/nguồn)${dryRun ? " [chi-xem]" : ""}…`,
  );

  let tongThem = 0;
  let tongBoQua = 0;

  for (const nguon of nguonList) {
    const label = nguon.ten_hien_thi || nguon.ma_ngoai || nguon.url_ho_so;
    console.log(`\n→ [${nguon.nen_tang}] ${label}`);

    /* bổ sung ma_ngoai nếu trống */
    if (!nguon.ma_ngoai && nguon.nen_tang === "artstation") {
      const u = artstationUsernameTuUrl(nguon.url_ho_so);
      if (u) {
        await db.from("auto_nguon").update({ ma_ngoai: u }).eq("id", nguon.id);
        nguon.ma_ngoai = u;
      }
    }

    let ketQua;
    if (nguon.nen_tang === "artstation") {
      ketQua = await thuThapArtstation(nguon.url_ho_so, { gioiHan });
    } else if (nguon.nen_tang === "behance") {
      ketQua = await thuThapBehance(nguon.url_ho_so, { gioiHan });
    } else {
      console.log("  bỏ qua nền tảng không hỗ trợ");
      continue;
    }

    if (!ketQua.ok) {
      console.log(`  ✗ ${ketQua.error}`);
      continue;
    }

    console.log(`  lấy ${ketQua.items.length} mục từ feed`);
    if (dryRun) {
      for (const it of ketQua.items.slice(0, 5)) {
        console.log(`    · ${it.tieuDeGoc} — ${it.urlCanonic}`);
      }
      if (ketQua.items.length > 5) {
        console.log(`    … +${ketQua.items.length - 5} mục`);
      }
      continue;
    }

    const { them, boQua, loi } = await luuMucMoi(db, {
      idNguon: nguon.id,
      nenTang: nguon.nen_tang,
      items: ketQua.items,
    });
    await capNhatLanQuet(db, nguon.id);
    console.log(`  ✓ thêm ${them}, bỏ qua trùng ${boQua}${loi ? `, lỗi ${loi}` : ""}`);
    tongThem += them;
    tongBoQua += boQua;
  }

  if (!dryRun) {
    console.log(`\nXong. Tổng thêm ${tongThem}, trùng ${tongBoQua}.`);
  }
}

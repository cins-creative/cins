import { NGUON_MAU } from "../lib/nguon-mau.mjs";

/** Upsert danh sách nguồn mẫu (ArtStation + Behance). */
export async function chayThemNguonMau(db, flags = {}) {
  const chiXem = Boolean(flags.chiXem || flags["chi-xem"]);
  let them = 0;
  let trung = 0;

  for (const n of NGUON_MAU) {
    console.log(`  ${n.nenTang} ${n.url}`);
    if (chiXem) continue;

    const { data, error } = await db
      .from("auto_nguon")
      .upsert(
        {
          nen_tang: n.nenTang,
          url_ho_so: n.url,
          ma_ngoai: n.maNgoai || null,
          ten_hien_thi: n.ten || null,
          niche: n.niche || null,
          dang_bat: true,
          cap_nhat_luc: new Date().toISOString(),
        },
        { onConflict: "nen_tang,url_ho_so" },
      )
      .select("id")
      .maybeSingle();

    if (error) {
      /* unique conflict without upsert support on composite — try select */
      if (/duplicate|unique/i.test(error.message)) {
        trung += 1;
        console.log("    (đã có)");
      } else {
        console.error("    lỗi:", error.message);
      }
    } else if (data?.id) {
      them += 1;
      console.log("    ok", data.id.slice(0, 8));
    } else {
      trung += 1;
      console.log("    (đã có / upsert)");
    }
  }

  console.log(
    chiXem
      ? `\n[chi-xem] ${NGUON_MAU.length} nguồn mẫu`
      : `\nNguồn mẫu: xử lý ${NGUON_MAU.length} (upsert).`,
  );
  return { them, trung };
}

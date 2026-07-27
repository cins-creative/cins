import { pixivUserIdTuUrl } from "../lib/pixiv.mjs";

/**
 * Thêm / cập nhật nguồn theo dõi.
 * args: { nenTang, url, maNgoai?, ten?, niche?, ghiChu? }
 */
export async function chayThemNguon(db, args) {
  const nenTang = String(args.nenTang || "").trim().toLowerCase();
  const url = String(args.url || "").trim();
  if (!["artstation", "behance", "pixiv"].includes(nenTang)) {
    throw new Error("--nen-tang phải là artstation | behance | pixiv");
  }
  if (!/^https:\/\//i.test(url)) {
    throw new Error("--url phải là https://…");
  }

  let maNgoai = args.maNgoai?.trim() || null;
  if (!maNgoai && nenTang === "pixiv") {
    maNgoai = pixivUserIdTuUrl(url);
  }

  const row = {
    nen_tang: nenTang,
    url_ho_so: url,
    ma_ngoai: maNgoai,
    ten_hien_thi: args.ten?.trim() || null,
    niche: args.niche?.trim() || null,
    ghi_chu: args.ghiChu?.trim() || null,
    dang_bat: true,
    cap_nhat_luc: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("auto_nguon")
    .upsert(row, { onConflict: "nen_tang,url_ho_so" })
    .select("id, nen_tang, url_ho_so, niche, dang_bat")
    .single();

  if (error) throw new Error(error.message);
  console.log("Đã lưu nguồn:");
  console.log(JSON.stringify(data, null, 2));
}

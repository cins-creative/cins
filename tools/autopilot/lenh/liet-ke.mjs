/** Liệt kê nguồn hoặc nick. */
export async function chayLietKe(db, loai) {
  if (loai === "nguon") {
    const { data, error } = await db
      .from("auto_nguon")
      .select(
        "id, nen_tang, url_ho_so, ma_ngoai, ten_hien_thi, niche, dang_bat, lan_quet_luc",
      )
      .order("tao_luc", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    console.log(JSON.stringify(data || [], null, 2));
    console.log(`\n(${(data || []).length} nguồn)`);
    return;
  }

  if (loai === "nick") {
    const { data, error } = await db
      .from("auto_tai_khoan")
      .select("slug, id_nguoi_dung, niche, dang_bat, han_muc_ngay, ghi_chu")
      .order("slug");
    if (error) throw new Error(error.message);
    console.log(JSON.stringify(data || [], null, 2));
    return;
  }

  if (loai === "muc") {
    const { data, error } = await db
      .from("auto_muc")
      .select(
        "id, nen_tang, url_canonic, tieu_de_goc, ten_tac_gia, trang_thai, tao_luc",
      )
      .order("tao_luc", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    console.log(JSON.stringify(data || [], null, 2));
    console.log(`\n(${(data || []).length} mục gần nhất)`);
    return;
  }

  if (loai === "ban-thao" || loai === "ban_thao") {
    const { data, error } = await db
      .from("auto_ban_thao")
      .select(
        "id, tieu_de, trang_thai, id_muc, id_tai_khoan, tao_luc, auto_tai_khoan(slug), auto_muc(url_canonic, nen_tang)",
      )
      .order("tao_luc", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    console.log(JSON.stringify(data || [], null, 2));
    console.log(`\n(${(data || []).length} bản thảo gần nhất)`);
    return;
  }

  throw new Error("liet-ke cần: nguon | nick | muc | ban-thao");
}

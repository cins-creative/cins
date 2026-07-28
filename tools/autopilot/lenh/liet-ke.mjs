/** Liệt kê nguồn hoặc nick. */
export async function chayLietKe(db, loai, locNenTang) {
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
    let q = db
      .from("auto_muc")
      .select(
        "id, nen_tang, url_canonic, tieu_de_goc, ten_tac_gia, trang_thai, anh_bia_url, meta, tao_luc",
      )
      .order("tao_luc", { ascending: false })
      .limit(50);
    if (locNenTang) q = q.eq("nen_tang", locNenTang);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const rows = data || [];
    for (const r of rows) {
      const meta = r.meta && typeof r.meta === "object" ? r.meta : {};
      const soAnh = Array.isArray(meta.anhUrls) ? meta.anhUrls.length : 0;
      const bia = r.anh_bia_url ? "bìa✓" : "bìa✗";
      const tieuDe = (r.tieu_de_goc || "").slice(0, 40);
      console.log(
        `[${r.trang_thai}] ${r.nen_tang.padEnd(10)} ${String(soAnh).padStart(2)} ảnh · ${bia} · ${r.url_canonic}` +
          (tieuDe ? `\n    ${tieuDe}` : ""),
      );
    }

    const thongKe = rows.reduce((acc, r) => {
      const soAnh = Array.isArray(r.meta?.anhUrls) ? r.meta.anhUrls.length : 0;
      acc.tong += 1;
      if (soAnh === 0) acc.khongAnh += 1;
      else if (soAnh === 1) acc.motAnh += 1;
      else acc.nhieuAnh += 1;
      return acc;
    }, { tong: 0, khongAnh: 0, motAnh: 0, nhieuAnh: 0 });
    console.log(
      `\n(${thongKe.tong} mục gần nhất${locNenTang ? ` · ${locNenTang}` : ""}` +
        ` — 0 ảnh: ${thongKe.khongAnh}, 1 ảnh: ${thongKe.motAnh}, ≥2 ảnh: ${thongKe.nhieuAnh})`,
    );
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

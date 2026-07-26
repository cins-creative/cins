/**
 * Ghi mục thu thập vào auto_muc — chống trùng url_canonic.
 * Chỉ INSERT mới; không đè mục đã xử lý.
 */
export async function luuMucMoi(db, { idNguon, nenTang, items }) {
  if (!items?.length) {
    return { them: 0, boQua: 0, loi: 0 };
  }

  const urls = items.map((i) => i.urlCanonic);
  const { data: existing, error: exErr } = await db
    .from("auto_muc")
    .select("url_canonic")
    .in("url_canonic", urls);

  if (exErr) throw new Error(`Đọc auto_muc: ${exErr.message}`);

  const daCo = new Set((existing || []).map((r) => r.url_canonic));
  const moi = items.filter((i) => !daCo.has(i.urlCanonic));

  let them = 0;
  let loi = 0;

  /* batch insert 50 */
  for (let i = 0; i < moi.length; i += 50) {
    const chunk = moi.slice(i, i + 50).map((it) => ({
      id_nguon: idNguon || null,
      url_canonic: it.urlCanonic,
      nen_tang: nenTang,
      tieu_de_goc: it.tieuDeGoc,
      mo_ta_goc: it.moTaGoc,
      ten_tac_gia: it.tenTacGia,
      anh_bia_url: it.anhBiaUrl,
      meta: it.meta || {},
      trang_thai: "moi",
    }));
    const { data, error } = await db.from("auto_muc").insert(chunk).select("id");
    if (error) {
      console.error("  insert lỗi:", error.message);
      loi += chunk.length;
    } else {
      them += data?.length ?? chunk.length;
    }
  }

  return { them, boQua: items.length - moi.length, loi };
}

export async function capNhatLanQuet(db, idNguon) {
  const { error } = await db
    .from("auto_nguon")
    .update({
      lan_quet_luc: new Date().toISOString(),
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", idNguon);
  if (error) console.warn("  không cập nhật lan_quet_luc:", error.message);
}

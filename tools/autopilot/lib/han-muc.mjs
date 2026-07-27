import { ngayVn } from "./ngay-vn.mjs";

/**
 * Đọc/tạo dòng hạn mức hôm nay (VN). Trả về { ngay, soDaDang, hanMuc, conLai }.
 */
export async function layHanMucHomNay(db, taiKhoan) {
  const ngay = ngayVn();
  const hanMacDinh = Number(taiKhoan.han_muc_ngay ?? 3);

  const { data: row, error } = await db
    .from("auto_han_muc")
    .select("id, so_da_dang, han_muc")
    .eq("id_tai_khoan", taiKhoan.id)
    .eq("ngay", ngay)
    .maybeSingle();

  if (error) throw new Error(`Đọc auto_han_muc: ${error.message}`);

  if (!row) {
    const { data: created, error: insErr } = await db
      .from("auto_han_muc")
      .insert({
        id_tai_khoan: taiKhoan.id,
        ngay,
        so_da_dang: 0,
        han_muc: hanMacDinh,
      })
      .select("id, so_da_dang, han_muc")
      .single();
    if (insErr) {
      /* race */
      const { data: again, error: againErr } = await db
        .from("auto_han_muc")
        .select("id, so_da_dang, han_muc")
        .eq("id_tai_khoan", taiKhoan.id)
        .eq("ngay", ngay)
        .single();
      if (againErr) throw new Error(`Tạo auto_han_muc: ${insErr.message}`);
      return {
        id: again.id,
        ngay,
        soDaDang: again.so_da_dang,
        hanMuc: again.han_muc,
        conLai: Math.max(0, again.han_muc - again.so_da_dang),
      };
    }
    return {
      id: created.id,
      ngay,
      soDaDang: created.so_da_dang,
      hanMuc: created.han_muc,
      conLai: Math.max(0, created.han_muc - created.so_da_dang),
    };
  }

  return {
    id: row.id,
    ngay,
    soDaDang: row.so_da_dang,
    hanMuc: row.han_muc,
    conLai: Math.max(0, row.han_muc - row.so_da_dang),
  };
}

export async function tangHanMuc(db, idHang, soDaDangMoi) {
  const { error } = await db
    .from("auto_han_muc")
    .update({
      so_da_dang: soDaDangMoi,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", idHang);
  if (error) throw new Error(`Cập nhật auto_han_muc: ${error.message}`);
}

import { goiApiSuaPixivAlbum } from "../lib/dang-bai-api.mjs";

/**
 * Sửa các bài Pixiv đã đăng (article + block embed «▶ URL») thành ALBUM ảnh.
 *
 * Quét `auto_da_dang` (thành công) ↔ `auto_muc` (nen_tang=pixiv) để lấy
 * `id_tac_pham` + `url_canonic`, rồi gọi API nội bộ fetch lại ảnh Pixiv → CF →
 * thay `noi_dung_blocks`. Bài đã là album (có ảnh) → API tự bỏ qua (`da_album`),
 * trừ khi `--ep`.
 *
 * Flags:
 *   --chi-xem                dry-run (không ghi DB)
 *   --gioi-han N             tối đa số bài xử lý (mặc định 100)
 *   --slug <nick>            chỉ 1 nick
 *   --ep                     sửa cả bài đã là album
 *   --cho-phep-anh-qua-dai   cho phép strip cao (bỏ lọc anh_qua_dai)
 */
export async function chaySuaPixivAlbum(db, flags = {}) {
  const chiXem = Boolean(flags.chiXem || flags["chi-xem"]);
  const ep = Boolean(flags.ep);
  const choPhepAnhQuaDai = Boolean(
    flags.choPhepAnhQuaDai || flags["cho-phep-anh-qua-dai"],
  );
  const gioiHan = Math.min(
    500,
    Math.max(1, Number(flags.gioiHan || flags["gioi-han"] || 100) || 100),
  );
  const slugFilter = String(flags.slug || "")
    .trim()
    .toLowerCase();

  /* Bài Pixiv đã đăng thành công (có id_tac_pham). */
  const { data: daDang, error } = await db
    .from("auto_da_dang")
    .select(
      `
      id, id_tac_pham, url_canonic, duong_dan,
      auto_tai_khoan ( slug ),
      auto_muc ( nen_tang )
    `,
    )
    .eq("thanh_cong", true)
    .not("id_tac_pham", "is", null)
    .order("tao_luc", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  let hang = (daDang || []).filter(
    (r) => r.auto_muc?.nen_tang === "pixiv" && r.id_tac_pham,
  );
  if (slugFilter) {
    hang = hang.filter((r) => r.auto_tai_khoan?.slug === slugFilter);
  }

  /* Chống trùng id_tac_pham (một bài có thể có nhiều dòng auto_da_dang). */
  const daThay = new Set();
  hang = hang.filter((r) => {
    if (daThay.has(r.id_tac_pham)) return false;
    daThay.add(r.id_tac_pham);
    return true;
  });

  hang = hang.slice(0, gioiHan);

  console.log(
    `Bài Pixiv đã đăng cần soi: ${hang.length}` +
      (chiXem ? " · [chi-xem]" : "") +
      (ep ? " · [ép cả album]" : ""),
  );

  let sua = 0;
  let boQua = 0;
  let loi = 0;

  for (const r of hang) {
    const nhan = `${r.auto_tai_khoan?.slug || "?"} ${String(r.url_canonic).slice(0, 56)}…`;
    try {
      const { status, data } = await goiApiSuaPixivAlbum({
        idTacPham: r.id_tac_pham,
        urlNguon: r.url_canonic,
        ep,
        choPhepAnhQuaDai,
        chiKiemTra: chiXem,
      });

      if (data?.ok && data?.boQua) {
        console.log(`  ↷ bỏ qua (${data.lyDo || "?"}): ${nhan}`);
        boQua += 1;
        continue;
      }
      if (data?.ok) {
        console.log(
          `  ✓ ${chiXem ? "sẽ sửa" : "đã sửa"} · ${data.soAnh} ảnh: ${nhan}`,
        );
        sua += 1;
        continue;
      }
      if (data?.boQua) {
        console.log(`  ↷ bỏ qua (${data.code || `HTTP ${status}`}): ${nhan}`);
        boQua += 1;
        continue;
      }
      console.error(`  ✗ lỗi HTTP ${status}: ${data?.error || data} · ${nhan}`);
      loi += 1;
    } catch (e) {
      console.error(`  ✗ lỗi: ${e?.message || e} · ${nhan}`);
      loi += 1;
    }
  }

  console.log(
    `\n${chiXem ? "[chi-xem] " : ""}sửa ${sua} · bỏ qua ${boQua} · lỗi ${loi}`,
  );
  return { sua, boQua, loi };
}

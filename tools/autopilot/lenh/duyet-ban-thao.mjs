/**
 * Duyệt bản thảo cho_duyet → san_sang (cho phép chay-dang).
 *
 * Flags: --gioi-han N · --id UUID · --slug <nick> · --tat-ca · --chi-xem
 */
export async function chayDuyetBanThao(db, flags = {}) {
  const chiXem = Boolean(flags.chiXem || flags["chi-xem"]);
  const tatCa = Boolean(flags.tatCa || flags["tat-ca"]);
  const id = String(flags.id || "").trim();
  const slugFilter = String(flags.slug || "")
    .trim()
    .toLowerCase();
  const gioiHan = Math.min(
    200,
    Math.max(1, Number(flags.gioiHan || flags["gioi-han"] || 20) || 20),
  );

  let q = db
    .from("auto_ban_thao")
    .select(
      `
      id, tieu_de, trang_thai, id_muc, id_tai_khoan, tao_luc,
      auto_tai_khoan ( slug ),
      auto_muc ( id, url_canonic, anh_bia_url, nen_tang )
    `,
    )
    .eq("trang_thai", "cho_duyet")
    .order("tao_luc", { ascending: true })
    .limit(tatCa || id ? 500 : gioiHan);

  if (id) q = q.eq("id", id);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  let hang = rows || [];
  if (slugFilter) {
    hang = hang.filter((r) => r.auto_tai_khoan?.slug === slugFilter);
  }
  if (!tatCa && !id) hang = hang.slice(0, gioiHan);

  if (!hang.length) {
    console.log("Không có bản thảo cho_duyet.");
    return { duyet: 0 };
  }

  console.log(`Duyệt ${hang.length} bản thảo → san_sang` + (chiXem ? " [chi-xem]" : ""));
  let duyet = 0;
  for (const bt of hang) {
    const slug = bt.auto_tai_khoan?.slug || "?";
    const url = bt.auto_muc?.url_canonic || "";
    const coAnh = Boolean(bt.auto_muc?.anh_bia_url);
    console.log(
      `  [${slug}] ${bt.tieu_de || "(không tiêu đề)"}` +
        (coAnh ? " · có anh_bia" : " · THIẾU anh_bia") +
        `\n    ${url}`,
    );
    if (chiXem) continue;

    const { error: upBt } = await db
      .from("auto_ban_thao")
      .update({
        trang_thai: "san_sang",
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", bt.id)
      .eq("trang_thai", "cho_duyet");
    if (upBt) {
      console.error(`  lỗi: ${upBt.message}`);
      continue;
    }
    if (bt.id_muc) {
      await db
        .from("auto_muc")
        .update({
          trang_thai: "san_sang",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", bt.id_muc);
    }
    duyet += 1;
  }

  console.log(chiXem ? `\n[chi-xem] ${hang.length} bản` : `\nĐã duyệt ${duyet}.`);
  return { duyet: chiXem ? 0 : duyet };
}

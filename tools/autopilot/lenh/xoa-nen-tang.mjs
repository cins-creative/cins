/**
 * Xoá toàn bộ dữ liệu của một nền tảng khỏi Autopilot (và tuỳ chọn cả bài đã
 * đăng trên Journey).
 *
 * Mặc định (pipeline): xoá `auto_muc` (nen_tang = …) → cascade `auto_ban_thao`.
 *   `auto_da_dang` GIỮ (chỉ null id_muc) trừ khi `--gom-nhat-ky`.
 *
 * `--ca-bai-da-dang`: gỡ luôn các bài ĐÃ đăng trên Journey của nền tảng đó.
 *   Định danh qua `auto_da_dang.id_cot_moc` (url_canonic khớp domain). Lặp lại
 *   đúng trình tự của deleteMilestone (app/[slug]/journey/actions.ts):
 *     link (content_tac_pham_thuoc_moc) → orphan content_media + content_tac_pham
 *     → content_cot_moc → dọn polymorphic (diem_feed/world_boost/social).
 *   LƯU Ý: chạy bước này TRƯỚC --gom-nhat-ky (cần auto_da_dang để tìm cột mốc).
 *   Ảnh cover trên Cloudflare KHÔNG bị xoá ở đây (vô hại, để lại tiết kiệm code).
 *
 * KHÔNG đụng `auto_nguon` (watchlist artist).
 *
 * Flags:
 *   --nen-tang <behance|artstation|pixiv|khac>  (bắt buộc)
 *   --xac-nhan                                   thực hiện xoá (mặc định chỉ đếm)
 *   --ca-bai-da-dang                             gỡ luôn bài đã đăng trên Journey
 *   --gom-nhat-ky                                xoá luôn auto_da_dang khớp domain
 */
const DOMAIN_THEO_NEN_TANG = {
  behance: "behance.net",
  artstation: "artstation.com",
  pixiv: "pixiv.net",
};

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Thu thập id_cot_moc (khác null) của bài đã đăng thuộc nền tảng — dò cả 2 đường:
 *   (a) auto_da_dang.url_canonic khớp domain,
 *   (b) auto_da_dang.id_muc trỏ tới muc của nền tảng (bắt cả dòng thiếu url_canonic).
 */
async function layCotMocIdsDaDang(db, domain, mucIds) {
  const set = new Set();

  const { data: d1, error: e1 } = await db
    .from("auto_da_dang")
    .select("id_cot_moc")
    .ilike("url_canonic", `%${domain}%`)
    .not("id_cot_moc", "is", null);
  if (e1) throw new Error(`Đọc auto_da_dang (url): ${e1.message}`);
  for (const r of d1 ?? []) if (r.id_cot_moc) set.add(r.id_cot_moc);

  for (const ids of chunk(mucIds, 100)) {
    if (!ids.length) continue;
    const { data: d2, error: e2 } = await db
      .from("auto_da_dang")
      .select("id_cot_moc")
      .in("id_muc", ids)
      .not("id_cot_moc", "is", null);
    if (e2) throw new Error(`Đọc auto_da_dang (muc): ${e2.message}`);
    for (const r of d2 ?? []) if (r.id_cot_moc) set.add(r.id_cot_moc);
  }

  return [...set];
}

/** Lấy toàn bộ id của auto_muc theo nền tảng. */
async function layMucIds(db, nenTang) {
  const { data, error } = await db
    .from("auto_muc")
    .select("id")
    .eq("nen_tang", nenTang);
  if (error) throw new Error(`Đọc auto_muc ids: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

/** id người dùng của tất cả nick seeding (để giới hạn quét nội dung). */
async function laySeedUserIds(db) {
  const { data, error } = await db
    .from("auto_tai_khoan")
    .select("id_nguoi_dung")
    .not("id_nguoi_dung", "is", null);
  if (error) throw new Error(`Đọc auto_tai_khoan: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.id_nguoi_dung).filter(Boolean))];
}

/**
 * Dò cột mốc qua NỘI DUNG bài: content_tac_pham của nick seeding có noi_dung_html
 * chứa domain (bắt cả bài không có dòng log auto_da_dang). Chỉ trong phạm vi nick
 * seeding → an toàn, không đụng bài user thật.
 */
async function layCotMocIdsQuaNoiDung(db, domain, seedUserIds) {
  const set = new Set();
  for (const uids of chunk(seedUserIds, 50)) {
    if (!uids.length) continue;
    const { data: tps, error } = await db
      .from("content_tac_pham")
      .select("id")
      .in("id_nguoi_dung", uids)
      .ilike("noi_dung_html", `%${domain}%`);
    if (error) throw new Error(`Đọc content_tac_pham: ${error.message}`);
    const tpIds = (tps ?? []).map((r) => r.id);
    for (const ids of chunk(tpIds, 100)) {
      if (!ids.length) continue;
      const { data: links, error: e2 } = await db
        .from("content_tac_pham_thuoc_moc")
        .select("id_cot_moc")
        .in("id_tac_pham", ids);
      if (e2) throw new Error(`Đọc link tác phẩm: ${e2.message}`);
      for (const l of links ?? []) if (l.id_cot_moc) set.add(l.id_cot_moc);
    }
  }
  return [...set];
}

/**
 * Gỡ bài đã đăng trên Journey theo danh sách cột mốc — lặp lại deleteMilestone.
 * Xử lý theo lô 100 id để tránh URL query quá dài.
 */
async function goBaiDaDang(db, cotMocIds) {
  let soCotMoc = 0;
  let soTacPham = 0;
  for (const ids of chunk(cotMocIds, 100)) {
    /* Cột mốc còn tồn tại thật (bỏ id đã xoá trước đó / stale). */
    const { data: tonTai, error: errTonTai } = await db
      .from("content_cot_moc")
      .select("id")
      .in("id", ids);
    if (errTonTai) throw new Error(`Đọc content_cot_moc: ${errTonTai.message}`);
    const mocIds = (tonTai ?? []).map((r) => r.id);
    if (!mocIds.length) continue;

    const { data: links, error: errLink } = await db
      .from("content_tac_pham_thuoc_moc")
      .select("id_tac_pham")
      .in("id_cot_moc", mocIds);
    if (errLink) throw new Error(`Đọc link tác phẩm: ${errLink.message}`);
    const tacPhamIds = [
      ...new Set((links ?? []).map((l) => l.id_tac_pham).filter(Boolean)),
    ];

    const { error: errDelLink } = await db
      .from("content_tac_pham_thuoc_moc")
      .delete()
      .in("id_cot_moc", mocIds);
    if (errDelLink) throw new Error(`Xoá link tác phẩm: ${errDelLink.message}`);

    if (tacPhamIds.length) {
      const { data: stillUsed } = await db
        .from("content_tac_pham_thuoc_moc")
        .select("id_tac_pham")
        .in("id_tac_pham", tacPhamIds);
      const dungLai = new Set((stillUsed ?? []).map((l) => l.id_tac_pham));
      const orphan = tacPhamIds.filter((id) => !dungLai.has(id));
      if (orphan.length) {
        await db.from("content_media").delete().in("id_tac_pham", orphan);
        const { error: errTp } = await db
          .from("content_tac_pham")
          .delete()
          .in("id", orphan);
        if (errTp) throw new Error(`Xoá content_tac_pham: ${errTp.message}`);
        soTacPham += orphan.length;
      }
    }

    const { error: errMoc } = await db
      .from("content_cot_moc")
      .delete()
      .in("id", mocIds);
    if (errMoc) throw new Error(`Xoá content_cot_moc: ${errMoc.message}`);
    soCotMoc += mocIds.length;

    /* Dọn dòng polymorphic (không có FK cascade tới cot_moc). */
    for (const bang of [
      "content_diem_feed",
      "content_world_boost",
      "social_reaction",
      "social_binh_luan",
      "social_luu",
    ]) {
      await db
        .from(bang)
        .delete()
        .eq("loai_doi_tuong", "cot_moc")
        .in("id_doi_tuong", mocIds);
    }
  }
  return { soCotMoc, soTacPham };
}

export async function chayXoaNenTang(db, flags = {}) {
  const nenTang = String(flags.nenTang || flags["nen-tang"] || "")
    .trim()
    .toLowerCase();
  const hopLe = ["artstation", "behance", "pixiv", "khac"];
  if (!hopLe.includes(nenTang)) {
    console.error(
      `Cần --nen-tang <${hopLe.join("|")}>. Ví dụ: npm run autopilot -- xoa-nen-tang --nen-tang behance --ca-bai-da-dang --xac-nhan`,
    );
    return;
  }
  const xacNhan = Boolean(flags.xacNhan || flags["xac-nhan"]);
  const caBaiDaDang = Boolean(flags.caBaiDaDang || flags["ca-bai-da-dang"]);
  const gomNhatKy = Boolean(flags.gomNhatKy || flags["gom-nhat-ky"]);
  const domain = DOMAIN_THEO_NEN_TANG[nenTang] || null;

  if (caBaiDaDang && !domain) {
    console.error(
      `--ca-bai-da-dang cần domain đã biết (behance/artstation/pixiv), không hỗ trợ '${nenTang}'.`,
    );
    return;
  }

  const { count: soMuc, error: errDemMuc } = await db
    .from("auto_muc")
    .select("id", { count: "exact", head: true })
    .eq("nen_tang", nenTang);
  if (errDemMuc) throw new Error(`Đếm auto_muc: ${errDemMuc.message}`);

  const { count: soBanThao, error: errDemBt } = await db
    .from("auto_ban_thao")
    .select("id, auto_muc!inner(nen_tang)", { count: "exact", head: true })
    .eq("auto_muc.nen_tang", nenTang);
  if (errDemBt) throw new Error(`Đếm auto_ban_thao: ${errDemBt.message}`);

  let soNhatKy = null;
  let cotMocIds = [];
  if (domain) {
    const { count, error } = await db
      .from("auto_da_dang")
      .select("id", { count: "exact", head: true })
      .ilike("url_canonic", `%${domain}%`);
    if (error) throw new Error(`Đếm auto_da_dang: ${error.message}`);
    soNhatKy = count ?? 0;
    if (caBaiDaDang) {
      const mucIds = await layMucIds(db, nenTang);
      const seedUserIds = await laySeedUserIds(db);
      const [quaLog, quaNoiDung] = await Promise.all([
        layCotMocIdsDaDang(db, domain, mucIds),
        layCotMocIdsQuaNoiDung(db, domain, seedUserIds),
      ]);
      cotMocIds = [...new Set([...quaLog, ...quaNoiDung])];
    }
  }

  console.log(`Nền tảng: ${nenTang}`);
  console.log(`  auto_muc              : ${soMuc ?? 0}`);
  console.log(`  auto_ban_thao (cascade): ${soBanThao ?? 0}`);
  if (domain) {
    console.log(
      `  auto_da_dang khớp URL : ${soNhatKy} — ${
        gomNhatKy ? "SẼ XOÁ" : "giữ (dùng --gom-nhat-ky để xoá)"
      }`,
    );
  }
  if (caBaiDaDang) {
    console.log(`  bài đã đăng (content_cot_moc): ${cotMocIds.length} — SẼ GỠ`);
  }

  if (!xacNhan) {
    console.log("\n[chi-xem] Chưa xoá gì. Thêm --xac-nhan để thực hiện.");
    return;
  }

  /* 1) Gỡ bài đã đăng TRƯỚC (cần auto_da_dang để tìm cột mốc). */
  if (caBaiDaDang && cotMocIds.length) {
    const kq = await goBaiDaDang(db, cotMocIds);
    console.log(
      `Đã gỡ ${kq.soCotMoc} cột mốc + ${kq.soTacPham} tác phẩm mồ côi trên Journey.`,
    );
    console.log(
      "  (Ảnh cover trên Cloudflare không bị xoá — vô hại; dọn thủ công nếu cần.)",
    );
  }

  /* 2) Xoá nhật ký (tuỳ chọn) — sau khi đã dùng để tìm cột mốc. */
  if (gomNhatKy && domain) {
    const { error } = await db
      .from("auto_da_dang")
      .delete()
      .ilike("url_canonic", `%${domain}%`);
    if (error) throw new Error(`Xoá auto_da_dang: ${error.message}`);
    console.log(`Đã xoá ${soNhatKy} dòng auto_da_dang khớp ${domain}.`);
  }

  /* 3) Xoá pipeline (muc → cascade ban_thao). */
  const { error: errXoaMuc } = await db
    .from("auto_muc")
    .delete()
    .eq("nen_tang", nenTang);
  if (errXoaMuc) throw new Error(`Xoá auto_muc: ${errXoaMuc.message}`);

  console.log(
    `Đã xoá ${soMuc ?? 0} auto_muc (${nenTang}) + ${soBanThao ?? 0} bản thảo (cascade).`,
  );
}

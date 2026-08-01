import {
  cauHinhNick,
  chonTheoTrongSo,
  lichGheThamNgay,
  nickToiCuGheTham,
  rngSeed,
  xacSuatThaEmoji,
} from "../lib/nick-tuong-tac.mjs";

const LOAI = "cot_moc";

/** Kill-switch toàn cục (khẩn cấp): CINS_SEED_TUONG_TAC=off tắt hết bất kể toggle nick. */
function bicamToanCuc() {
  const v = String(process.env.CINS_SEED_TUONG_TAC || "").toLowerCase();
  return v === "off" || v === "0" || v === "false";
}

function soFlag(v, mac, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return mac;
  return Math.max(min, Math.min(max, n));
}

/** Đánh dấu bài cần tính lại điểm engagement (nếu có dòng content_diem_feed). */
async function danhDauEngagement(db, ids) {
  if (!ids.length) return;
  await db
    .from("content_diem_feed")
    .update({
      engagement_can_tinh_lai: true,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("loai_doi_tuong", LOAI)
    .in("id_doi_tuong", ids);
}

/**
 * Tương tác ảo nick seeding: mỗi phiên ghé → thả emoji tích cực (xác suất theo
 * niche) lên bài mới chưa tương tác; ~30% trong số đó kèm 1 bình luận khen chung.
 *
 * Flags:
 *   --cua-so N       cửa sổ phút coi là "tới cữ ghé" (mặc định 90)
 *   --nhin-lai N     số giờ nhìn lại bài mới (mặc định 48)
 *   --gioi-han N     tối đa bài xử lý / nick / lần (mặc định 40)
 *   --ti-le-comment  tỉ lệ comment trong số bài đã thả emoji (mặc định 0.3)
 *   --slug nick      chỉ chạy 1 nick
 *   --tat-ca         bỏ qua lịch ghé — mọi nick BẬT tương tác đều chạy ngay
 *   --chi-xem        dry-run, không ghi DB
 *
 * Gate: chỉ nick có auto_tai_khoan.tuong_tac_bat = true mới hành động
 * (bật/tắt trong /admin/tai-khoan-ai). CINS_SEED_TUONG_TAC=off = kill-switch khẩn cấp.
 */
export async function chayTuongTac(db, flags = {}) {
  const cuaSo = soFlag(flags.cuaSo, 90, 5, 720);
  const nhinLai = soFlag(flags.nhinLai, 48, 1, 336);
  const gioiHan = soFlag(flags.gioiHan, 40, 1, 200);
  const tiLeComment = soFlag(flags.tiLeComment, 0.3, 0, 1);
  const chiXem = Boolean(flags.chiXem);
  const tatCa = Boolean(flags.tatCa);
  const slugFilter = String(flags.slug || "").trim().toLowerCase();
  const now = new Date();

  if (bicamToanCuc()) {
    console.log("Kill-switch CINS_SEED_TUONG_TAC=off — bỏ qua tương tác ảo.");
    return { nick: 0, emoji: 0, comment: 0 };
  }

  /* Chỉ nick bật tương tác + đã map user */
  const qNick = db
    .from("auto_tai_khoan")
    .select("id, slug, id_nguoi_dung, niche, tuong_tac_bat")
    .eq("tuong_tac_bat", true)
    .eq("loai", "ai")
    .not("id_nguoi_dung", "is", null);
  const { data: nickRows, error: nickErr } = await qNick;
  if (nickErr) throw new Error(`Đọc auto_tai_khoan: ${nickErr.message}`);

  const tatCaNick = (nickRows || []).filter((n) => n.id_nguoi_dung);
  if (!tatCaNick.length) {
    console.log(
      "Chưa nick nào bật tương tác. Bật ở /admin/tai-khoan-ai → tab Nick → cột Tương tác.",
    );
    return { nick: 0, emoji: 0, comment: 0 };
  }
  /* Map user seed → niche (để tính khớp niche khi tác giả là nick seed khác) */
  const nicheTheoUser = new Map(
    tatCaNick.map((n) => [n.id_nguoi_dung, n.niche || []]),
  );

  let nickChay = tatCaNick.filter((n) => {
    if (slugFilter && n.slug !== slugFilter) return false;
    if (tatCa) return true;
    return nickToiCuGheTham(n.slug, now, cuaSo);
  });

  if (!nickChay.length) {
    console.log(
      `Không nick nào tới cữ ghé (cửa sổ ${cuaSo}′). Xem lịch: --slug <nick> --tat-ca, hoặc chạy sau.`,
    );
    return { nick: 0, emoji: 0, comment: 0 };
  }

  /* Bài công khai mới trong cửa sổ nhìn lại */
  const tuLuc = new Date(now.getTime() - nhinLai * 60 * 60 * 1000).toISOString();
  const { data: baiRows, error: baiErr } = await db
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, tao_luc, tieu_de")
    .eq("che_do_hien_thi", "public")
    .gte("tao_luc", tuLuc)
    .order("tao_luc", { ascending: false })
    .limit(400);
  if (baiErr) throw new Error(`Đọc content_cot_moc: ${baiErr.message}`);
  const baiMoi = baiRows || [];

  console.log(
    `Ghé: ${nickChay.length} nick · bài mới (${nhinLai}h): ${baiMoi.length}` +
      (chiXem ? " · [chi-xem]" : ""),
  );

  if (!baiMoi.length) {
    console.log("Không có bài mới để tương tác.");
    return { nick: nickChay.length, emoji: 0, comment: 0 };
  }

  let tongEmoji = 0;
  let tongComment = 0;

  for (const nick of nickChay) {
    const cfg = cauHinhNick(nick.slug);
    const uid = nick.id_nguoi_dung;

    /* Bài đủ điều kiện cho nick: không phải bài của chính nick */
    const ungVien = baiMoi.filter((b) => b.id_nguoi_dung !== uid);
    if (!ungVien.length) continue;
    const ids = ungVien.map((b) => b.id);

    /* Đã thả emoji? (idempotent qua unique key social_reaction) */
    const [{ data: daReact }, { data: daComment }] = await Promise.all([
      db
        .from("social_reaction")
        .select("id_doi_tuong")
        .eq("id_nguoi_dung", uid)
        .eq("loai_doi_tuong", LOAI)
        .in("id_doi_tuong", ids),
      db
        .from("social_binh_luan")
        .select("id_doi_tuong")
        .eq("nguoi_binh_luan", uid)
        .eq("loai_doi_tuong", LOAI)
        .eq("da_xoa", false)
        .in("id_doi_tuong", ids),
    ]);
    const daReactSet = new Set((daReact || []).map((r) => r.id_doi_tuong));
    const daCommentSet = new Set((daComment || []).map((r) => r.id_doi_tuong));

    let emojiNick = 0;
    let commentNick = 0;
    const idsDaReactMoi = [];

    for (const bai of ungVien) {
      if (emojiNick >= gioiHan) break;
      if (daReactSet.has(bai.id)) continue;

      const nicheTacGia = nicheTheoUser.get(bai.id_nguoi_dung) || null;
      const p = xacSuatThaEmoji(nick, nicheTacGia);
      const rReact = rngSeed(`${nick.slug}|${bai.id}|react`)();
      if (rReact >= p) continue; // nick "bỏ qua" bài này — quyết định ổn định

      const emoji = chonTheoTrongSo(
        cfg.emoji,
        rngSeed(`${nick.slug}|${bai.id}|emoji`)(),
      );

      if (!chiXem) {
        const { error: reErr } = await db.from("social_reaction").upsert(
          {
            id_nguoi_dung: uid,
            loai_doi_tuong: LOAI,
            id_doi_tuong: bai.id,
            emoji,
          },
          { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong,emoji" },
        );
        if (reErr) {
          console.error(`  ✗ @${nick.slug} react ${bai.id}: ${reErr.message}`);
          continue;
        }
      }
      emojiNick += 1;
      idsDaReactMoi.push(bai.id);

      /* ~30% bài đã thả emoji → thêm bình luận khen (nếu chưa comment) */
      if (daCommentSet.has(bai.id)) continue;
      const rCmt = rngSeed(`${nick.slug}|${bai.id}|cmt`)();
      if (rCmt >= tiLeComment) continue;

      const pool = cfg.khen;
      const cau = pool[Math.floor(rngSeed(`${nick.slug}|${bai.id}|pick`)() * pool.length)];
      if (!chiXem) {
        const { error: cmErr } = await db.from("social_binh_luan").insert({
          nguoi_binh_luan: uid,
          loai_doi_tuong: LOAI,
          id_doi_tuong: bai.id,
          noi_dung: cau,
          id_cha: null,
        });
        if (cmErr) {
          console.error(`  ✗ @${nick.slug} comment ${bai.id}: ${cmErr.message}`);
          continue;
        }
      }
      commentNick += 1;
    }

    if (!chiXem && idsDaReactMoi.length) {
      await danhDauEngagement(db, idsDaReactMoi);
    }

    if (emojiNick || commentNick) {
      console.log(
        `  @${nick.slug}: +${emojiNick} emoji · +${commentNick} comment`,
      );
    }
    tongEmoji += emojiNick;
    tongComment += commentNick;
  }

  console.log(
    `\n${chiXem ? "[chi-xem] " : ""}tổng: ${tongEmoji} emoji · ${tongComment} comment · ${nickChay.length} nick`,
  );
  return { nick: nickChay.length, emoji: tongEmoji, comment: tongComment };
}

/** In lịch ghé 4 phiên/ngày của các nick (debug). */
export async function chayLichGheTham(db, flags = {}) {
  const slugFilter = String(flags.slug || "").trim().toLowerCase();
  const { data: nickRows } = await db
    .from("auto_tai_khoan")
    .select("slug")
    .order("slug");
  const now = new Date();
  const fmt = (ms) =>
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  for (const n of nickRows || []) {
    if (slugFilter && n.slug !== slugFilter) continue;
    const slots = lichGheThamNgay(n.slug, now).map(fmt).join("  ");
    console.log(`@${n.slug}: ${slots}`);
  }
}

import { goiApiDangBai } from "../lib/dang-bai-api.mjs";
import { layHanMucHomNay, tangHanMuc } from "../lib/han-muc.mjs";
import { ngayVn } from "../lib/ngay-vn.mjs";

/** Mặc định cửa sổ rải giờ đăng (phút) — mỗi bài lệch nhau trong khoảng này. */
const GIAN_CACH_PHUT_MAC_DINH = 240;

/** Trần đa dạng: tối đa bài/1 artist trong cửa sổ gần đây (chống seeding nặng). */
const MAX_MOI_ARTIST_MAC_DINH = 1;
/** Cửa sổ (giờ) tính trùng artist khi áp trần đa dạng. */
const CUA_SO_ARTIST_GIO_MAC_DINH = 12;

/**
 * Trộn mảng tại chỗ (Fisher–Yates) — random thứ tự nick mỗi lần chạy.
 */
function tronMang(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Khoá gộp theo artist để áp trần đa dạng.
 * - Pixiv: tên lúc quét (trang chung) KHÔNG đáng tin → trả null (không gộp, mỗi
 *   bài coi như artist riêng; đa dạng thật lấy từ ajax lúc đăng).
 * - Tên rỗng / ID số / chuỗi chung pixiv → null (bỏ qua trần).
 */
function khoaTacGia(muc) {
  const nen = String(muc?.nen_tang || "");
  if (nen === "pixiv") return null;
  const raw = String(muc?.ten_tac_gia || "").trim();
  if (!raw || /^\d+$/.test(raw) || /^Online community for artists/i.test(raw)) {
    return null;
  }
  return `${nen}:${raw.toLowerCase()}`;
}

/**
 * Thời điểm đăng rải rác: lệch ngẫu nhiên [0, windowPhut] phút về quá khứ.
 * → mỗi bài một mốc «N phút/giờ trước» khác nhau, không đồng loạt.
 */
function taoLucRaiRac(windowPhut) {
  if (!windowPhut || windowPhut <= 0) return undefined;
  const lechMs = Math.floor(Math.random() * windowPhut * 60 * 1000);
  return new Date(Date.now() - lechMs).toISOString();
}

/**
 * Đăng bản thảo san_sang qua API nội bộ, tôn trọng hạn mức/ngày (VN).
 *
 * Flags:
 *   --gioi-han N        · tối đa bài đăng lần chạy
 *   --chi-xem           · dry-run
 *   --slug <nick>       · chỉ 1 nick
 *   --gian-cach-phut N  · cửa sổ rải giờ đăng (mặc định 240′); 0 = đăng ngay
 *   --khong-gian-cach   · tắt rải giờ (tao_luc = now cho tất cả)
 *   --max-artist N      · tối đa bài/artist trong cửa sổ (mặc định 1); 0 = tắt trần
 *   --cua-so-gio H      · cửa sổ giờ tính trùng artist (mặc định 12)
 */
export async function chayDang(db, flags = {}) {
  const gioiHan = Math.min(
    100,
    Math.max(1, Number(flags.gioiHan || flags["gioi-han"] || 30) || 30),
  );
  const chiXem = Boolean(flags.chiXem || flags["chi-xem"]);
  const slugFilter = String(flags.slug || "")
    .trim()
    .toLowerCase();
  /* Trần đa dạng theo artist (chống 1 artist ngập feed). 0 = tắt. */
  const maxMoiArtist = Math.max(
    0,
    Number(flags.maxArtist ?? flags["max-artist"] ?? MAX_MOI_ARTIST_MAC_DINH) ||
      0,
  );
  const cuaSoArtistGio = Math.max(
    0,
    Number(flags.cuaSoGio ?? flags["cua-so-gio"] ?? CUA_SO_ARTIST_GIO_MAC_DINH) ||
      0,
  );
  const gianCachPhut =
    flags.khongGianCach || flags["khong-gian-cach"]
      ? 0
      : Math.max(
          0,
          Number(
            flags.gianCachPhut ??
              flags["gian-cach-phut"] ??
              GIAN_CACH_PHUT_MAC_DINH,
          ) || GIAN_CACH_PHUT_MAC_DINH,
        );

  const apTranArtist = maxMoiArtist > 0 && cuaSoArtistGio > 0;

  console.log(`Ngày VN: ${ngayVn()}`);
  console.log(
    gianCachPhut > 0
      ? `Rải giờ đăng: mỗi bài lệch ngẫu nhiên trong ${gianCachPhut}′ gần nhất.`
      : "Rải giờ đăng: TẮT (mọi bài dùng thời điểm hiện tại).",
  );
  console.log(
    apTranArtist
      ? `Trần đa dạng: tối đa ${maxMoiArtist} bài/artist trong ${cuaSoArtistGio}h.`
      : "Trần đa dạng: TẮT.",
  );

  let q = db
    .from("auto_ban_thao")
    .select(
      `
      id, tieu_de, mo_ta, dong_ghi_nguon, trang_thai,
      id_tai_khoan, id_muc,
      auto_tai_khoan ( id, slug, dang_bat, han_muc_ngay, loai ),
      auto_muc ( id, url_canonic, nen_tang, ten_tac_gia, anh_bia_url, trang_thai, meta )
    `,
    )
    .eq("trang_thai", "san_sang")
    .order("tao_luc", { ascending: true })
    .limit(200);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  let hang = (rows || []).filter((r) => {
    const tk = r.auto_tai_khoan;
    const muc = r.auto_muc;
    if (!tk?.dang_bat || !muc?.url_canonic) return false;
    if (tk.loai && tk.loai !== "ai") return false;
    if (slugFilter && tk.slug !== slugFilter) return false;
    return true;
  });

  if (!hang.length) {
    console.log(
      "Không có bản thảo san_sang. (Dùng: npm run autopilot -- duyet-ban-thao)",
    );
    return { dang: 0, boQua: 0, loi: 0 };
  }

  /* Bỏ URL đã đăng thành công trước đó */
  const urls = hang.map((r) => r.auto_muc.url_canonic);
  const { data: daDangOk } = await db
    .from("auto_da_dang")
    .select("url_canonic")
    .eq("thanh_cong", true)
    .in("url_canonic", urls);
  const urlDaDang = new Set((daDangOk || []).map((r) => r.url_canonic));
  if (urlDaDang.size) {
    for (const r of hang.filter((x) => urlDaDang.has(x.auto_muc.url_canonic))) {
      await db
        .from("auto_ban_thao")
        .update({
          trang_thai: "da_dung",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", r.id);
      await db
        .from("auto_muc")
        .update({
          trang_thai: "da_dang",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", r.auto_muc.id);
      console.log(`  skip đã đăng: ${r.auto_muc.url_canonic.slice(0, 64)}…`);
    }
    hang = hang.filter((r) => !urlDaDang.has(r.auto_muc.url_canonic));
  }

  if (!hang.length) {
    console.log("Không còn bản thảo mới cần đăng.");
    return { dang: 0, boQua: 0, loi: 0 };
  }

  /* Nhóm theo nick để áp hạn mức */
  const theoNick = new Map();
  for (const r of hang) {
    const slug = r.auto_tai_khoan.slug;
    if (!theoNick.has(slug)) theoNick.set(slug, []);
    theoNick.get(slug).push(r);
  }
  /* Trộn danh sách mỗi nick — không luôn bốc cùng artist đầu hàng. */
  for (const list of theoNick.values()) tronMang(list);

  /*
   * Đếm số bài/artist đã đăng trong cửa sổ gần đây (auto_da_dang thành công)
   * để áp trần đa dạng — cộng dồn tiếp trong lần chạy này.
   */
  const demArtist = new Map();
  if (apTranArtist) {
    const tuLuc = new Date(
      Date.now() - cuaSoArtistGio * 3600 * 1000,
    ).toISOString();
    const { data: ddGanDay } = await db
      .from("auto_da_dang")
      .select("id_muc")
      .eq("thanh_cong", true)
      .gte("tao_luc", tuLuc);
    const idMucGanDay = [
      ...new Set((ddGanDay || []).map((d) => d.id_muc).filter(Boolean)),
    ];
    if (idMucGanDay.length) {
      const { data: mucGanDay } = await db
        .from("auto_muc")
        .select("id, nen_tang, ten_tac_gia")
        .in("id", idMucGanDay);
      const mapMuc = new Map((mucGanDay || []).map((m) => [m.id, m]));
      for (const d of ddGanDay || []) {
        const m = d.id_muc ? mapMuc.get(d.id_muc) : null;
        const key = m ? khoaTacGia(m) : null;
        if (key) demArtist.set(key, (demArtist.get(key) || 0) + 1);
      }
    }
  }

  let dang = 0;
  let boQua = 0;
  let loi = 0;
  let treoDaDang = 0;
  let conTong = gioiHan;

  /* Random thứ tự nick mỗi lần chạy — không luôn cùng một trình tự. */
  const nickTheoThuTu = tronMang([...theoNick.entries()]);

  for (const [slug, list] of nickTheoThuTu) {
    if (conTong <= 0) break;
    const tk = list[0].auto_tai_khoan;
    const hm = await layHanMucHomNay(db, tk);
    // 1 bài / nick / lần cron (08·14·20) — khớp chia lịch 3×/ngày
    let conNick = Math.min(1, hm.conLai);
    console.log(
      `@${slug}: hạn ${hm.soDaDang}/${hm.hanMuc} (còn ${hm.conLai}, lấy ${conNick}/lần) · chờ ${list.length}`,
    );

    for (const bt of list) {
      if (conTong <= 0 || conNick <= 0) {
        boQua += 1;
        continue;
      }

      const muc = bt.auto_muc;

      /* Trần đa dạng: artist đã đủ suất trong cửa sổ → hoãn (giữ san_sang),
         thử bài khác của nick này. Chống 1 artist (vd. WLOP) ngập feed. */
      const khoaAt = apTranArtist ? khoaTacGia(muc) : null;
      if (khoaAt && (demArtist.get(khoaAt) || 0) >= maxMoiArtist) {
        console.log(
          `  ↷ hoãn (đa dạng): ${khoaAt} đã đủ ${maxMoiArtist}/${cuaSoArtistGio}h`,
        );
        treoDaDang += 1;
        continue;
      }

      const taoLuc = taoLucRaiRac(gianCachPhut);
      /* Album ảnh extension bắt sẵn (auto_muc.meta.anhUrls) — dùng trực tiếp,
         không để server fetch lại HTML (Behance bị Cloudflare chặn). */
      const metaAnhUrls =
        muc.meta && typeof muc.meta === "object" && Array.isArray(muc.meta.anhUrls)
          ? muc.meta.anhUrls
              .map((u) => String(u || "").trim())
              .filter((u) => /^https:\/\//i.test(u))
              .slice(0, 12)
          : [];
      const payload = {
        slugChu: slug,
        urlNguon: muc.url_canonic,
        tieuDe: bt.tieu_de || "",
        moTa: bt.mo_ta || "",
        nenTang: muc.nen_tang,
        tenTacGiaNguon: muc.ten_tac_gia || undefined,
        dongGhiNguon: bt.dong_ghi_nguon || undefined,
        anhBiaUrl: muc.anh_bia_url || undefined,
        anhUrls: metaAnhUrls.length ? metaAnhUrls : undefined,
        taoLuc,
        chiKiemTra: chiXem,
      };

      const lechPhut = taoLuc
        ? Math.round((Date.now() - Date.parse(taoLuc)) / 60000)
        : 0;
      console.log(
        `  → ${muc.url_canonic.slice(0, 64)}…` +
          (metaAnhUrls.length ? ` · album ${metaAnhUrls.length}` : "") +
          (muc.anh_bia_url ? " · +anh_bia" : " · không anh_bia") +
          (taoLuc ? ` · -${lechPhut}′` : ""),
      );

      if (chiXem) {
        const { status, data } = await goiApiDangBai(payload);
        if (!data?.ok) {
          console.error(`    dry-run lỗi HTTP ${status}:`, data?.error || data);
          loi += 1;
        } else {
          console.log(`    dry-run ok`);
          dang += 1;
          conNick -= 1;
          conTong -= 1;
        }
        continue;
      }

      const { status, data } = await goiApiDangBai(payload);

      await db.from("auto_da_dang").insert({
        id_ban_thao: bt.id,
        id_tai_khoan: tk.id,
        id_muc: muc.id,
        url_canonic: muc.url_canonic,
        id_tac_pham: data?.idTacPham || null,
        id_cot_moc: data?.idCotMoc || null,
        slug_bai: data?.slugBai || null,
        duong_dan: data?.duongDan || null,
        thanh_cong: Boolean(data?.ok),
        loi: data?.ok ? null : data?.error || `HTTP ${status}`,
        phan_hoi: data || { status },
      });

      if (!data?.ok) {
        console.error(`    lỗi HTTP ${status}:`, data?.error || data);

        /* Thiếu ảnh (fetch nguồn fail) → giữ san_sang, không đổi trạng muc,
           để cron sau thử lại khi worker/nguồn phục hồi. */
        if (data?.code === "thieu_media") {
          await db
            .from("auto_ban_thao")
            .update({
              trang_thai: "san_sang",
              cap_nhat_luc: new Date().toISOString(),
            })
            .eq("id", bt.id);
          console.log("    bỏ qua: thiếu ảnh (giữ san_sang, thử lại lần sau)");
          boQua += 1;
          continue;
        }

        const lyDoBoQua =
          data?.code === "anh_qua_dai"
            ? data.code
            : null;
        await db
          .from("auto_ban_thao")
          .update({
            trang_thai: lyDoBoQua ? "huy" : "san_sang",
            cap_nhat_luc: new Date().toISOString(),
          })
          .eq("id", bt.id);
        const mucPatch = {
          trang_thai: lyDoBoQua ? "bo_qua" : "loi",
          cap_nhat_luc: new Date().toISOString(),
        };
        if (lyDoBoQua) {
          mucPatch.meta = {
            ...(typeof muc.meta === "object" && muc.meta ? muc.meta : {}),
            lyDoBoQua,
          };
        }
        await db.from("auto_muc").update(mucPatch).eq("id", muc.id);
        if (lyDoBoQua) {
          console.log(`    bỏ qua: ${lyDoBoQua}`);
          boQua += 1;
        } else {
          loi += 1;
        }
        continue;
      }

      await db
        .from("auto_ban_thao")
        .update({
          trang_thai: "da_dung",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", bt.id);
      await db
        .from("auto_muc")
        .update({
          trang_thai: "da_dang",
          cap_nhat_luc: new Date().toISOString(),
        })
        .eq("id", muc.id);

      hm.soDaDang += 1;
      await tangHanMuc(db, hm.id, hm.soDaDang);
      if (khoaAt) demArtist.set(khoaAt, (demArtist.get(khoaAt) || 0) + 1);
      console.log(`    ok ${data.duongDan || data.slugBai}`);
      dang += 1;
      conNick -= 1;
      conTong -= 1;
    }
  }

  console.log(
    `\n${chiXem ? "[chi-xem] " : ""}đăng ${dang} · bỏ qua hạn mức ${boQua}` +
      ` · hoãn đa dạng ${treoDaDang} · lỗi ${loi}`,
  );
  return { dang, boQua, loi, treoDaDang };
}

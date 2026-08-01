import { kenhTuNiche } from "../lib/nick-seed.mjs";
import { diemTrungNiche, tachNiche } from "../lib/ngay-vn.mjs";
import {
  soanBaiCurator,
  soanBaiHeuristic,
  taoDongGhiNguon,
} from "../lib/soan-bai-ai.mjs";
import { htmlBehanceCoAnhQuaDai } from "../lib/anh-qua-dai.mjs";
import { fetchQuaWorker, coFetchWorker } from "../lib/fetch-html.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function behanceCanBoQua(url) {
  try {
    let html = null;
    const direct = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (direct.ok) {
      const t = await direct.text();
      if (t.length > 500) html = t;
    }
    if (!html && coFetchWorker()) {
      const w = await fetchQuaWorker(url, {
        "User-Agent": UA,
        Accept: "text/html",
      });
      if (w.ok && w.text?.length > 500) html = w.text;
    }
    if (!html) return null;
    /* Video YouTube/Vimeo: giữ — đăng bài dài sẽ nhúng embed. Chỉ bỏ strip quá dài. */
    if (htmlBehanceCoAnhQuaDai(html)) return "anh_qua_dai";
    return null;
  } catch {
    return null;
  }
}
/**
 * Cùng kênh (artstation/behance/pixiv) → chia đều RR trong nhóm nick kênh đó.
 * Truyện (nguon:truyen) không nhận nguồn ngoài AS/BH/Pixiv.
 */
function chonNick(muc, nicks, roundRobinIdx) {
  const nen = muc.nen_tang; // artstation | behance | pixiv | khac
  const metaNiche = tachNiche(muc.meta?.niche);
  const nguonNiche = tachNiche(muc._nguonNiche);
  const mucNiche = [...new Set([...metaNiche, ...nguonNiche])].filter(
    (t) => !String(t).startsWith("nguon:"),
  );

  const cungKenh = nicks.filter((n) => {
    const k = kenhTuNiche(n.niche);
    if (nen === "artstation") return k === "artstation";
    if (nen === "behance") return k === "behance";
    if (nen === "pixiv") return k === "pixiv";
    return k === "artstation" || k === "behance" || k === "pixiv";
  });
  const pool = cungKenh.length
    ? cungKenh
    : nicks.filter((n) => kenhTuNiche(n.niche) !== "truyen");
  if (!pool.length) {
    return { nick: nicks[0], lyDo: "fallback" };
  }

  /* Sắp theo slug ổn định rồi RR — chia đều 4 nick/kênh */
  const sorted = [...pool].sort((a, b) => a.slug.localeCompare(b.slug));
  const nick = sorted[roundRobinIdx % sorted.length];
  const nickNiche = (nick.niche || []).filter(
    (t) => !String(t).startsWith("nguon:"),
  );
  const score = diemTrungNiche(mucNiche, nickNiche);
  const kenh = kenhTuNiche(nick.niche) || "?";
  return {
    nick,
    lyDo: score > 0 ? `${kenh}/rr+niche×${score}` : `${kenh}/rr`,
  };
}

/**
 * Ghép auto_muc (moi) → auto_ban_thao theo niche nick + AI caption.
 * Mặc định trang_thai = cho_duyet (duyệt tay trước khi đăng).
 *
 * Flags: --gioi-han N · --chi-xem · --slug <nick> · --khong-ai · --san-sang
 */
export async function chayChuanBiDang(db, flags = {}) {
  const gioiHan = Math.min(
    200,
    Math.max(1, Number(flags.gioiHan || flags["gioi-han"] || 30) || 30),
  );
  const chiXem = Boolean(flags.chiXem || flags["chi-xem"]);
  const khongAi = Boolean(flags.khongAi || flags["khong-ai"]);
  /** Bỏ qua duyệt tay — chỉ dùng khi cố ý auto full. */
  const boDuyet = Boolean(flags.sanSang || flags["san-sang"]);
  const trangThaiBanThao = boDuyet ? "san_sang" : "cho_duyet";
  const slugFilter = String(flags.slug || "")
    .trim()
    .toLowerCase();

  let nickQ = db
    .from("auto_tai_khoan")
    .select("id, slug, niche, dang_bat, han_muc_ngay")
    .eq("dang_bat", true)
    .eq("loai", "ai")
    .order("slug");
  if (slugFilter) nickQ = nickQ.eq("slug", slugFilter);

  const { data: nicks, error: nickErr } = await nickQ;
  if (nickErr) throw new Error(nickErr.message);
  if (!nicks?.length) {
    throw new Error(
      slugFilter
        ? `Không có nick AI bật khớp slug=${slugFilter}`
        : "Chưa có auto_tai_khoan loai=ai dang_bat — chạy dong-bo-nick trước.",
    );
  }

  const { data: daCoBanThao, error: btErr } = await db
    .from("auto_ban_thao")
    .select("id_muc")
    .neq("trang_thai", "huy");
  if (btErr) throw new Error(btErr.message);
  const mucDaCo = new Set((daCoBanThao || []).map((r) => r.id_muc));

  const { data: mucs, error: mucErr } = await db
    .from("auto_muc")
    .select(
      "id, id_nguon, url_canonic, nen_tang, tieu_de_goc, mo_ta_goc, ten_tac_gia, meta, trang_thai",
    )
    .eq("trang_thai", "moi")
    .order("tao_luc", { ascending: true })
    .limit(Math.min(500, gioiHan * 3));
  if (mucErr) throw new Error(mucErr.message);

  const hangDoi = (mucs || []).filter((m) => !mucDaCo.has(m.id)).slice(0, gioiHan);
  if (!hangDoi.length) {
    console.log("Không có auto_muc trang_thai=moi cần soạn.");
    return { tao: 0 };
  }

  const idNguons = [
    ...new Set(hangDoi.map((m) => m.id_nguon).filter(Boolean)),
  ];
  const nguonNicheMap = new Map();
  if (idNguons.length) {
    const { data: nguons } = await db
      .from("auto_nguon")
      .select("id, niche")
      .in("id", idNguons);
    for (const n of nguons || []) nguonNicheMap.set(n.id, n.niche);
  }

  console.log(
    khongAi
      ? "Soạn caption: heuristic (--khong-ai)"
      : process.env.ANTHROPIC_API_KEY?.trim()
        ? "Soạn caption: Claude"
        : "Soạn caption: heuristic (thiếu ANTHROPIC_API_KEY)",
  );
  console.log(
    `Trạng thái bản thảo: ${trangThaiBanThao}` +
      (boDuyet ? " (--san-sang, bỏ duyệt tay)" : " (cần duyet-ban-thao)"),
  );

  let rr = 0;
  let tao = 0;
  let dungAi = 0;
  let boQuaLoc = 0;

  for (const muc of hangDoi) {
    if (muc.nen_tang === "behance") {
      const lyDo = await behanceCanBoQua(muc.url_canonic);
      if (lyDo) {
        console.log(
          `  skip ${lyDo}: ${muc.url_canonic.slice(0, 64)}…`,
        );
        if (!chiXem) {
          await db
            .from("auto_muc")
            .update({
              trang_thai: "bo_qua",
              meta: {
                ...(typeof muc.meta === "object" && muc.meta ? muc.meta : {}),
                lyDoBoQua: lyDo,
              },
              cap_nhat_luc: new Date().toISOString(),
            })
            .eq("id", muc.id);
        }
        boQuaLoc += 1;
        continue;
      }
    }

    muc._nguonNiche = nguonNicheMap.get(muc.id_nguon) || null;
    const { nick, lyDo } = chonNick(muc, nicks, rr);
    rr += 1;

    const soanInput = {
      tieuDeGoc: muc.tieu_de_goc,
      moTaGoc: muc.mo_ta_goc,
      tenTacGia: muc.ten_tac_gia,
      nenTang: muc.nen_tang,
      urlCanonic: muc.url_canonic,
      slugNick: nick.slug,
    };

    const soan = khongAi
      ? soanBaiHeuristic(soanInput)
      : await soanBaiCurator(soanInput);
    if (soan.usedClaude) dungAi += 1;

    const dongGhiNguon = taoDongGhiNguon({
      nenTang: muc.nen_tang,
      tenTacGia: muc.ten_tac_gia,
      urlCanonic: muc.url_canonic,
    });

    console.log(
      `  ${muc.url_canonic.slice(0, 56)}… → @${nick.slug} (${lyDo}` +
        `${soan.usedClaude ? ", AI" : ", heuristic"})`,
    );
    console.log(`    «${soan.tieuDe}»`);

    if (chiXem) continue;

    const { data: bt, error: insErr } = await db
      .from("auto_ban_thao")
      .insert({
        id_muc: muc.id,
        id_tai_khoan: nick.id,
        tieu_de: soan.tieuDe.slice(0, 200),
        mo_ta: soan.moTa,
        dong_ghi_nguon: dongGhiNguon,
        blocks: null,
        trang_thai: trangThaiBanThao,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error(`  lỗi ban_thao: ${insErr.message}`);
      continue;
    }

    const { error: upErr } = await db
      .from("auto_muc")
      .update({
        trang_thai: trangThaiBanThao,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", muc.id);

    if (upErr) {
      console.warn(`  ban_thao ${bt.id} ok nhưng muc update: ${upErr.message}`);
    }

    tao += 1;
  }

  console.log(
    chiXem
      ? `\n[chi-xem] sẽ tạo ~${hangDoi.length - boQuaLoc} bản thảo ${trangThaiBanThao} (AI thử: ${dungAi}; bỏ lọc: ${boQuaLoc})`
      : `\nĐã tạo ${tao} bản thảo ${trangThaiBanThao} (Claude: ${dungAi}; bỏ lọc: ${boQuaLoc}).`,
  );
  return {
    tao: chiXem ? 0 : tao,
    xem: hangDoi.length,
    dungAi,
    trangThaiBanThao,
    boQuaLoc,
  };
}

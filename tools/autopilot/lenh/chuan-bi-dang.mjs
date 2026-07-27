import { diemTrungNiche, tachNiche } from "../lib/ngay-vn.mjs";

function tenNenTang(nen) {
  if (nen === "artstation") return "ArtStation";
  if (nen === "behance") return "Behance";
  return "nguồn ngoài";
}

function chonNick(muc, nicks, roundRobinIdx) {
  const metaNiche = tachNiche(muc.meta?.niche);
  const nguonNiche = tachNiche(muc._nguonNiche);
  const mucNiche = [...new Set([...metaNiche, ...nguonNiche])];

  let bestScore = 0;
  const candidates = [];
  for (const nick of nicks) {
    const score = diemTrungNiche(mucNiche, nick.niche || []);
    if (score > bestScore) {
      bestScore = score;
      candidates.length = 0;
      candidates.push(nick);
    } else if (score > 0 && score === bestScore) {
      candidates.push(nick);
    }
  }

  if (bestScore > 0 && candidates.length) {
    const nick = candidates[roundRobinIdx % candidates.length];
    return {
      nick,
      lyDo:
        candidates.length > 1
          ? `niche×${bestScore}/rr`
          : `niche×${bestScore}`,
    };
  }

  /* không khớp → round-robin nick đang bật */
  const nick = nicks[roundRobinIdx % nicks.length];
  return { nick, lyDo: "round-robin" };
}

/**
 * Ghép auto_muc (moi) → auto_ban_thao (san_sang) theo niche nick.
 *
 * Flags: --gioi-han N · --chi-xem · --slug <nick>
 */
export async function chayChuanBiDang(db, flags = {}) {
  const gioiHan = Math.min(
    200,
    Math.max(1, Number(flags.gioiHan || flags["gioi-han"] || 30) || 30),
  );
  const chiXem = Boolean(flags.chiXem || flags["chi-xem"]);
  const slugFilter = String(flags.slug || "")
    .trim()
    .toLowerCase();

  let nickQ = db
    .from("auto_tai_khoan")
    .select("id, slug, niche, dang_bat, han_muc_ngay")
    .eq("dang_bat", true)
    .order("slug");
  if (slugFilter) nickQ = nickQ.eq("slug", slugFilter);

  const { data: nicks, error: nickErr } = await nickQ;
  if (nickErr) throw new Error(nickErr.message);
  if (!nicks?.length) {
    throw new Error(
      slugFilter
        ? `Không có nick bật khớp slug=${slugFilter}`
        : "Chưa có auto_tai_khoan dang_bat — chạy dong-bo-nick trước.",
    );
  }

  /* Mục đã có bản thảo thì bỏ */
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

  /* Niche nguồn (nếu có) */
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

  let rr = 0;
  let tao = 0;

  for (const muc of hangDoi) {
    muc._nguonNiche = nguonNicheMap.get(muc.id_nguon) || null;
    const { nick, lyDo } = chonNick(muc, nicks, rr);
    rr += 1;

    const nen = tenNenTang(muc.nen_tang);
    const tieuDe =
      (muc.tieu_de_goc || "").trim() ||
      `Giới thiệu từ ${nen}`;
    const moTa = (muc.mo_ta_goc || "").trim() || null;
    const tacGia = (muc.ten_tac_gia || "").trim();
    const dongGhiNguon = tacGia
      ? `Giới thiệu từ ${nen} — ${tacGia}. Xem bản gốc: ${muc.url_canonic}`
      : `Giới thiệu từ ${nen}. Xem bản gốc: ${muc.url_canonic}`;

    console.log(
      `  ${muc.url_canonic.slice(0, 60)}… → @${nick.slug} (${lyDo})`,
    );

    if (chiXem) continue;

    const { data: bt, error: insErr } = await db
      .from("auto_ban_thao")
      .insert({
        id_muc: muc.id,
        id_tai_khoan: nick.id,
        tieu_de: tieuDe.slice(0, 200),
        mo_ta: moTa,
        dong_ghi_nguon: dongGhiNguon,
        blocks: null,
        trang_thai: "san_sang",
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
        trang_thai: "san_sang",
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
      ? `\n[chi-xem] sẽ tạo ~${hangDoi.length} bản thảo`
      : `\nĐã tạo ${tao} bản thảo san_sang.`,
  );
  return { tao: chiXem ? 0 : tao, xem: hangDoi.length };
}

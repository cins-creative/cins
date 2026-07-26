import { luuMucMoi } from "../lib/luu-muc.mjs";

/**
 * Nhập thủ công 1 mục (khi Behance/CF chặn, hoặc curator paste URL).
 * flags: url, nenTang?, tieuDe?, tacGia?, moTa?, anhBia?, idNguon?
 */
export async function chayNhapMuc(db, flags = {}) {
  const url = String(flags.url || "").trim();
  if (!/^https:\/\//i.test(url)) {
    throw new Error("--url phải là https://…");
  }

  let nenTang = String(flags.nenTang || "").toLowerCase();
  if (!nenTang) {
    if (url.includes("artstation.com")) nenTang = "artstation";
    else if (url.includes("behance.net")) nenTang = "behance";
    else nenTang = "khac";
  }
  if (!["artstation", "behance", "khac"].includes(nenTang)) {
    throw new Error("--nen-tang: artstation | behance | khac");
  }

  const item = {
    urlCanonic: url.split("?")[0],
    tieuDeGoc: String(flags.tieuDe || "").trim() || url,
    moTaGoc: flags.moTa ? String(flags.moTa).trim() : null,
    tenTacGia: flags.tacGia ? String(flags.tacGia).trim() : null,
    anhBiaUrl: flags.anhBia ? String(flags.anhBia).trim() : null,
    meta: { nhapTay: true },
  };

  const { them, boQua } = await luuMucMoi(db, {
    idNguon: flags.idNguon || null,
    nenTang,
    items: [item],
  });

  if (them) console.log("✓ Đã thêm mục:", item.urlCanonic);
  else if (boQua) console.log("· Đã có sẵn (bỏ qua trùng):", item.urlCanonic);
}

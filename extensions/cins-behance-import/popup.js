const $ = (id) => document.getElementById(id);

async function loadSettings() {
  const data = await chrome.storage.sync.get({
    apiBase: "https://cins.vn",
    secret: "",
    niche: "",
  });
  $("apiBase").value = data.apiBase || "https://cins.vn";
  $("secret").value = data.secret || "";
  $("niche").value = data.niche || "";
  try {
    $("ver").textContent = "v" + chrome.runtime.getManifest().version;
  } catch {
    /* ignore */
  }
}

async function saveSettings() {
  await chrome.storage.sync.set({
    apiBase: $("apiBase").value.trim().replace(/\/$/, ""),
    secret: $("secret").value.trim(),
    niche: $("niche").value.trim(),
  });
}

function setStatus(text, isError = false) {
  const el = $("status");
  el.textContent = text;
  el.className = isError ? "err" : "ok";
}

/**
 * Chạy trong tab Behance — chỉ quét ĐÚNG 1 trang project (/gallery/{id}) đang
 * mở, trả về 1 mục với đủ ảnh module. KHÔNG gom card từ trang hồ sơ/projects
 * (tránh quét cả loạt project chỉ có 1 ảnh bìa).
 */
function scanBehanceInPage() {
  const origin = location.origin;
  const path = location.pathname.replace(/\/+$/, "");

  const galleryMatch = path.match(/\/gallery\/(\d+)(?:\/([^/]+))?/);
  if (!galleryMatch) {
    return { pageUrl: location.href, items: [], khongPhaiGallery: true };
  }
  const pid = galleryMatch[1];
  const slug = galleryMatch[2] || "";
  /* URL canonic = /gallery/{id}/{slug} — bỏ đuôi deep-link /modules/… nếu có. */
  const canonicalPath = `/gallery/${pid}${slug ? `/${slug}` : ""}`;

  const rawHtml = document.documentElement.innerHTML;
  /*
   * Decode `\/` + `\u002F` trước khi quét — Behance nhúng khối JSON
   * `"modules":[…]` chứa URL của TẤT CẢ ảnh (không phụ thuộc scroll/lazy-load).
   */
  const html = String(rawHtml)
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/");

  /* Tác giả (username handle) — ưu tiên khối owners, fallback username đầu tiên. */
  let username = null;
  const ownerM = html.match(
    /"owners"\s*:\s*\[\s*\{[^]*?"username"\s*:\s*"([^"]+)"/i,
  );
  if (ownerM) username = ownerM[1];
  if (!username) {
    const um = html.match(/"username"\s*:\s*"([^"]+)"/i);
    if (um) username = um[1];
  }

  /* Strip/sheet siêu cao — bỏ qua (không đọc được trên feed). Video vẫn lấy. */
  const TY_LE_CAO = 3;
  const CHIEU_CAO = 3500;
  let anhQuaDai = false;
  for (const re of [
    /"size_[^"]+"\s*:\s*\{[^}]*?"width"\s*:\s*(\d+)[^}]*?"height"\s*:\s*(\d+)/gi,
    /"size_[^"]+"\s*:\s*\{[^}]*?"height"\s*:\s*(\d+)[^}]*?"width"\s*:\s*(\d+)/gi,
  ]) {
    let sm;
    while ((sm = re.exec(rawHtml))) {
      const a = Number(sm[1]);
      const b = Number(sm[2]);
      const w = re.source.indexOf("width") < re.source.indexOf("height") ? a : b;
      const h = w === a ? b : a;
      if (w > 0 && h > 0 && (h >= CHIEU_CAO || h / w >= TY_LE_CAO)) {
        anhQuaDai = true;
        break;
      }
    }
    if (anhQuaDai) break;
  }
  if (anhQuaDai) {
    return { maNgoai: username, pageUrl: location.href, items: [], boQuaAnhQuaDai: true };
  }

  const ogImg =
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content") || null;

  const moduleRe2 =
    /https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/([a-z0-9_]+)\/([a-zA-Z0-9_.%-]+\.(?:jpg|jpeg|png|webp))/gi;
  /* Ưu tiên như server (lib/autopilot/behance-assets SIZE_PREF): max_1200 tốt
     nhất → tránh tải bản `source`/`original` quá nặng. */
  const SIZE_RANK = {
    max_1200: 0,
    "1400": 1,
    disp: 2,
    hd: 3,
    fs: 4,
    max_632: 5,
    source: 6,
    original: 6,
  };
  const sizeScore = (s) => {
    const k = String(s).toLowerCase();
    for (const key of Object.keys(SIZE_RANK)) {
      if (k.includes(key)) return SIZE_RANK[key] + (/_webp/.test(k) ? 0.5 : 0);
    }
    return 80;
  };
  const byFile = new Map();
  let mm;
  while ((mm = moduleRe2.exec(html))) {
    const size = mm[1] || "";
    const file = mm[2] || "";
    if (!size || !file) continue;
    /* Bỏ thumbnail nhỏ — chỉ nhận size hiển thị feed. */
    if (!/(source|original|fs|hd|1400|max_1200|disp|max_632)/i.test(size)) {
      continue;
    }
    const prev = byFile.get(file);
    if (!prev || sizeScore(size) < sizeScore(prev.size)) {
      byFile.set(file, { url: mm[0], size });
    }
  }
  const mods = [...byFile.values()].map((x) => x.url).slice(0, 12);
  const cover = ogImg || mods[0] || null;

  if (!cover && !mods.length) {
    return { maNgoai: username, pageUrl: location.href, items: [] };
  }

  const ogTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    "";
  const cleaned = String(ogTitle).replace(/\s+/g, " ").trim();

  const items = [
    {
      url: `${origin}${canonicalPath}`,
      tieuDe: /^Behance\s+\d+$/i.test(cleaned) ? "" : cleaned.slice(0, 200),
      tacGia: username,
      anhBia: cover,
      anhUrls: mods,
    },
  ];

  return { maNgoai: username, pageUrl: location.href, items };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** Quét tab đang mở — dùng chung cho «Quét trang» (xem trước) và «Gửi». */
async function quetTabHienTai() {
  const tab = await activeTab();
  if (!tab?.id || !tab.url?.includes("behance.net")) {
    return { loi: "Hãy mở đúng 1 trang project behance.net/gallery/…" };
  }
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scanBehanceInPage,
  });
  return { result };
}

/** Diễn giải kết quả quét rỗng thành thông báo. */
function thongBaoQuetRong(result) {
  if (result?.khongPhaiGallery) {
    return "Chưa mở trang project. Bấm vào 1 tác phẩm để có URL dạng /gallery/… rồi quét.";
  }
  if (result?.boQuaAnhQuaDai) {
    return "Project có ảnh strip quá dài — đã bỏ qua (không đọc được trên feed).";
  }
  return "Không lấy được ảnh từ trang này. Cuộn hết trang project rồi quét lại.";
}

$("save").addEventListener("click", async () => {
  await saveSettings();
  setStatus("Đã lưu cấu hình.");
});

$("scan").addEventListener("click", async () => {
  setStatus("Đang quét trang…");
  try {
    const { result, loi } = await quetTabHienTai();
    if (loi) {
      setStatus(loi, true);
      return;
    }
    if (!result?.items?.length) {
      setStatus(thongBaoQuetRong(result), true);
      return;
    }
    const soAnh = result.items[0]?.anhUrls?.length ?? 0;
    setStatus(
      `Quét được project này: ${soAnh} ảnh` +
        (result.maNgoai ? ` (@${result.maNgoai})` : "") +
        (soAnh > 0
          ? ". Bấm «Gửi vào hàng đợi»."
          : ". ⚠ 0 ảnh — cuộn hết ảnh rồi quét lại, KHÔNG gửi."),
    );
  } catch (e) {
    setStatus(e?.message || String(e), true);
  }
});

$("send").addEventListener("click", async () => {
  await saveSettings();
  const { apiBase, secret, niche } = await chrome.storage.sync.get({
    apiBase: "https://cins.vn",
    secret: "",
    niche: "",
  });
  if (!secret) {
    setStatus("Thiếu secret API.", true);
    return;
  }

  /*
   * QUÉT LẠI TƯƠI trang đang mở ngay lúc gửi — không đọc kết quả cũ đã lưu
   * (tránh gửi nhầm scan cũ/nhiều mục từ phiên trước).
   */
  setStatus("Đang quét lại trang hiện tại…");
  const { result, loi } = await quetTabHienTai();
  if (loi) {
    setStatus(loi, true);
    return;
  }
  if (!result?.items?.length) {
    setStatus(thongBaoQuetRong(result), true);
    return;
  }

  /* Chỉ gửi mục CÓ ảnh module — chặn mục 0 ảnh (bìa không đủ đăng). */
  const items = result.items.filter(
    (it) => Array.isArray(it.anhUrls) && it.anhUrls.length > 0,
  );
  if (!items.length) {
    setStatus(
      "Trang này chưa lấy được ảnh (0 ảnh). Cuộn hết ảnh rồi thử lại — không gửi mục rỗng.",
      true,
    );
    return;
  }

  const soAnh = items[0].anhUrls.length;
  setStatus(`Đang gửi 1 project (${soAnh} ảnh)…`);
  try {
    const res = await chrome.runtime.sendMessage({
      type: "GUI_MUC",
      apiBase: String(apiBase || "").replace(/\/$/, ""),
      secret,
      body: {
        nenTang: "behance",
        maNgoai: result.maNgoai || undefined,
        niche: niche || null,
        items,
      },
    });
    if (!res?.ok) {
      setStatus(res?.error || "Gửi thất bại", true);
      return;
    }
    const d = res.data || {};
    setStatus(
      `Xong: mới ${d.them ?? 0}, trùng ${d.boQua ?? 0}` +
        (d.loi ? `, lỗi ${d.loi}` : "") +
        ` · ${soAnh} ảnh` +
        (d.idNguon ? ` · nguồn ${String(d.idNguon).slice(0, 8)}…` : ""),
    );
  } catch (e) {
    setStatus(e?.message || String(e), true);
  }
});

loadSettings().catch((e) => setStatus(e?.message || String(e), true));

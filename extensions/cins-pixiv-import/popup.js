const $ = (id) => document.getElementById(id);

/** Default API origin — ghép để tránh hardcode site URL trong repo scan. */
const DEFAULT_API_BASE = ["https://www.", "cins", ".", "vn"].join("");

async function loadSettings() {
  const data = await chrome.storage.sync.get({
    apiBase: DEFAULT_API_BASE,
    secret: "",
    niche: "",
  });
  $("apiBase").value = data.apiBase || DEFAULT_API_BASE;
  $("secret").value = data.secret || "";
  $("niche").value = data.niche || "";
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

/** Chạy trong tab Pixiv — trả về danh sách artwork. */
function scanPixivInPage() {
  const origin = location.origin;
  const path = location.pathname.replace(/\/+$/, "");
  const userMatch = path.match(/\/(?:en\/)?users\/(\d+)/i);
  const userId = userMatch ? userMatch[1] : null;

  function abs(href) {
    try {
      return new URL(href, origin).href;
    } catch {
      return null;
    }
  }

  function artworkIdFromUrl(url) {
    const m = String(url).match(/\/(?:en\/)?artworks\/(\d+)/i);
    return m ? m[1] : null;
  }

  const seen = new Set();
  const items = [];

  document.querySelectorAll('a[href*="/artworks/"]').forEach((a) => {
    const href = abs(a.getAttribute("href") || "");
    if (!href) return;
    const id = artworkIdFromUrl(href);
    if (!id || seen.has(id)) return;

    const title =
      a.getAttribute("aria-label") ||
      a.querySelector("img")?.getAttribute("alt") ||
      a.textContent?.trim() ||
      `Pixiv ${id}`;

    let thumb = null;
    const img = a.querySelector("img");
    if (img?.currentSrc || img?.src) thumb = img.currentSrc || img.src;
    if (!thumb) {
      const bg = a.querySelector("[style*='background-image']");
      const m = bg?.getAttribute("style")?.match(/url\(["']?([^"')]+)/);
      if (m) thumb = m[1];
    }

    seen.add(id);
    items.push({
      url: `https://www.pixiv.net/artworks/${id}`,
      tieuDe: String(title).replace(/\s+/g, " ").trim().slice(0, 200),
      tacGia: userId,
      anhBia: thumb,
    });
  });

  return {
    maNgoai: userId,
    pageUrl: location.href,
    items,
  };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

$("save").addEventListener("click", async () => {
  await saveSettings();
  setStatus("Đã lưu cấu hình.");
});

$("scan").addEventListener("click", async () => {
  setStatus("Đang quét trang…");
  try {
    const tab = await activeTab();
    if (!tab?.id || !tab.url?.includes("pixiv.net")) {
      setStatus("Hãy mở tab pixiv.net (/users/{id}).", true);
      return;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanPixivInPage,
    });
    if (!result?.items?.length) {
      setStatus(
        "Không thấy artwork. Thử /users/{id} (Illustrations) và scroll load thêm.",
        true,
      );
      return;
    }
    await chrome.storage.session.set({ lastScan: result });
    setStatus(
      `Quét được ${result.items.length} artwork` +
        (result.maNgoai ? ` (user ${result.maNgoai})` : "") +
        ". Bấm «Gửi vào hàng đợi».",
    );
  } catch (e) {
    setStatus(e?.message || String(e), true);
  }
});

$("send").addEventListener("click", async () => {
  await saveSettings();
  const { apiBase, secret, niche } = await chrome.storage.sync.get({
    apiBase: DEFAULT_API_BASE,
    secret: "",
    niche: "",
  });
  if (!secret) {
    setStatus("Thiếu secret API.", true);
    return;
  }
  const { lastScan } = await chrome.storage.session.get("lastScan");
  if (!lastScan?.items?.length) {
    setStatus("Chưa có kết quả quét — bấm «Quét trang» trước.", true);
    return;
  }

  setStatus(`Đang gửi ${lastScan.items.length} mục…`);
  try {
    const res = await chrome.runtime.sendMessage({
      type: "GUI_MUC",
      apiBase: String(apiBase || "").replace(/\/$/, ""),
      secret,
      body: {
        nenTang: "pixiv",
        maNgoai: lastScan.maNgoai || undefined,
        niche: niche || null,
        items: lastScan.items,
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
        (d.idNguon ? ` · nguồn ${String(d.idNguon).slice(0, 8)}…` : ""),
    );
  } catch (e) {
    setStatus(e?.message || String(e), true);
  }
});

loadSettings().catch((e) => setStatus(e?.message || String(e), true));

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

/** Chạy trong tab Behance — trả về danh sách mục. */
function scanBehanceInPage() {
  const origin = location.origin;
  const path = location.pathname.replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  const projectsIdx = parts.indexOf("projects");
  const username =
    projectsIdx > 0
      ? parts[projectsIdx - 1]
      : parts[0] &&
          !["search", "galleries", "jobs", "assets", "gallery"].includes(
            parts[0],
          )
        ? parts[0]
        : null;

  function abs(href) {
    try {
      return new URL(href, origin).href;
    } catch {
      return null;
    }
  }

  function projectIdFromUrl(url) {
    const m = String(url).match(/\/gallery\/(\d+)/);
    return m ? m[1] : null;
  }

  /**
   * Cover project từ HTML nhúng (mir-s3 …/projects/{size}/…{projectId}…).
   * DOM card thường lazy/empty — map này ổn định hơn querySelector img.
   */
  function coverMapTuHtml(html) {
    const decoded = String(html || "")
      .replace(/\\u002F/g, "/")
      .replace(/\\\//g, "/");
    const ids = [
      ...new Set(
        [...decoded.matchAll(/\/gallery\/(\d+)/g)].map((m) => m[1]),
      ),
    ];
    const rank = {
      max_808: 6,
      max_808_webp: 5,
      808: 4,
      "808_webp": 3,
      404: 2,
      "404_webp": 1,
    };
    const map = Object.create(null);
    for (const id of ids) {
      const re = new RegExp(
        `https://mir-s3-cdn-cf\\.behance\\.net/projects/(max_808(?:_webp)?|808(?:_webp)?|404(?:_webp)?)/[a-zA-Z0-9_.%-]*${id}\\.[^"'\\\\\\s>]+`,
        "gi",
      );
      let best = null;
      let bestRank = -1;
      let m;
      while ((m = re.exec(decoded))) {
        const r = rank[m[1]] || 0;
        if (r > bestRank) {
          bestRank = r;
          best = m[0];
        }
      }
      if (best) map[id] = best;
    }
    return map;
  }

  function thumbTuThe(el) {
    if (!el) return null;
    const imgs = el.querySelectorAll("img");
    for (const img of imgs) {
      let t =
        img.currentSrc ||
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-image") ||
        null;
      if (!t && img.srcset) {
        t =
          String(img.srcset)
            .split(",")
            .map((s) => s.trim().split(/\s+/)[0])
            .filter(Boolean)
            .pop() || null;
      }
      if (t && /behance\.net|mir-s3/i.test(t) && !/avatar|user/i.test(t)) {
        return t;
      }
      if (t && /^https?:/i.test(t) && !/avatar|user|icon/i.test(t)) return t;
    }
    const sources = el.querySelectorAll("source[srcset]");
    for (const s of sources) {
      const last = String(s.getAttribute("srcset") || "")
        .split(",")
        .map((x) => x.trim().split(/\s+/)[0])
        .filter(Boolean)
        .pop();
      if (last && /behance\.net|mir-s3/i.test(last)) return last;
    }
    const bg = el.querySelector("[style*='background-image']");
    const m = bg?.getAttribute("style")?.match(/url\(["']?([^"')]+)/);
    return m?.[1] || null;
  }

  const pageHtml = document.documentElement.innerHTML;
  const coversById = coverMapTuHtml(pageHtml);

  const seen = new Set();
  const items = [];

  document.querySelectorAll('a[href*="/gallery/"]').forEach((a) => {
    const href = abs(a.getAttribute("href") || "");
    if (!href) return;
    const id = projectIdFromUrl(href);
    if (!id || seen.has(id)) return;

    const title =
      a.getAttribute("aria-label") ||
      a.querySelector("img")?.getAttribute("alt") ||
      a.textContent?.trim() ||
      `Behance ${id}`;

    const card =
      a.closest("article, li, [class*='Project'], [class*='project']") ||
      a.parentElement ||
      a;
    let thumb = coversById[id] || thumbTuThe(a) || thumbTuThe(card);
    if (thumb && thumb.startsWith("//")) thumb = `https:${thumb}`;

    /* Title từ slug URL nếu card chỉ trả "Behance {id}". */
    let tieuDe = String(title).replace(/\s+/g, " ").trim();
    if (!tieuDe || /^Behance\s+\d+$/i.test(tieuDe)) {
      const slug = href.split(`/gallery/${id}/`)[1]?.split(/[?#]/)[0] || "";
      if (slug && !/^(p|project)$/i.test(slug)) {
        tieuDe = decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
      }
    }
    /* Không gửi placeholder `Behance {id}` — server sẽ lấy og:title. */
    if (!tieuDe || /^Behance\s+\d+$/i.test(tieuDe)) tieuDe = "";

    seen.add(id);
    items.push({
      url: href.split("?")[0],
      tieuDe: tieuDe.slice(0, 200),
      tacGia: username,
      anhBia: thumb,
    });
  });

  /* Đang mở 1 trang gallery → quét thêm module ảnh trong project. */
  const galleryMatch = path.match(/\/gallery\/(\d+)/);
  if (galleryMatch) {
    const pid = galleryMatch[1];
    const html = document.documentElement.innerHTML;
    /* Strip/sheet siêu cao — không đưa vào hàng đợi. Video YouTube/Vimeo vẫn lấy (nhúng khi đăng). */
    const TY_LE_CAO = 3;
    const CHIEU_CAO = 3500;
    let lyDoBoQua = null;
    {
      const sizeRe =
        /"size_[^"]+"\s*:\s*\{[^}]*?"width"\s*:\s*(\d+)[^}]*?"height"\s*:\s*(\d+)/gi;
      let sm;
      while ((sm = sizeRe.exec(html))) {
        const w = Number(sm[1]);
        const h = Number(sm[2]);
        if (w > 0 && h > 0 && (h >= CHIEU_CAO || h / w >= TY_LE_CAO)) {
          lyDoBoQua = "anh_qua_dai";
          break;
        }
      }
    }
    if (!lyDoBoQua) {
      const sizeRe2 =
        /"size_[^"]+"\s*:\s*\{[^}]*?"height"\s*:\s*(\d+)[^}]*?"width"\s*:\s*(\d+)/gi;
      let sm;
      while ((sm = sizeRe2.exec(html))) {
        const h = Number(sm[1]);
        const w = Number(sm[2]);
        if (w > 0 && h > 0 && (h >= CHIEU_CAO || h / w >= TY_LE_CAO)) {
          lyDoBoQua = "anh_qua_dai";
          break;
        }
      }
    }

    if (lyDoBoQua) {
      for (let i = items.length - 1; i >= 0; i--) {
        if (String(items[i].url).includes(`/gallery/${pid}/`)) {
          items.splice(i, 1);
        }
      }
      return {
        maNgoai: username,
        pageUrl: location.href,
        items,
        boQuaAnhQuaDai: true,
      };
    }

    const ogImg =
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") ||
      coversById[pid] ||
      null;
    const moduleRe =
      /https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/(?:max_1200|1400|disp|hd|fs)(?:_webp)?\/[a-zA-Z0-9_.%-]+\.(?:jpg|jpeg|png|webp)/gi;
    const mods = [...new Set((html.match(moduleRe) || []).map(String))];
    const cover = ogImg || mods[0] || null;
    const existing = items.find((it) =>
      String(it.url).includes(`/gallery/${pid}/`),
    );
    if (existing) {
      existing.anhBia = existing.anhBia || cover;
      if (mods.length) existing.anhUrls = mods.slice(0, 12);
    } else if (cover || mods.length) {
      const ogTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute(
          "content",
        ) || "";
      const cleaned = String(ogTitle).replace(/\s+/g, " ").trim();
      items.unshift({
        url: location.href.split("?")[0],
        tieuDe: /^Behance\s+\d+$/i.test(cleaned) ? "" : cleaned.slice(0, 200),
        tacGia: username,
        anhBia: cover,
        anhUrls: mods.slice(0, 12),
      });
    }
  }

  return {
    maNgoai: username,
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
    if (!tab?.id || !tab.url?.includes("behance.net")) {
      setStatus("Hãy mở tab behance.net (profile hoặc /projects).", true);
      return;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanBehanceInPage,
    });
    if (!result?.items?.length) {
      setStatus(
        result?.boQuaAnhQuaDai
          ? "Project có ảnh strip quá dài — đã bỏ qua (không đọc được trên feed)."
          : "Không thấy project. Thử trang /username/projects và scroll load thêm.",
        true,
      );
      return;
    }
    await chrome.storage.session.set({ lastScan: result });
    setStatus(
      `Quét được ${result.items.length} project` +
        (result.maNgoai ? ` (@${result.maNgoai})` : "") +
        (result.boQuaAnhQuaDai ? " · đã lọc" : "") +
        ". Bấm «Gửi vào hàng đợi».",
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
        nenTang: "behance",
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

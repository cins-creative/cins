/**
 * Trợ lý CINs — service worker (Manifest V3).
 *
 * Shopee (kho hàng):
 *   - FETCH_GET_PC        : 1 sản phẩm
 *   - LIST_SHOP_ITEMS     : danh sách SP trong shop (bỏ SOLD OUT)
 *   - FETCH_GET_PC_BATCH  : nhiều get_pc trên 1 tab
 * Port (Behance → Journey):
 *   - LIST_PROFILE_WORKS  : danh sách project trên hồ sơ Behance
 *   - FETCH_WORK          : HTML gallery 1 project (dùng session user, vượt Cloudflare)
 */

const MAX_SHOP_ITEMS_DEFAULT = 100;
const MAX_PROFILE_WORKS_DEFAULT = 48;

/* ── Tiện ích tab dùng chung ─────────────────────────────────────────── */

function waitTabComplete(tabId, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    function check(tab) {
      if (tab.status === "complete") {
        cleanup();
        resolve(tab);
      }
    }
    function onUpdated(id, info, tab) {
      if (id !== tabId) return;
      if (info.status === "complete") check(tab);
    }
    function cleanup() {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearInterval(poll);
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    const poll = setInterval(() => {
      if (Date.now() - started > timeoutMs) {
        cleanup();
        reject(new Error("Trang tải quá lâu."));
        return;
      }
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        check(tab);
      });
    }, 400);
  });
}

async function withTab(pageUrl, run, settleMs = 1000) {
  const tab = await chrome.tabs.create({ url: pageUrl, active: false });
  if (!tab.id) throw new Error("Không mở được tab.");
  try {
    await waitTabComplete(tab.id);
    await new Promise((r) => setTimeout(r, settleMs));
    return await run(tab.id);
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      /* ignore */
    }
  }
}

/* ── SHOPEE ───────────────────────────────────────────────────────────── */

function isShopeeHost(hostname) {
  return /\.shopee\./i.test(hostname) || /^shopee\./i.test(hostname);
}

function parseShopeeProductIds(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (!isShopeeHost(url.hostname)) return null;
    const path = url.pathname;
    const iDot = path.match(/-i\.(\d+)\.(\d+)/i);
    if (iDot) return { shopId: iDot[1], itemId: iDot[2] };
    const product = path.match(/\/product\/(\d+)\/(\d+)/i);
    if (product) return { shopId: product[1], itemId: product[2] };
    const shopQ =
      url.searchParams.get("shop_id") || url.searchParams.get("shopid");
    const itemQ =
      url.searchParams.get("item_id") || url.searchParams.get("itemid");
    if (shopQ && itemQ) return { shopId: shopQ, itemId: itemQ };
  } catch {
    /* ignore */
  }
  return null;
}

function parseShopeeShopRef(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (!isShopeeHost(url.hostname)) return null;
    if (parseShopeeProductIds(raw)) return null;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const shopNum = path.match(/^\/shop\/(\d+)/i);
    if (shopNum) {
      return {
        shopId: shopNum[1],
        username: null,
        pageUrl: `https://shopee.vn/shop/${shopNum[1]}`,
      };
    }
    const user = path.match(/^\/([A-Za-z0-9._-]+)/);
    if (user) {
      const reserved = new Set([
        "api",
        "buyer",
        "cart",
        "mall",
        "search",
        "product",
        "shop",
        "login",
        "user",
      ]);
      const name = user[1];
      if (!reserved.has(name.toLowerCase())) {
        return {
          shopId: null,
          username: name,
          pageUrl: `https://shopee.vn/${name}`,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchGetPcViaTab(productUrl, shopId, itemId) {
  const canonical = `https://shopee.vn/product/${shopId}/${itemId}`;
  return withTab(productUrl || canonical, async (tabId) => {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [shopId, itemId],
      func: async (sid, iid) => {
        const api = `/api/v4/pdp/get_pc?shop_id=${encodeURIComponent(sid)}&item_id=${encodeURIComponent(iid)}`;
        const res = await fetch(api, {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-API-SOURCE": "pc",
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        const text = await res.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          return { ok: false, error: `Shopee không trả JSON (HTTP ${res.status}).` };
        }
        if (!res.ok || (json?.error != null && json.error !== 0)) {
          return {
            ok: false,
            error: json?.error != null ? `Shopee lỗi ${json.error}` : `HTTP ${res.status}`,
            data: json,
          };
        }
        return { ok: true, data: json };
      },
    });
    const result = injected?.[0]?.result;
    if (!result?.ok) {
      return {
        ok: false,
        error: result?.error || "Không lấy được get_pc từ trang Shopee.",
        data: result?.data ?? null,
      };
    }
    return { ok: true, data: result.data };
  });
}

async function listShopItems(pageUrl, username, shopIdHint, maxItems) {
  return withTab(pageUrl, async (tabId) => {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [username, shopIdHint, maxItems],
      func: async (uname, shopHint, max) => {
        async function jfetch(path) {
          const res = await fetch(path, {
            credentials: "include",
            headers: {
              Accept: "application/json",
              "X-API-SOURCE": "pc",
              "X-Requested-With": "XMLHttpRequest",
            },
          });
          const text = await res.text();
          try {
            return { ok: res.ok, status: res.status, json: JSON.parse(text) };
          } catch {
            return { ok: false, status: res.status, json: null };
          }
        }

        let shopId = shopHint ? String(shopHint) : "";
        let shopName = uname || "";
        if (!shopId && uname) {
          const base = await jfetch(
            `/api/v4/shop/get_shop_base?username=${encodeURIComponent(uname)}`,
          );
          const d = base.json?.data;
          shopId = String(d?.shopid ?? d?.shop_id ?? d?.account?.shopid ?? "");
          shopName = d?.name || d?.account?.username || uname || shopName;
        }
        if (!shopId) {
          const m = location.pathname.match(/\/shop\/(\d+)/);
          if (m) shopId = m[1];
        }
        if (!shopId) {
          return { ok: false, error: "Không xác định được shop_id từ link shop." };
        }

        function isSoldOutFlag(basic, row) {
          if (
            basic?.is_sold_out === true ||
            row?.is_sold_out === true ||
            basic?.sold_out === true
          ) {
            return true;
          }
          const stock = basic?.stock;
          if (typeof stock === "number" && stock === 0) return true;
          return false;
        }
        function pushItem(items, sid, basic, row) {
          if (!basic || isSoldOutFlag(basic, row)) return false;
          const itemId = String(basic.itemid ?? basic.item_id ?? row?.itemid ?? "");
          if (!itemId) return false;
          const name = String(
            basic.name || basic.title || row?.item_card_displayed_asset?.name || "Sản phẩm",
          ).trim();
          const imageKey =
            basic.image || basic.cover || row?.item_card_displayed_asset?.image || "";
          const priceRaw =
            basic.price_min ??
            basic.price ??
            basic.price_before_discount ??
            row?.item_card_display_price?.price;
          let priceMin = null;
          if (typeof priceRaw === "number" && priceRaw > 0) {
            priceMin = priceRaw >= 100000 ? Math.round(priceRaw / 100000) : Math.round(priceRaw);
          }
          items.push({
            shopId: sid,
            itemId,
            name,
            imageUrl: imageKey
              ? `https://down-vn.img.susercontent.com/file/${imageKey}`
              : null,
            priceMin,
            productUrl: `https://shopee.vn/product/${sid}/${itemId}`,
          });
          return true;
        }

        async function listViaRecommend() {
          const items = [];
          const limit = 30;
          let offset = 0;
          let guard = 0;
          let sawMain = false;
          while (items.length < max && guard < 40) {
            guard += 1;
            const q = new URLSearchParams({
              bundle: "shop_page_product_tab_main",
              limit: String(limit),
              offset: String(offset),
              shopid: shopId,
            });
            const page = await jfetch(`/api/v4/recommend/recommend?${q}`);
            if (page.json?.error && page.json.error !== 0) {
              return { ok: false, items, error: page.json.error };
            }
            const sections = page.json?.data?.sections;
            if (!Array.isArray(sections) || sections.length === 0) break;
            let mainHasMore = false;
            let mainCount = 0;
            for (const sec of sections) {
              const key = String(sec.key || "");
              if (/sosec|_so\b|sold.?out/i.test(key)) continue;
              const arr = sec.data?.item || sec.data?.items || [];
              if (!Array.isArray(arr) || arr.length === 0) continue;
              sawMain = true;
              mainCount += arr.length;
              if (sec.has_more === true) mainHasMore = true;
              for (const row of arr) {
                const basic = row.item_basic || row.item || row;
                pushItem(items, shopId, basic, row);
                if (items.length >= max) break;
              }
              if (items.length >= max) break;
            }
            if (items.length >= max) break;
            if (!mainHasMore || mainCount === 0) break;
            offset += limit;
            await new Promise((r) => setTimeout(r, 250));
          }
          return { ok: sawMain || items.length > 0, items };
        }

        async function listViaSearchItems() {
          const items = [];
          const limit = 30;
          let offset = 0;
          let guard = 0;
          let hitSoldOut = false;
          function firstItemArray(...cands) {
            for (const c of cands) if (Array.isArray(c) && c.length > 0) return c;
            for (const c of cands) if (Array.isArray(c)) return c;
            return [];
          }
          while (items.length < max && guard < 40 && !hitSoldOut) {
            guard += 1;
            const q = new URLSearchParams({
              filter_sold_out: "0",
              limit: String(limit),
              offset: String(offset),
              order: "desc",
              shopid: shopId,
              sortBy: "pop",
              use_case: "4",
            });
            const page = await jfetch(`/api/v4/shop/search_items?${q}`);
            const j = page.json || {};
            const d = j.data || {};
            const arr = firstItemArray(
              d.centralize_item_card?.item_cards,
              j.centralize_item_card?.item_cards,
              d.items,
              j.items,
              d.item,
              j.item,
            );
            if (!Array.isArray(arr) || arr.length === 0) break;
            for (const row of arr) {
              const basic = row.item_basic || row.item || row;
              if (isSoldOutFlag(basic, row)) {
                hitSoldOut = true;
                break;
              }
              pushItem(items, shopId, basic, row);
              if (items.length >= max) break;
            }
            if (hitSoldOut || items.length >= max) break;
            const noMore = d.nomore === true || d.no_more === true || j.nomore === true;
            if (noMore || arr.length < limit) break;
            offset += limit;
            await new Promise((r) => setTimeout(r, 250));
          }
          return items;
        }

        let items = [];
        const viaRec = await listViaRecommend();
        if (viaRec.ok && viaRec.items.length > 0) items = viaRec.items;
        else items = await listViaSearchItems();

        return {
          ok: true,
          data: {
            shopId,
            shopName: shopName || shopId,
            items,
            truncated: items.length >= max,
          },
        };
      },
    });
    const result = injected?.[0]?.result;
    if (!result?.ok) {
      return { ok: false, error: result?.error || "Không lấy được danh sách sản phẩm shop." };
    }
    return { ok: true, data: result.data };
  });
}

async function fetchGetPcBatch(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, error: "Danh sách rỗng." };
  }
  const first = entries[0];
  const startUrl =
    first.productUrl || `https://shopee.vn/product/${first.shopId}/${first.itemId}`;
  return withTab(startUrl, async (tabId) => {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [entries],
      func: async (list) => {
        const out = [];
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const api = `/api/v4/pdp/get_pc?shop_id=${encodeURIComponent(e.shopId)}&item_id=${encodeURIComponent(e.itemId)}`;
          try {
            const res = await fetch(api, {
              credentials: "include",
              headers: {
                Accept: "application/json",
                "X-API-SOURCE": "pc",
                "X-Requested-With": "XMLHttpRequest",
              },
            });
            const json = await res.json();
            if (!res.ok || (json?.error != null && json.error !== 0)) {
              out.push({
                shopId: e.shopId,
                itemId: e.itemId,
                ok: false,
                error: json?.error != null ? `Shopee lỗi ${json.error}` : `HTTP ${res.status}`,
              });
            } else {
              out.push({ shopId: e.shopId, itemId: e.itemId, ok: true, data: json });
            }
          } catch (err) {
            out.push({
              shopId: e.shopId,
              itemId: e.itemId,
              ok: false,
              error: err?.message || String(err),
            });
          }
          await new Promise((r) => setTimeout(r, 350));
        }
        return { ok: true, results: out };
      },
    });
    const result = injected?.[0]?.result;
    if (!result?.ok) return { ok: false, error: "Batch get_pc thất bại." };
    return { ok: true, results: result.results };
  });
}

/* ── BEHANCE (port → Journey) ─────────────────────────────────────────── */

/** Chuẩn hoá input người dùng (username hoặc URL hồ sơ) → { username, pageUrl }. */
function parseBehanceProfileRef(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const url = new URL(s);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "behance.net") return null;
      const seg = url.pathname.split("/").filter(Boolean)[0];
      if (!seg || /^(gallery|search|assets|for_you)$/i.test(seg)) return null;
      return { username: seg, pageUrl: `https://www.behance.net/${seg}` };
    }
  } catch {
    return null;
  }
  const name = s.replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{2,50}$/.test(name)) return null;
  return { username: name, pageUrl: `https://www.behance.net/${name}` };
}

async function listBehanceWorks(pageUrl, maxItems) {
  return withTab(
    pageUrl,
    async (tabId) => {
      const injected = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        args: [maxItems],
        func: async (max) => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          /* Cuộn để lazy-load lưới project. */
          for (let i = 0; i < 8; i++) {
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(700);
            const links = document.querySelectorAll('a[href*="/gallery/"]');
            if (links.length >= max) break;
          }
          window.scrollTo(0, 0);

          const seen = new Set();
          const items = [];
          const anchors = document.querySelectorAll('a[href*="/gallery/"]');
          for (const a of anchors) {
            let href = a.getAttribute("href") || "";
            if (!href) continue;
            try {
              href = new URL(href, location.origin).href;
            } catch {
              continue;
            }
            const m = href.match(/\/gallery\/(\d+)(?:\/([^/?#]+))?/);
            if (!m) continue;
            const projectId = m[1];
            if (seen.has(projectId)) continue;
            seen.add(projectId);

            const canonical = `https://www.behance.net/gallery/${projectId}${m[2] ? `/${m[2]}` : ""}`;
            const img = a.querySelector("img");
            const cover =
              img?.getAttribute("src") ||
              img?.getAttribute("data-src") ||
              null;
            let title =
              (img?.getAttribute("alt") || a.getAttribute("title") || "").trim();
            if (!title && m[2]) {
              title = decodeURIComponent(m[2]).replace(/[-_]+/g, " ").trim();
            }
            items.push({
              projectId,
              url: canonical,
              title: title ? title.slice(0, 200) : null,
              coverUrl: cover && /^https?:\/\//i.test(cover) ? cover : null,
            });
            if (items.length >= max) break;
          }

          const owner =
            document
              .querySelector('meta[property="og:url"]')
              ?.getAttribute("content") || location.href;
          return { ok: true, items, ownerUrl: owner };
        },
      });
      const result = injected?.[0]?.result;
      if (!result?.ok) {
        return { ok: false, error: "Không đọc được danh sách project Behance." };
      }
      return {
        ok: true,
        data: {
          items: result.items || [],
          truncated: (result.items || []).length >= maxItems,
        },
      };
    },
    1500,
  );
}

/**
 * HTML gallery 1 project — fetch same-origin trong tab behance.net (đã đăng nhập)
 * để vượt challenge Cloudflare. Trả HTML đã decode `\/`.
 */
async function fetchBehanceWork(workUrl) {
  return withTab(
    workUrl,
    async (tabId) => {
      const injected = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        args: [workUrl],
        func: async (url) => {
          let html = "";
          try {
            const res = await fetch(url, {
              credentials: "include",
              headers: { Accept: "text/html,application/xhtml+xml" },
            });
            if (res.ok) html = await res.text();
          } catch {
            /* dùng DOM hiện tại */
          }
          if (!html || html.length < 800) {
            html = document.documentElement.outerHTML || "";
          }
          const decoded = String(html)
            .replace(/\\u002F/gi, "/")
            .replace(/\\\//g, "/");
          const title =
            document
              .querySelector('meta[property="og:title"]')
              ?.getAttribute("content") || null;
          const cover =
            document
              .querySelector('meta[property="og:image"]')
              ?.getAttribute("content") || null;
          return { ok: html.length > 0, html: decoded, title, cover };
        },
      });
      const result = injected?.[0]?.result;
      if (!result?.ok || !result.html) {
        return { ok: false, error: "Không lấy được nội dung project Behance." };
      }
      return {
        ok: true,
        data: {
          url: workUrl,
          html: result.html,
          title: result.title,
          coverUrl: result.cover,
        },
      };
    },
    1200,
  );
}

/* ── ARTSTATION (port → Journey, album ảnh) ───────────────────────────── */

/** Chuẩn hoá input → { username, pageUrl }. */
function parseArtstationProfileRef(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const url = new URL(s);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "artstation.com") return null;
      const seg = url.pathname.split("/").filter(Boolean)[0];
      if (!seg || /^(artwork|projects|search|marketplace|jobs)$/i.test(seg)) {
        return null;
      }
      return { username: seg, pageUrl: `https://www.artstation.com/${seg}` };
    }
  } catch {
    return null;
  }
  const name = s.replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{2,50}$/.test(name)) return null;
  return { username: name, pageUrl: `https://www.artstation.com/${name}` };
}

/** Hash project từ URL artwork/projects. */
function parseArtstationHash(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "artstation.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const kind = parts[0].toLowerCase();
    if (kind !== "artwork" && kind !== "projects") return null;
    const hash = parts[1].replace(/\.json$/i, "").trim();
    return /^[A-Za-z0-9_-]{4,32}$/.test(hash) ? hash : null;
  } catch {
    return null;
  }
}

async function listArtstationWorks(pageUrl, username, maxItems) {
  return withTab(
    pageUrl,
    async (tabId) => {
      const injected = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        args: [username, maxItems],
        func: async (uname, max) => {
          const items = [];
          const seen = new Set();
          let page = 1;
          let guard = 0;
          while (items.length < max && guard < 20) {
            guard += 1;
            let json = null;
            try {
              const res = await fetch(
                `/users/${encodeURIComponent(uname)}/projects.json?page=${page}`,
                {
                  credentials: "include",
                  headers: { Accept: "application/json" },
                },
              );
              json = await res.json();
            } catch {
              break;
            }
            const data = Array.isArray(json?.data) ? json.data : [];
            if (data.length === 0) break;
            for (const p of data) {
              const hash = String(p?.hash_id || "").trim();
              if (!hash || seen.has(hash)) continue;
              seen.add(hash);
              const permalink =
                typeof p?.permalink === "string" && p.permalink
                  ? p.permalink
                  : `https://www.artstation.com/artwork/${hash}`;
              const cover =
                p?.cover?.thumb_url ||
                p?.cover?.medium_image_url ||
                p?.cover?.small_square_url ||
                p?.icons?.image_url ||
                null;
              items.push({
                projectId: hash,
                url: permalink,
                title:
                  typeof p?.title === "string" && p.title.trim()
                    ? p.title.trim().slice(0, 200)
                    : null,
                coverUrl: cover && /^https?:\/\//i.test(cover) ? cover : null,
              });
              if (items.length >= max) break;
            }
            const total = Number(json?.total_count) || 0;
            if (items.length >= total) break;
            page += 1;
            await new Promise((r) => setTimeout(r, 300));
          }
          return { ok: true, items };
        },
      });
      const result = injected?.[0]?.result;
      if (!result?.ok) {
        return { ok: false, error: "Không đọc được danh sách project ArtStation." };
      }
      return {
        ok: true,
        data: {
          items: result.items || [],
          truncated: (result.items || []).length >= maxItems,
        },
      };
    },
    1200,
  );
}

/** JSON 1 project — fetch same-origin trong tab artstation.com. */
async function fetchArtstationWork(workUrl) {
  const hash = parseArtstationHash(workUrl);
  if (!hash) {
    return { ok: false, error: "URL ArtStation không phải trang artwork/project." };
  }
  return withTab(
    workUrl,
    async (tabId) => {
      const injected = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        args: [hash],
        func: async (h) => {
          let text = "";
          try {
            const res = await fetch(`/projects/${h}.json`, {
              credentials: "include",
              headers: { Accept: "application/json" },
            });
            if (res.ok) text = await res.text();
          } catch {
            /* ignore */
          }
          let title = null;
          let cover = null;
          try {
            const j = JSON.parse(text);
            title = typeof j?.title === "string" ? j.title : null;
            cover = typeof j?.cover_url === "string" ? j.cover_url : null;
          } catch {
            /* ignore */
          }
          return { ok: text.length > 0, html: text, title, cover };
        },
      });
      const result = injected?.[0]?.result;
      if (!result?.ok || !result.html) {
        return { ok: false, error: "Không lấy được JSON project ArtStation." };
      }
      return {
        ok: true,
        data: {
          url: workUrl,
          html: result.html,
          title: result.title,
          coverUrl: result.cover,
        },
      };
    },
    1000,
  );
}

/* ── Router ───────────────────────────────────────────────────────────── */

function handleAsync(promise, sendResponse) {
  promise
    .then(sendResponse)
    .catch((err) =>
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    );
  return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  switch (message.type) {
    /* Shopee */
    case "FETCH_GET_PC": {
      const ids = parseShopeeProductIds(message.url);
      if (!ids) {
        sendResponse({ ok: false, error: "URL sản phẩm Shopee không hợp lệ." });
        return;
      }
      return handleAsync(fetchGetPcViaTab(message.url, ids.shopId, ids.itemId), sendResponse);
    }
    case "LIST_SHOP_ITEMS": {
      const ref = parseShopeeShopRef(message.url);
      if (!ref) {
        sendResponse({
          ok: false,
          error: "URL shop không hợp lệ. Dùng https://shopee.vn/ten-shop hoặc /shop/123.",
        });
        return;
      }
      const max = Math.min(Math.max(Number(message.maxItems) || MAX_SHOP_ITEMS_DEFAULT, 1), 200);
      return handleAsync(listShopItems(ref.pageUrl, ref.username, ref.shopId, max), sendResponse);
    }
    case "FETCH_GET_PC_BATCH": {
      const entries = Array.isArray(message.entries) ? message.entries : [];
      return handleAsync(fetchGetPcBatch(entries), sendResponse);
    }

    /* Port — Behance / ArtStation */
    case "LIST_PROFILE_WORKS": {
      const platform = message.platform;
      const max = Math.min(
        Math.max(Number(message.maxItems) || MAX_PROFILE_WORKS_DEFAULT, 1),
        96,
      );
      if (platform === "behance") {
        const ref = parseBehanceProfileRef(message.username);
        if (!ref) {
          sendResponse({ ok: false, error: "Username / link hồ sơ Behance không hợp lệ." });
          return;
        }
        return handleAsync(listBehanceWorks(ref.pageUrl, max), sendResponse);
      }
      if (platform === "artstation") {
        const ref = parseArtstationProfileRef(message.username);
        if (!ref) {
          sendResponse({ ok: false, error: "Username / link hồ sơ ArtStation không hợp lệ." });
          return;
        }
        return handleAsync(
          listArtstationWorks(ref.pageUrl, ref.username, max),
          sendResponse,
        );
      }
      sendResponse({ ok: false, error: "Nền tảng chưa hỗ trợ." });
      return;
    }
    case "FETCH_WORK": {
      const platform = message.platform;
      if (!message.url) {
        sendResponse({ ok: false, error: "Thiếu URL project." });
        return;
      }
      if (platform === "behance") {
        return handleAsync(fetchBehanceWork(message.url), sendResponse);
      }
      if (platform === "artstation") {
        return handleAsync(fetchArtstationWork(message.url), sendResponse);
      }
      sendResponse({ ok: false, error: "Nền tảng chưa hỗ trợ." });
      return;
    }

    default:
      return false;
  }
});

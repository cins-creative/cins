/**
 * CINs · Import Shopee — service worker
 * - FETCH_GET_PC: 1 sản phẩm
 * - LIST_SHOP_ITEMS: danh sách SP trong shop
 * - FETCH_GET_PC_BATCH: nhiều get_pc trên 1 tab Shopee (kéo shop)
 */

const MAX_SHOP_ITEMS_DEFAULT = 100;

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

/** shop URL → { shopId? , username?, pageUrl } */
function parseShopeeShopRef(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (!isShopeeHost(url.hostname)) return null;
    // Không nhận nhầm link sản phẩm
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

    // /basakila hoặc /basakila/...
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
        "buyer",
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
        reject(new Error("Shopee tải trang quá lâu."));
        return;
      }
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        check(tab);
      });
    }, 400);
  });
}

async function withShopeeTab(pageUrl, run) {
  const tab = await chrome.tabs.create({ url: pageUrl, active: false });
  if (!tab.id) throw new Error("Không mở được tab Shopee.");
  try {
    await waitTabComplete(tab.id);
    await new Promise((r) => setTimeout(r, 1000));
    return await run(tab.id);
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      /* ignore */
    }
  }
}

async function fetchGetPcViaTab(productUrl, shopId, itemId) {
  const canonical = `https://shopee.vn/product/${shopId}/${itemId}`;
  return withShopeeTab(productUrl || canonical, async (tabId) => {
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
          return {
            ok: false,
            error: `Shopee không trả JSON (HTTP ${res.status}).`,
          };
        }
        if (!res.ok || (json?.error != null && json.error !== 0)) {
          return {
            ok: false,
            error:
              json?.error != null
                ? `Shopee lỗi ${json.error}`
                : `HTTP ${res.status}`,
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
  return withShopeeTab(pageUrl, async (tabId) => {
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
          shopId = String(
            d?.shopid ?? d?.shop_id ?? d?.account?.shopid ?? "",
          );
          shopName =
            d?.name || d?.account?.username || uname || shopName;
        }

        if (!shopId) {
          // Thử đọc từ URL hiện tại / DOM state
          const m = location.pathname.match(/\/shop\/(\d+)/);
          if (m) shopId = m[1];
        }

        if (!shopId) {
          return {
            ok: false,
            error: "Không xác định được shop_id từ link shop.",
          };
        }

        const items = [];
        const limit = 30;
        let offset = 0;
        let guard = 0;

        while (items.length < max && guard < 40) {
          guard += 1;
          const q = new URLSearchParams({
            filter_sold_out: "1",
            limit: String(limit),
            offset: String(offset),
            order: "desc",
            shopid: shopId,
            sortBy: "pop",
            use_case: "4",
          });
          const page = await jfetch(`/api/v4/shop/search_items?${q}`);
          const arr =
            page.json?.data?.items ||
            page.json?.items ||
            page.json?.data?.item ||
            [];
          if (!Array.isArray(arr) || arr.length === 0) break;

          for (const row of arr) {
            const basic = row.item_basic || row.item || row;
            const itemId = String(
              basic.itemid ?? basic.item_id ?? row.itemid ?? "",
            );
            if (!itemId) continue;
            const name = String(basic.name || basic.title || "Sản phẩm").trim();
            const imageKey = basic.image || basic.cover || "";
            const priceRaw =
              basic.price_min ?? basic.price ?? basic.price_before_discount;
            let priceMin = null;
            if (typeof priceRaw === "number" && priceRaw > 0) {
              priceMin =
                priceRaw >= 100000
                  ? Math.round(priceRaw / 100000)
                  : Math.round(priceRaw);
            }
            items.push({
              shopId,
              itemId,
              name,
              imageUrl: imageKey
                ? `https://down-vn.img.susercontent.com/file/${imageKey}`
                : null,
              priceMin,
              productUrl: `https://shopee.vn/product/${shopId}/${itemId}`,
            });
            if (items.length >= max) break;
          }

          if (arr.length < limit) break;
          offset += limit;
          await new Promise((r) => setTimeout(r, 250));
        }

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
      return {
        ok: false,
        error: result?.error || "Không lấy được danh sách sản phẩm shop.",
      };
    }
    return { ok: true, data: result.data };
  });
}

async function fetchGetPcBatch(entries) {
  // entries: [{ shopId, itemId, productUrl? }]
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, error: "Danh sách rỗng." };
  }
  const first = entries[0];
  const startUrl =
    first.productUrl ||
    `https://shopee.vn/product/${first.shopId}/${first.itemId}`;

  return withShopeeTab(startUrl, async (tabId) => {
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
                error:
                  json?.error != null
                    ? `Shopee lỗi ${json.error}`
                    : `HTTP ${res.status}`,
              });
            } else {
              out.push({
                shopId: e.shopId,
                itemId: e.itemId,
                ok: true,
                data: json,
              });
            }
          } catch (err) {
            out.push({
              shopId: e.shopId,
              itemId: e.itemId,
              ok: false,
              error: err?.message || String(err),
            });
          }
          // nhẹ nhàng tránh spam
          await new Promise((r) => setTimeout(r, 350));
        }
        return { ok: true, results: out };
      },
    });

    const result = injected?.[0]?.result;
    if (!result?.ok) {
      return { ok: false, error: "Batch get_pc thất bại." };
    }
    return { ok: true, results: result.results };
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "FETCH_GET_PC") {
    const ids = parseShopeeProductIds(message.url);
    if (!ids) {
      sendResponse({ ok: false, error: "URL sản phẩm Shopee không hợp lệ." });
      return;
    }
    fetchGetPcViaTab(message.url, ids.shopId, ids.itemId)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return true;
  }

  if (message.type === "LIST_SHOP_ITEMS") {
    const ref = parseShopeeShopRef(message.url);
    if (!ref) {
      sendResponse({
        ok: false,
        error:
          "URL shop không hợp lệ. Dùng dạng https://shopee.vn/ten-shop hoặc /shop/123.",
      });
      return;
    }
    const max = Math.min(
      Math.max(Number(message.maxItems) || MAX_SHOP_ITEMS_DEFAULT, 1),
      200,
    );
    listShopItems(ref.pageUrl, ref.username, ref.shopId, max)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return true;
  }

  if (message.type === "FETCH_GET_PC_BATCH") {
    const entries = Array.isArray(message.entries) ? message.entries : [];
    fetchGetPcBatch(entries)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return true;
  }
});

/**
 * Lấy JSON get_pc bằng cách mở tab Shopee (cùng trình duyệt user) rồi fetch same-origin.
 */

function parseShopeeIds(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (!/\.shopee\./i.test(url.hostname) && !/^shopee\./i.test(url.hostname)) {
      return null;
    }
    const path = url.pathname;
    const iDot = path.match(/-i\.(\d+)\.(\d+)/i);
    if (iDot) return { shopId: iDot[1], itemId: iDot[2] };
    const product = path.match(/\/product\/(\d+)\/(\d+)/i);
    if (product) return { shopId: product[1], itemId: product[2] };
    const shopQ = url.searchParams.get("shop_id") || url.searchParams.get("shopid");
    const itemQ = url.searchParams.get("item_id") || url.searchParams.get("itemid");
    if (shopQ && itemQ) return { shopId: shopQ, itemId: itemQ };
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

async function fetchGetPcViaTab(productUrl, shopId, itemId) {
  const canonical = `https://shopee.vn/product/${shopId}/${itemId}`;
  const tab = await chrome.tabs.create({
    url: productUrl || canonical,
    active: false,
  });
  if (!tab.id) throw new Error("Không mở được tab Shopee.");

  try {
    await waitTabComplete(tab.id);
    // Cho SPA hydrate thêm chút
    await new Promise((r) => setTimeout(r, 1200));

    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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
        if (!res.ok || json?.error) {
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
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      /* ignore */
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "FETCH_GET_PC") return;

  const ids = parseShopeeIds(message.url);
  if (!ids) {
    sendResponse({ ok: false, error: "URL Shopee không hợp lệ." });
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

  return true; // async
});

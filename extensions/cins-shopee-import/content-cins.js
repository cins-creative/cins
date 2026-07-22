/**
 * Bridge trang CINs ↔ extension (không cần biết extension ID).
 * Page: postMessage { source: 'cins-shopee-page', type, ... }
 * Ext:  postMessage { source: 'cins-shopee-ext', type, ... }
 */

const PAGE_SOURCE = "cins-shopee-page";
const EXT_SOURCE = "cins-shopee-ext";
const VERSION = "1.1.3";

function reply(payload) {
  window.postMessage({ source: EXT_SOURCE, ...payload }, "*");
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== PAGE_SOURCE) return;

  if (data.type === "PING") {
    reply({ type: "PONG", version: VERSION });
    return;
  }

  const requestId = data.requestId;
  const types = new Set([
    "FETCH_GET_PC",
    "LIST_SHOP_ITEMS",
    "FETCH_GET_PC_BATCH",
  ]);
  if (!types.has(data.type)) return;

  const msg =
    data.type === "FETCH_GET_PC"
      ? { type: data.type, url: data.url }
      : data.type === "LIST_SHOP_ITEMS"
        ? { type: data.type, url: data.url, maxItems: data.maxItems }
        : { type: data.type, entries: data.entries };

  chrome.runtime.sendMessage(msg, (response) => {
    const err = chrome.runtime.lastError;
    const resultType =
      data.type === "FETCH_GET_PC"
        ? "FETCH_GET_PC_RESULT"
        : data.type === "LIST_SHOP_ITEMS"
          ? "LIST_SHOP_ITEMS_RESULT"
          : "FETCH_GET_PC_BATCH_RESULT";

    reply({
      type: resultType,
      requestId,
      ok: !err && response?.ok === true,
      data: response?.data ?? null,
      results: response?.results ?? null,
      error:
        err?.message ||
        response?.error ||
        (!response ? "Trợ lý AI không phản hồi." : null),
    });
  });
});

reply({ type: "READY", version: VERSION });

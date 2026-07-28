/**
 * Trợ lý CINs — cầu nối trang CINs ↔ service worker (không cần biết extension ID).
 * Hỗ trợ 2 giao thức song song (giữ tương thích extension Shopee cũ):
 *   - Shopee: page 'cins-shopee-page' ↔ ext 'cins-shopee-ext'
 *   - Port:   page 'cins-port-page'   ↔ ext 'cins-port-ext'
 */

const VERSION = "1.0.0";

const SHOPEE_PAGE = "cins-shopee-page";
const SHOPEE_EXT = "cins-shopee-ext";
const PORT_PAGE = "cins-port-page";
const PORT_EXT = "cins-port-ext";

/** Loại message forward tới background theo từng giao thức. */
const SHOPEE_TYPES = new Set([
  "FETCH_GET_PC",
  "LIST_SHOP_ITEMS",
  "FETCH_GET_PC_BATCH",
]);
const PORT_TYPES = new Set(["LIST_PROFILE_WORKS", "FETCH_WORK"]);

function replyTo(extSource, payload) {
  window.postMessage({ source: extSource, ...payload }, "*");
}

/** Payload gửi xuống background (bỏ trường source/requestId của page). */
function toBackgroundMessage(data) {
  switch (data.type) {
    case "FETCH_GET_PC":
      return { type: data.type, url: data.url };
    case "LIST_SHOP_ITEMS":
      return { type: data.type, url: data.url, maxItems: data.maxItems };
    case "FETCH_GET_PC_BATCH":
      return { type: data.type, entries: data.entries };
    case "LIST_PROFILE_WORKS":
      return {
        type: data.type,
        platform: data.platform,
        username: data.username,
        maxItems: data.maxItems,
      };
    case "FETCH_WORK":
      return { type: data.type, platform: data.platform, url: data.url };
    default:
      return { type: data.type };
  }
}

function resultTypeFor(type) {
  switch (type) {
    case "FETCH_GET_PC":
      return "FETCH_GET_PC_RESULT";
    case "LIST_SHOP_ITEMS":
      return "LIST_SHOP_ITEMS_RESULT";
    case "FETCH_GET_PC_BATCH":
      return "FETCH_GET_PC_BATCH_RESULT";
    case "LIST_PROFILE_WORKS":
      return "LIST_PROFILE_WORKS_RESULT";
    case "FETCH_WORK":
      return "FETCH_WORK_RESULT";
    default:
      return `${type}_RESULT`;
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data.type !== "string") return;

  const isShopee = data.source === SHOPEE_PAGE;
  const isPort = data.source === PORT_PAGE;
  if (!isShopee && !isPort) return;

  const extSource = isShopee ? SHOPEE_EXT : PORT_EXT;

  if (data.type === "PING") {
    replyTo(extSource, { type: "PONG", version: VERSION });
    return;
  }

  const allowed = isShopee ? SHOPEE_TYPES : PORT_TYPES;
  if (!allowed.has(data.type)) return;

  const requestId = data.requestId;
  const resultType = resultTypeFor(data.type);

  chrome.runtime.sendMessage(toBackgroundMessage(data), (response) => {
    const err = chrome.runtime.lastError;
    replyTo(extSource, {
      type: resultType,
      requestId,
      ok: !err && response?.ok === true,
      data: response?.data ?? null,
      results: response?.results ?? null,
      error:
        err?.message ||
        response?.error ||
        (!response ? "Trợ lý CINs không phản hồi." : null),
    });
  });
});

replyTo(SHOPEE_EXT, { type: "READY", version: VERSION });
replyTo(PORT_EXT, { type: "READY", version: VERSION });

/**
 * Bridge trang CINs ↔ extension (không cần biết extension ID).
 * Page: postMessage { source: 'cins-shopee-page', type, ... }
 * Ext:  postMessage { source: 'cins-shopee-ext', type, ... }
 */

const PAGE_SOURCE = "cins-shopee-page";
const EXT_SOURCE = "cins-shopee-ext";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== PAGE_SOURCE) return;

  if (data.type === "PING") {
    window.postMessage(
      { source: EXT_SOURCE, type: "PONG", version: "1.0.0" },
      "*",
    );
    return;
  }

  if (data.type === "FETCH_GET_PC") {
    const requestId = data.requestId;
    chrome.runtime.sendMessage(
      { type: "FETCH_GET_PC", url: data.url },
      (response) => {
        const err = chrome.runtime.lastError;
        window.postMessage(
          {
            source: EXT_SOURCE,
            type: "FETCH_GET_PC_RESULT",
            requestId,
            ok: !err && response?.ok === true,
            data: response?.data ?? null,
            error:
              err?.message ||
              response?.error ||
              (!response ? "Trợ lý AI không phản hồi." : null),
          },
          "*",
        );
      },
    );
  }
});

// Báo sẵn sàng sớm (trang reload / HMR)
window.postMessage(
  { source: EXT_SOURCE, type: "READY", version: "1.0.0" },
  "*",
);

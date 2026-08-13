/**
 * Background: POST batch mục lên CINs (tránh CORS từ popup nếu cần).
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GUI_MUC") {
    guiMuc(message)
      .then(sendResponse)
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err?.message || String(err),
        }),
      );
    return true;
  }
  return false;
});

async function guiMuc({ apiBase, secret, body }) {
  if (!apiBase || !secret) {
    return { ok: false, error: "Thiếu API base hoặc secret." };
  }
  if (!body?.items?.length) {
    return { ok: false, error: "Thiếu items." };
  }

  const endpoint = String(apiBase).replace(/\/$/, "") + "/api/internal/auto/items";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + secret,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    return {
      ok: false,
      error: data?.error || `HTTP ${res.status}`,
      status: res.status,
    };
  }

  return { ok: true, data };
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function workerConfig() {
  const secret =
    process.env.SINE_ART_WORKER_SECRET?.trim() ||
    process.env.CINS_FETCH_WORKER_SECRET?.trim() ||
    "";
  const base =
    process.env.SINE_ART_WORKER_URL?.trim() ||
    process.env.CINS_FETCH_WORKER_URL?.trim() ||
    "";
  if (!secret || !base) return null;
  return { base: base.replace(/\/$/, ""), secret };
}

export function coFetchWorker() {
  return Boolean(workerConfig());
}

/**
 * Fetch HTML/text qua Sine Art worker (tránh Cloudflare 1010 trên UA bot).
 * @returns {{ ok: boolean, status: number, contentType?: string, finalUrl?: string, text: string, error?: string }}
 */
export async function fetchQuaWorker(url, headers = {}) {
  const cfg = workerConfig();
  if (!cfg) {
    return {
      ok: false,
      status: 0,
      text: "",
      error:
        "Thiếu SINE_ART_WORKER_URL / SINE_ART_WORKER_SECRET (hoặc CINS_FETCH_WORKER_*).",
    };
  }

  const res = await fetch(`${cfg.base}/fetch-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      "x-api-secret": cfg.secret,
    },
    body: JSON.stringify({
      url,
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/xml, text/html, */*",
        ...headers,
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      status: res.status,
      text: "",
      error: `Worker JSON lỗi (HTTP ${res.status}).`,
    };
  }

  const text = typeof data.html === "string" ? data.html : "";
  return {
    ok: Boolean(data.ok),
    status: Number(data.status ?? res.status) || 0,
    contentType: data.contentType || "",
    finalUrl: data.finalUrl || url,
    text,
    error: data.ok
      ? undefined
      : data.error || `Upstream HTTP ${data.status || res.status}`,
  };
}

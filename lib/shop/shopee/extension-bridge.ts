/**
 * Bridge trang CINs ↔ extension "CINs · Import Shopee" (postMessage).
 * Chỉ dùng ở client component.
 */

const PAGE_SOURCE = "cins-shopee-page";
const EXT_SOURCE = "cins-shopee-ext";

export const CINS_SHOPEE_EXT_ZIP_HREF = "/downloads/cins-shopee-import.zip";
export const CINS_SHOPEE_SHOP_MAX_ITEMS = 100;

export type ShopeeShopListItem = {
  shopId: string;
  itemId: string;
  name: string;
  imageUrl: string | null;
  priceMin: number | null;
  productUrl: string;
};

export type ShopeeShopListResult = {
  shopId: string;
  shopName: string;
  items: ShopeeShopListItem[];
  truncated: boolean;
};

export type ShopeeGetPcBatchEntry = {
  shopId: string;
  itemId: string;
  productUrl?: string;
};

export type ShopeeGetPcBatchResult = {
  shopId: string;
  itemId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

type ExtMessage =
  | { source: typeof EXT_SOURCE; type: "PONG" | "READY"; version?: string }
  | {
      source: typeof EXT_SOURCE;
      type: "FETCH_GET_PC_RESULT";
      requestId: string;
      ok: boolean;
      data?: unknown;
      error?: string | null;
    }
  | {
      source: typeof EXT_SOURCE;
      type: "LIST_SHOP_ITEMS_RESULT";
      requestId: string;
      ok: boolean;
      data?: ShopeeShopListResult | null;
      error?: string | null;
    }
  | {
      source: typeof EXT_SOURCE;
      type: "FETCH_GET_PC_BATCH_RESULT";
      requestId: string;
      ok: boolean;
      results?: ShopeeGetPcBatchResult[] | null;
      error?: string | null;
    };

function isExtMessage(v: unknown): v is ExtMessage {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.source === EXT_SOURCE && typeof o.type === "string";
}

function newRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ping extension — true nếu content script đang chạy trên trang. */
export function pingShopeeExtension(timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      resolve(ok);
    };

    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type === "PONG" || event.data.type === "READY") {
        finish(true);
      }
    };

    window.addEventListener("message", onMsg);
    window.postMessage({ source: PAGE_SOURCE, type: "PING" }, "*");
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/**
 * Nhờ extension mở tab Shopee + gọi get_pc, trả JSON gốc.
 */
export function fetchShopeeGetPcViaExtension(
  url: string,
  timeoutMs = 60000,
): Promise<unknown> {
  const requestId = newRequestId();

  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      fn();
    };

    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type !== "FETCH_GET_PC_RESULT") return;
      if (event.data.requestId !== requestId) return;

      if (event.data.ok && event.data.data != null) {
        finish(() => resolve(event.data.data));
      } else {
        finish(() =>
          reject(
            new Error(
              event.data.error ||
                "Trợ lý AI không lấy được dữ liệu Shopee.",
            ),
          ),
        );
      }
    };

    window.addEventListener("message", onMsg);
    window.postMessage(
      { source: PAGE_SOURCE, type: "FETCH_GET_PC", requestId, url },
      "*",
    );
    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Hết thời gian chờ trợ lý AI. Kiểm tra đã bật trợ lý và cho phép truy cập shopee.vn.",
          ),
        ),
      );
    }, timeoutMs);
  });
}

/** Quét danh sách sản phẩm trong shop (cần trợ lý AI). */
export function listShopeeShopViaExtension(
  url: string,
  maxItems = CINS_SHOPEE_SHOP_MAX_ITEMS,
  timeoutMs = 120000,
): Promise<ShopeeShopListResult> {
  const requestId = newRequestId();

  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      fn();
    };

    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type !== "LIST_SHOP_ITEMS_RESULT") return;
      if (event.data.requestId !== requestId) return;

      if (event.data.ok && event.data.data) {
        finish(() => resolve(event.data.data as ShopeeShopListResult));
      } else {
        finish(() =>
          reject(
            new Error(
              event.data.error || "Không quét được danh sách shop Shopee.",
            ),
          ),
        );
      }
    };

    window.addEventListener("message", onMsg);
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: "LIST_SHOP_ITEMS",
        requestId,
        url,
        maxItems,
      },
      "*",
    );
    const timer = setTimeout(() => {
      finish(() =>
        reject(new Error("Hết thời gian quét shop. Thử lại sau.")),
      );
    }, timeoutMs);
  });
}

/**
 * Lấy get_pc hàng loạt trên 1 tab Shopee.
 * Timeout theo số lượng (tối thiểu 2 phút).
 */
export function fetchShopeeGetPcBatchViaExtension(
  entries: ShopeeGetPcBatchEntry[],
  timeoutMs?: number,
): Promise<ShopeeGetPcBatchResult[]> {
  const requestId = newRequestId();
  const wait = timeoutMs ?? Math.max(120000, entries.length * 8000);

  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      fn();
    };

    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type !== "FETCH_GET_PC_BATCH_RESULT") return;
      if (event.data.requestId !== requestId) return;

      if (event.data.ok && Array.isArray(event.data.results)) {
        finish(() => resolve(event.data.results as ShopeeGetPcBatchResult[]));
      } else {
        finish(() =>
          reject(
            new Error(
              event.data.error || "Không lấy được dữ liệu hàng loạt.",
            ),
          ),
        );
      }
    };

    window.addEventListener("message", onMsg);
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: "FETCH_GET_PC_BATCH",
        requestId,
        entries,
      },
      "*",
    );
    const timer = setTimeout(() => {
      finish(() =>
        reject(new Error("Hết thời gian lấy hàng loạt từ Shopee.")),
      );
    }, wait);
  });
}

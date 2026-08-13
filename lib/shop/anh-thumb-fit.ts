export type ShopThumbFit = "contain" | "cover";

export const SHOP_THUMB_FIT_DEFAULT: ShopThumbFit = "cover";
export const SHOP_THUMB_FIT_EVENT = "cins-shop-thumb-fit";
const SHOP_THUMB_FIT_CHANNEL = "cins-shop-thumb-fit";

export type ShopThumbFitDetail = {
  idSanPham: string;
  fit: ShopThumbFit;
};

export function parseShopThumbFit(value: unknown): ShopThumbFit {
  return value === "contain" ? "contain" : "cover";
}

export function toggleShopThumbFit(current: unknown): ShopThumbFit {
  return parseShopThumbFit(current) === "contain" ? "cover" : "contain";
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  const w = window as Window & {
    __cinsShopThumbFitCh?: BroadcastChannel;
  };
  if (!w.__cinsShopThumbFitCh) {
    try {
      w.__cinsShopThumbFitCh = new BroadcastChannel(SHOP_THUMB_FIT_CHANNEL);
    } catch {
      return null;
    }
  }
  return w.__cinsShopThumbFitCh;
}

/** Đổi UI ngay — tab khác (kiosk/giỏ) nhận cùng tick, không chờ refetch. */
export function broadcastShopThumbFit(
  idSanPham: string,
  fit: ShopThumbFit,
): void {
  if (typeof window === "undefined") return;
  const detail: ShopThumbFitDetail = { idSanPham, fit };
  window.dispatchEvent(new CustomEvent(SHOP_THUMB_FIT_EVENT, { detail }));
  try {
    getChannel()?.postMessage(detail);
  } catch {
    /* private mode */
  }
}

export function subscribeShopThumbFit(
  onFit: (detail: ShopThumbFitDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const onWindow = (e: Event) => {
    const d = (e as CustomEvent<ShopThumbFitDetail>).detail;
    if (!d?.idSanPham) return;
    onFit({ idSanPham: d.idSanPham, fit: parseShopThumbFit(d.fit) });
  };
  const onChannel = (e: MessageEvent<ShopThumbFitDetail>) => {
    const d = e.data;
    if (!d?.idSanPham) return;
    onFit({ idSanPham: d.idSanPham, fit: parseShopThumbFit(d.fit) });
  };
  window.addEventListener(SHOP_THUMB_FIT_EVENT, onWindow);
  const ch = getChannel();
  ch?.addEventListener("message", onChannel);
  return () => {
    window.removeEventListener(SHOP_THUMB_FIT_EVENT, onWindow);
    ch?.removeEventListener("message", onChannel);
  };
}

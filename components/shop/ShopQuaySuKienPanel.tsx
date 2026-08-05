"use client";

import {
  Check,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CuaHangListCard } from "@/components/shop/CuaHangListCard";
import { GIO_CHUNG_CHANGED_EVENT, notifyGioChungAdded } from "@/components/shop/ShopGioChungButton";
import { getNameInitials } from "@/lib/journey/profile";
import { normalizeSearchText } from "@/lib/search/normalize";
import { shopEntryHref } from "@/lib/shop/cua-hang-href";
import type {
  ShopEvidence,
  ShopGioChung,
  ShopQuayHangSearch,
  ShopQuaySuKien,
} from "@/lib/shop/types";

import "@/app/cua-hang/cua-hang-listing.css";
import "./shop-dashboard.css";
import "./shop-kiosk-block.css";

function quayShopHref(q: ShopQuaySuKien): string | null {
  const fromListing = q.shop?.href?.trim();
  if (fromListing) return fromListing;
  const slug = q.nguoiDungSlug?.trim();
  return slug ? shopEntryHref(slug) : null;
}

function quaySearchHaystack(q: ShopQuaySuKien): string {
  const parts: Array<string | null | undefined> = [
    q.shop?.searchHaystack,
    q.nguoiDungTen,
    q.nguoiDungSlug,
  ];
  for (const h of q.hangSearch ?? []) {
    parts.push(h.tenSanPham, h.nhanBienThe, h.phanLoai, h.phanLoai2);
  }
  return normalizeSearchText(parts.filter(Boolean).join(" "));
}

function hangSearchHaystack(
  h: ShopQuayHangSearch,
  seller?: { ten?: string | null; slug?: string | null },
): string {
  return normalizeSearchText(
    [
      h.tenSanPham,
      h.nhanBienThe,
      h.phanLoai,
      h.phanLoai2,
      seller?.ten,
      seller?.slug,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function filterQuayBySearch(
  items: ReadonlyArray<ShopQuaySuKien>,
  query: string,
): ShopQuaySuKien[] {
  const q = normalizeSearchText(query);
  if (!q) return [...items];
  return items.filter((item) => quaySearchHaystack(item).includes(q));
}

type QuayHangCard = ShopQuayHangSearch & {
  quayId: string;
  shopHref: string | null;
  sellerName: string | null;
  sellerSlug: string | null;
  /** Chủ quầy = seller (product owner). */
  idNguoiBan: string;
};

function collectHangCards(
  items: ReadonlyArray<ShopQuaySuKien>,
  query: string,
): QuayHangCard[] {
  const q = normalizeSearchText(query);
  const out: QuayHangCard[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.trangThai !== "da_duyet") continue;
    const shopHref = quayShopHref(item);
    for (const h of item.hangSearch ?? []) {
      if (
        q &&
        !hangSearchHaystack(h, {
          ten: item.nguoiDungTen,
          slug: item.nguoiDungSlug,
        }).includes(q)
      ) {
        continue;
      }
      const key = `${h.idBienThe}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...h,
        quayId: item.id,
        shopHref,
        sellerName: item.nguoiDungTen?.trim() || null,
        sellerSlug: item.nguoiDungSlug?.trim() || null,
        idNguoiBan: item.idNguoiDung,
      });
    }
  }
  return out;
}

function groupHangByLoai(
  cards: ReadonlyArray<QuayHangCard>,
): Array<{ loai: string; items: QuayHangCard[] }> {
  const map = new Map<string, QuayHangCard[]>();
  for (const c of cards) {
    const loai = c.phanLoai?.trim() || "Khác";
    const list = map.get(loai) ?? [];
    list.push(c);
    map.set(loai, list);
  }
  return [...map.entries()].map(([loai, items]) => ({ loai, items }));
}

type Props = {
  suKienId: string;
  canManage?: boolean;
  /** Hiện section kể cả khi chưa có quầy (dùng trong bảng quản lý). */
  alwaysShow?: boolean;
  /** Giữ tương thích caller cũ — toolbar hiện ô tìm kiếm. */
  title?: string;
  /** Báo số quầy đang chờ duyệt (sau mỗi lần tải danh sách). */
  onPendingCountChange?: (count: number) => void;
  /** Profile id viewer — nếu truyền (kể cả null) thì không fetch session-profile. */
  viewerProfileId?: string | null;
};

function QuayUserMeta({ q }: { q: ShopQuaySuKien }) {
  const name = q.nguoiDungTen ?? "Artist";
  const initials = getNameInitials(q.nguoiDungTen, q.nguoiDungSlug ?? "C");
  return (
    <div className="shop-quay-user">
      <span className="shop-quay-user-avatar" aria-hidden>
        {q.nguoiDungAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.nguoiDungAvatarUrl} alt="" />
        ) : (
          initials
        )}
      </span>
      <span className="shop-quay-user-copy">
        <strong>{name}</strong>
        {q.nguoiDungSlug ? (
          <span className="shop-dash-hint">@{q.nguoiDungSlug}</span>
        ) : null}
      </span>
    </div>
  );
}

function QuayShopFallbackLink({ q }: { q: ShopQuaySuKien }) {
  const slug = q.nguoiDungSlug?.trim();
  const name = q.nguoiDungTen?.trim() || "Shop";
  const initials = getNameInitials(q.nguoiDungTen, q.nguoiDungSlug ?? "S");
  const href = slug ? shopEntryHref(slug) : null;
  const body = (
    <>
      <span className="shop-quay-shop-avatar" aria-hidden>
        {q.nguoiDungAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.nguoiDungAvatarUrl} alt="" />
        ) : (
          initials
        )}
      </span>
      <span className="shop-quay-shop-copy">
        <strong>{name}</strong>
        <span className="shop-dash-hint">
          <Store size={12} strokeWidth={2} aria-hidden /> Quầy cửa hàng
          {slug ? ` · @${slug}` : null}
        </span>
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="shop-quay-shop-link">
        {body}
      </Link>
    );
  }
  return <div className="shop-quay-shop-link is-static">{body}</div>;
}

function EvidenceBlock({ items }: { items: ShopEvidence[] }) {
  if (items.length === 0) {
    return <p className="shop-dash-hint">Không kèm bằng chứng.</p>;
  }

  const images = items.filter(
    (e) => (e.kind === "file" || e.kind === "link") && Boolean(e.href),
  );
  const notes = items.filter((e) => e.kind === "text");
  const orphanLinks = items.filter(
    (e) =>
      e.kind === "link" &&
      !e.href &&
      Boolean(e.detail || e.label),
  );

  return (
    <div className="shop-quay-evidence">
      <h5 className="shop-quay-evidence-title">Ảnh xác thực</h5>
      {images.length > 0 ? (
        <ul className="shop-quay-evidence-grid">
          {images.map((e, i) => (
            <li key={`img-${i}`}>
              <a
                href={e.href}
                target="_blank"
                rel="noreferrer"
                className="shop-quay-evidence-shot"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.href} alt={e.label || "Ảnh xác thực"} />
              </a>
              {e.label ? (
                <span className="shop-dash-hint">{e.label}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {notes.map((e, i) => {
        const text = e.detail || e.label;
        if (!text) return null;
        return (
          <p key={`note-${i}`} className="shop-quay-evidence-note">
            {text}
          </p>
        );
      })}
      {orphanLinks.map((e, i) => {
        const text = e.detail || e.label;
        if (!text) return null;
        return (
          <p key={`link-${i}`} className="shop-quay-evidence-note">
            {text}
          </p>
        );
      })}
      {images.length === 0 &&
      notes.length === 0 &&
      orphanLinks.length === 0 ? (
        <p className="shop-dash-hint">Không kèm bằng chứng.</p>
      ) : null}
    </div>
  );
}

function QuayHangCatalogView({
  cards,
  onOpen,
  viewerProfileId,
}: {
  cards: ReadonlyArray<QuayHangCard>;
  onOpen: (shopHref: string) => void;
  viewerProfileId: string | null;
}) {
  const groups = groupHangByLoai(cards);
  const [qtyByBt, setQtyByBt] = useState<Map<string, number>>(new Map());
  const [cartErr, setCartErr] = useState<string | null>(null);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  /** idBienThe → số lượng chờ sync (sau debounce). */
  const pendingQtyRef = useRef(new Map<string, number>());
  const syncTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  /** Tăng mỗi lần đổi qty — bỏ qua PATCH response cũ. */
  const qtyEpochRef = useRef(new Map<string, number>());

  const loadGio = useCallback(async () => {
    if (!viewerProfileId) return;
    try {
      const res = await fetch("/api/shop/gio-chung", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        gio?: ShopGioChung;
      } | null;
      if (!res.ok || !json?.gio) return;
      const map = new Map<string, number>();
      for (const nhom of json.gio.nhom) {
        for (const d of nhom.dong) map.set(d.idBienThe, d.soLuong);
      }
      /* Giữ giá trị đang chờ sync. */
      for (const [bt, q] of pendingQtyRef.current) {
        if (q <= 0) map.delete(bt);
        else map.set(bt, q);
      }
      setQtyByBt(map);
    } catch {
      /* ignore */
    }
  }, [viewerProfileId]);

  useEffect(() => {
    void loadGio();
    const onChanged = () => void loadGio();
    window.addEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(GIO_CHUNG_CHANGED_EVENT, onChanged);
  }, [loadGio]);

  useEffect(() => {
    const timers = syncTimersRef.current;
    const pending = pendingQtyRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      pending.clear();
    };
  }, []);

  const flushQtySync = useCallback(
    async (idBienThe: string) => {
      const soLuong = pendingQtyRef.current.get(idBienThe);
      if (soLuong === undefined) return;
      pendingQtyRef.current.delete(idBienThe);
      const epoch = qtyEpochRef.current.get(idBienThe) ?? 0;
      try {
        const res = await fetch("/api/shop/gio-chung", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idBienThe, soLuong }),
        });
        const json = (await res.json().catch(() => null)) as {
          gio?: ShopGioChung;
          error?: string;
        } | null;
        if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
        if (!res.ok || !json?.gio) {
          setCartErr(json?.error ?? "Không thêm được vào giỏ.");
          await loadGio();
          return;
        }
        const map = new Map<string, number>();
        for (const nhom of json.gio.nhom) {
          for (const d of nhom.dong) map.set(d.idBienThe, d.soLuong);
        }
        for (const [bt, q] of pendingQtyRef.current) {
          if (q <= 0) map.delete(bt);
          else map.set(bt, q);
        }
        setQtyByBt(map);
        window.dispatchEvent(new Event(GIO_CHUNG_CHANGED_EVENT));
      } catch {
        if ((qtyEpochRef.current.get(idBienThe) ?? 0) !== epoch) return;
        setCartErr("Không thêm được vào giỏ.");
        await loadGio();
      }
    },
    [loadGio],
  );

  const patchQty = useCallback(
    (idBienThe: string, soLuong: number) => {
      const card = cardsRef.current.find((c) => c.idBienThe === idBienThe);
      const cap = card ? Math.max(0, card.soLuongTon) : Math.max(0, soLuong);
      const qty = Math.min(Math.max(0, Math.trunc(soLuong)), cap);
      if (card && soLuong > qty && card.soLuongTon > 0) {
        setCartErr(`Chỉ còn ${card.soLuongTon} trong kho.`);
      } else {
        setCartErr(null);
      }
      qtyEpochRef.current.set(
        idBienThe,
        (qtyEpochRef.current.get(idBienThe) ?? 0) + 1,
      );
      /* Phản hồi tức thì — không chờ mạng. */
      let shouldNotify = false;
      setQtyByBt((prev) => {
        const prevQty = prev.get(idBienThe) ?? 0;
        shouldNotify = qty > prevQty;
        const next = new Map(prev);
        if (qty <= 0) next.delete(idBienThe);
        else next.set(idBienThe, qty);
        return next;
      });
      if (shouldNotify) notifyGioChungAdded();
      pendingQtyRef.current.set(idBienThe, qty);
      const prevTimer = syncTimersRef.current.get(idBienThe);
      if (prevTimer) clearTimeout(prevTimer);
      syncTimersRef.current.set(
        idBienThe,
        setTimeout(() => {
          syncTimersRef.current.delete(idBienThe);
          void flushQtySync(idBienThe);
        }, 200),
      );
    },
    [flushQtySync],
  );

  if (groups.length === 0) {
    return (
      <p className="shop-dash-hint">Không có hàng khớp tìm kiếm.</p>
    );
  }

  return (
    <div
      className="shop-kiosk-catalog-body shop-quay-hang-catalog"
      aria-label="Kết quả tìm hàng sự kiện"
    >
      {cartErr ? (
        <p className="shop-kiosk-catalog-err" role="alert">
          {cartErr}
        </p>
      ) : null}
      {groups.map((group) => (
        <section key={group.loai} className="shop-kiosk-catalog-group">
          <h4 className="shop-kiosk-catalog-group-title">
            {group.loai}
            <span>{group.items.length}</span>
          </h4>
          <ul className="shop-kiosk-catalog-grid">
            {group.items.map((it) => {
              const outOfStock = it.hetHang || it.soLuongTon <= 0;
              const showLowStock =
                !outOfStock &&
                Number.isFinite(it.soLuongTon) &&
                it.soLuongTon > 0 &&
                it.soLuongTon < 5;
              const qty = qtyByBt.get(it.idBienThe) ?? 0;
              const canInc = !outOfStock && qty < it.soLuongTon;
              const isOwnItem =
                Boolean(viewerProfileId) && it.idNguoiBan === viewerProfileId;
              const openShop = () => {
                if (it.shopHref) onOpen(it.shopHref);
              };
              return (
                <li key={`${it.hangId}:${it.quayId}`} className="shop-kiosk-catalog-card">
                  {it.anhUrl ? (
                    <button
                      type="button"
                      className="shop-kiosk-catalog-thumb-btn"
                      onClick={openShop}
                      disabled={!it.shopHref}
                      aria-label={`Xem shop bán ${it.tenSanPham}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.anhUrl} alt="" loading="lazy" />
                      {showLowStock ? (
                        <span className="shop-kiosk-catalog-low-stock">
                          SL:{it.soLuongTon}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="shop-kiosk-catalog-thumb is-empty"
                      onClick={openShop}
                      disabled={!it.shopHref}
                      aria-label={`Xem shop bán ${it.tenSanPham}`}
                    >
                      {showLowStock ? (
                        <span className="shop-kiosk-catalog-low-stock">
                          SL:{it.soLuongTon}
                        </span>
                      ) : null}
                    </button>
                  )}
                  <div className="shop-kiosk-catalog-card-body">
                    <div className="shop-kiosk-catalog-card-name">
                      {it.tenSanPham}
                      {it.nhanBienThe !== "Mặc định" ? (
                        <span> · {it.nhanBienThe}</span>
                      ) : null}
                    </div>
                    <div className="shop-kiosk-catalog-card-foot">
                      <strong>
                        {it.giaHienThi.toLocaleString("vi-VN")} {it.tienTe}
                      </strong>
                    </div>
                    <div className="shop-kiosk-catalog-action">
                      <span className="shop-kiosk-catalog-stock">
                        Bán: {it.soLuongBan}
                      </span>
                      {it.sellerName ? (
                        <span className="shop-quay-hang-seller">
                          {it.sellerName}
                        </span>
                      ) : null}
                      {viewerProfileId && !isOwnItem ? (
                        qty > 0 ? (
                          <div className="shop-kiosk-qty shop-kiosk-catalog-qty">
                            <button
                              type="button"
                              aria-label="Bớt"
                              onClick={() =>
                                void patchQty(it.idBienThe, qty - 1)
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span>{qty}</span>
                            <button
                              type="button"
                              aria-label="Thêm"
                              disabled={!canInc}
                              title={
                                !canInc && !outOfStock
                                  ? `Tối đa ${it.soLuongTon} (tồn kho)`
                                  : outOfStock
                                    ? "Hết hàng"
                                    : undefined
                              }
                              onClick={() =>
                                void patchQty(it.idBienThe, qty + 1)
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="shop-kiosk-catalog-add"
                            disabled={outOfStock}
                            aria-label="Thêm vào giỏ chờ mua"
                            title={outOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                            onClick={() => void patchQty(it.idBienThe, 1)}
                          >
                            <Plus size={14} strokeWidth={2.4} aria-hidden />
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ShopQuaySuKienPanel({
  suKienId,
  canManage = false,
  alwaysShow = false,
  onPendingCountChange,
  viewerProfileId: viewerProfileIdProp,
}: Props) {
  const [items, setItems] = useState<ShopQuaySuKien[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerProfileId, setViewerProfileId] = useState<string | null>(
    viewerProfileIdProp !== undefined ? viewerProfileIdProp : null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  /** Chế độ lưới: shop (cửa hàng) · hàng (sản phẩm). */
  const [browseMode, setBrowseMode] = useState<"shop" | "hang">("shop");
  const [hangLoading, setHangLoading] = useState(false);
  const [hangLoaded, setHangLoaded] = useState(false);
  const hangInflightRef = useRef(false);
  const [reasonTarget, setReasonTarget] = useState<{
    id: string;
    mode: "reject" | "revoke";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);

  useEffect(() => {
    if (viewerProfileIdProp !== undefined) {
      setViewerProfileId(viewerProfileIdProp);
    }
  }, [viewerProfileIdProp]);

  const load = useCallback(async () => {
    setLoading(true);
    setHangLoaded(false);
    hangInflightRef.current = false;
    try {
      const q = canManage ? "?pending=1" : "";
      const res = await fetch(`/api/su-kien/${suKienId}/quay${q}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopQuaySuKien[];
      } | null;
      const next = json?.items ?? [];
      setItems(next);
      onPendingCountChange?.(
        next.filter((i) => i.trangThai === "cho_xu_ly").length,
      );
    } finally {
      setLoading(false);
    }
  }, [suKienId, canManage, onPendingCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const ensureHang = useCallback(async () => {
    if (canManage || hangLoaded || hangInflightRef.current) return;
    hangInflightRef.current = true;
    setHangLoading(true);
    try {
      const res = await fetch(
        `/api/su-kien/${encodeURIComponent(suKienId)}/quay/hang`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        bySeller?: Record<string, ShopQuayHangSearch[]>;
      } | null;
      const bySeller = json?.bySeller ?? {};
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          hangSearch: bySeller[item.idNguoiDung] ?? item.hangSearch,
        })),
      );
      setHangLoaded(true);

      /* Lazy session chỉ khi cần giỏ và chưa có prop. */
      if (viewerProfileIdProp === undefined) {
        try {
          const sp = await fetch("/api/auth/session-profile", {
            cache: "no-store",
          });
          const spJson = (await sp.json().catch(() => null)) as {
            profile?: { id?: string } | null;
          } | null;
          setViewerProfileId(spJson?.profile?.id?.trim() || null);
        } catch {
          setViewerProfileId(null);
        }
      }
    } finally {
      hangInflightRef.current = false;
      setHangLoading(false);
    }
  }, [canManage, hangLoaded, suKienId, viewerProfileIdProp]);

  useEffect(() => {
    if (browseMode === "hang") void ensureHang();
  }, [browseMode, ensureHang]);

  async function respond(
    id: string,
    action: "approve" | "reject",
    lyDo?: string,
  ) {
    setBusyId(id);
    setActionErr(null);
    try {
      const res = await fetch(`/api/su-kien/${suKienId}/quay/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lyDo: lyDo?.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setActionErr(json?.error ?? "Không cập nhật được.");
        return;
      }
      setReasonTarget(null);
      setReasonText("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openReason(id: string, mode: "reject" | "revoke") {
    setReasonTarget({ id, mode });
    setReasonText("");
    setActionErr(null);
  }

  async function confirmReason() {
    if (!reasonTarget) return;
    const lyDo = reasonText.trim();
    if (!lyDo) {
      setActionErr(
        reasonTarget.mode === "revoke"
          ? "Nhập lý do gỡ khỏi sự kiện."
          : "Nhập lý do từ chối.",
      );
      return;
    }
    await respond(reasonTarget.id, "reject", lyDo);
  }

  const filteredItems = useMemo(
    () => filterQuayBySearch(items, deferredSearch),
    [items, deferredSearch],
  );
  const approved = useMemo(
    () => filteredItems.filter((i) => i.trangThai === "da_duyet"),
    [filteredItems],
  );
  const pending = useMemo(
    () => filteredItems.filter((i) => i.trangThai === "cho_xu_ly"),
    [filteredItems],
  );
  const searchActive = normalizeSearchText(deferredSearch).length > 0;
  const showHangCatalog = browseMode === "hang" && !canManage;
  const hangCards = useMemo(
    () =>
      showHangCatalog ? collectHangCards(items, deferredSearch) : [],
    [showHangCatalog, items, deferredSearch],
  );

  const openShopStorefront = useCallback((shopHref: string) => {
    window.open(shopHref, "_blank", "noopener,noreferrer");
  }, []);

  if (loading) {
    return (
      <p className="shop-dash-hint">
        <Loader2 className="shop-spin" size={14} /> Đang tải quầy…
      </p>
    );
  }

  const hasAny = items.some(
    (i) =>
      i.trangThai === "da_duyet" ||
      (canManage && i.trangThai === "cho_xu_ly"),
  );
  if (!hasAny && !alwaysShow) {
    return null;
  }

  const showSearch = hasAny || alwaysShow;

  return (
    <section
      className="shop-quay-panel"
      style={{ marginTop: alwaysShow ? 0 : 16 }}
      aria-label="Quầy cửa hàng sự kiện"
    >
      <div className="j-tlb shop-quay-tlb">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-tlb-date">
          {showSearch ? (
            <label className="shop-quay-search">
              <Search size={14} strokeWidth={2.25} aria-hidden />
              <input
                type="search"
                value={search}
                placeholder={
                  browseMode === "hang"
                    ? "Tìm hàng, phân loại…"
                    : "Tìm shop…"
                }
                aria-label={
                  browseMode === "hang"
                    ? "Tìm theo tên sản phẩm hoặc phân loại"
                    : "Tìm theo tên shop"
                }
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  type="button"
                  className="shop-quay-search-clear"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => setSearch("")}
                >
                  <X size={13} strokeWidth={2.25} aria-hidden />
                </button>
              ) : null}
            </label>
          ) : null}
        </div>
        {!canManage && showSearch ? (
          <div
            className="j-surface-view-toggle"
            role="group"
            aria-label="Chế độ xem quầy"
          >
            <button
              type="button"
              className={`j-svt-btn${browseMode === "shop" ? " active" : ""}`}
              aria-pressed={browseMode === "shop"}
              title="Xem theo cửa hàng"
              onClick={() => setBrowseMode("shop")}
            >
              <Store size={15} strokeWidth={2} aria-hidden />
              Shop
            </button>
            <button
              type="button"
              className={`j-svt-btn${browseMode === "hang" ? " active" : ""}`}
              aria-pressed={browseMode === "hang"}
              title="Xem theo hàng"
              onClick={() => setBrowseMode("hang")}
            >
              <Package size={15} strokeWidth={2} aria-hidden />
              Hàng
            </button>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        showHangCatalog ? (
          hangLoading && !hangLoaded ? (
            <p className="shop-dash-hint">
              <Loader2 className="shop-spin" size={14} /> Đang tải hàng…
            </p>
          ) : hangCards.length ? (
            <QuayHangCatalogView
              cards={hangCards}
              onOpen={openShopStorefront}
              viewerProfileId={viewerProfileId}
            />
          ) : (
            <p className="shop-dash-hint">
              {searchActive
                ? "Không có hàng khớp tìm kiếm."
                : "Chưa có hàng trên các quầy."}
            </p>
          )
        ) : approved.length ? (
          <div className="ch-list-grid shop-quay-shop-grid">
            {approved.map((q) =>
              q.shop ? (
                <CuaHangListCard
                  key={q.id}
                  shop={q.shop}
                  query={deferredSearch}
                />
              ) : (
                <div key={q.id} className="shop-quay-shop-fallback">
                  <QuayShopFallbackLink q={q} />
                </div>
              ),
            )}
          </div>
        ) : alwaysShow || searchActive ? (
          <p className="shop-dash-hint">
            {searchActive
              ? "Không có quầy khớp tìm kiếm."
              : "Chưa có quầy được duyệt."}
          </p>
        ) : null
      ) : (
        <>
          {actionErr ? (
            <p className="shop-dash-hint shop-quay-action-err" role="alert">
              {actionErr}
            </p>
          ) : null}

          {approved.length ? (
            <ul className="shop-dash-list shop-quay-manage-grid">
              {approved.map((q) => {
                const asking = reasonTarget?.id === q.id;
                return (
                  <li
                    key={q.id}
                    className={
                      asking
                        ? "shop-dash-item shop-quay-manage-item is-reason"
                        : "shop-dash-item shop-quay-manage-item"
                    }
                  >
                    <div className="shop-quay-manage-row">
                      <div className="shop-quay-manage-shop">
                        {q.shop ? (
                          <CuaHangListCard shop={q.shop} query={deferredSearch} />
                        ) : (
                          <QuayUserMeta q={q} />
                        )}
                      </div>
                      <div className="shop-dash-actions">
                        <span className="shop-dash-hint">Đã duyệt</span>
                        <button
                          type="button"
                          className="shop-dash-danger"
                          disabled={busyId === q.id}
                          onClick={() => openReason(q.id, "revoke")}
                        >
                          Gỡ
                        </button>
                      </div>
                    </div>
                    {asking ? (
                      <div className="shop-quay-reason-box">
                        <textarea
                          rows={2}
                          value={reasonText}
                          onChange={(e) => setReasonText(e.target.value)}
                          placeholder="Lý do gỡ khỏi sự kiện…"
                          autoFocus
                        />
                        <div className="shop-quay-reason-actions">
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() => {
                              setReasonTarget(null);
                              setReasonText("");
                            }}
                          >
                            Huỷ
                          </button>
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={busyId === q.id || !reasonText.trim()}
                            onClick={() => void confirmReason()}
                          >
                            {busyId === q.id ? (
                              <Loader2 className="shop-spin" size={14} />
                            ) : (
                              "Xác nhận gỡ"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="shop-dash-hint">
              {searchActive
                ? "Không có quầy đã duyệt khớp tìm kiếm."
                : "Chưa có quầy được duyệt."}
            </p>
          )}

          {pending.length > 0 ? (
            <>
              <h4 style={{ fontSize: 14, margin: "14px 0 8px" }}>
                Chờ duyệt ({pending.length})
              </h4>
              <ul className="shop-dash-list shop-quay-review-list">
                {pending.map((q) => {
                  const asking = reasonTarget?.id === q.id;
                  return (
                    <li
                      key={q.id}
                      className="shop-dash-item shop-quay-review-item"
                    >
                      <header className="shop-quay-review-head">
                        <div className="shop-quay-manage-shop">
                          {q.shop ? (
                            <CuaHangListCard shop={q.shop} query={deferredSearch} />
                          ) : (
                            <QuayShopFallbackLink q={q} />
                          )}
                        </div>
                        <div className="shop-dash-actions">
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() => void respond(q.id, "approve")}
                            aria-label="Duyệt"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={busyId === q.id}
                            onClick={() => openReason(q.id, "reject")}
                            aria-label="Từ chối"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </header>

                      {asking ? (
                        <div className="shop-quay-reason-box">
                          <textarea
                            rows={2}
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            placeholder="Lý do từ chối…"
                            autoFocus
                          />
                          <div className="shop-quay-reason-actions">
                            <button
                              type="button"
                              disabled={busyId === q.id}
                              onClick={() => {
                                setReasonTarget(null);
                                setReasonText("");
                              }}
                            >
                              Huỷ
                            </button>
                            <button
                              type="button"
                              className="shop-dash-danger"
                              disabled={busyId === q.id || !reasonText.trim()}
                              onClick={() => void confirmReason()}
                            >
                              {busyId === q.id ? (
                                <Loader2 className="shop-spin" size={14} />
                              ) : (
                                "Xác nhận từ chối"
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <EvidenceBlock items={q.bangChung} />
                    </li>
                  );
                })}
              </ul>
            </>
          ) : alwaysShow ? (
            <p className="shop-dash-hint" style={{ marginTop: 10 }}>
              {searchActive
                ? "Không có quầy chờ duyệt khớp tìm kiếm."
                : "Không có quầy đang chờ duyệt."}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

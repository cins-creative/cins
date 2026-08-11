"use client";

import {
  Check,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { CuaHangListCard } from "@/components/shop/CuaHangListCard";
import { GIO_CHUNG_CHANGED_EVENT, notifyGioChungAdded } from "@/components/shop/ShopGioChungButton";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import { getNameInitials } from "@/lib/journey/profile";
import { normalizeSearchText } from "@/lib/search/normalize";
import type { PublicShopListingHang } from "@/lib/shop/cua-hang-listing-types";
import { shopEntryHref, shopLoaiHref } from "@/lib/shop/cua-hang-href";
import { parseShopNhomMoTa } from "@/lib/shop/nhom-mo-ta";
import type {
  ShopEvidence,
  ShopGioChung,
  ShopQuayHangSearch,
  ShopQuaySuKien,
} from "@/lib/shop/types";
import {
  parseSuKienQuayView,
  SU_KIEN_QUAY_VIEW_DEFAULT,
  type SuKienQuayView,
  withSuKienQuayView,
} from "@/lib/to-chuc/su-kien-routes";

import "@/app/cua-hang/cua-hang-listing.css";
import "@/components/journey/journey-shop-view.css";
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
      h.tenLoai,
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
  sellerAvatarUrl: string | null;
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
        sellerName:
          item.shop?.ten?.trim() || item.nguoiDungTen?.trim() || null,
        sellerAvatarUrl:
          item.shop?.avatarUrl?.trim() ||
          item.nguoiDungAvatarUrl?.trim() ||
          null,
        sellerSlug: item.nguoiDungSlug?.trim() || null,
        idNguoiBan: item.idNguoiDung,
      });
    }
  }
  return out;
}

type QuayMatHangCard = {
  id: string;
  quayId: string;
  nhan: string;
  moTa: string | null;
  anhUrl: string | null;
  giaHienThi: number | null;
  tienTe: string;
  hetHang: boolean;
  noiBat: boolean;
  soLuongBan: number;
  href: string;
  sellerName: string | null;
};

function formatQuayMatHangGia(gia: number, tienTe: string): string {
  const n = Number.isFinite(gia) ? gia : 0;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: tienTe === "VND" ? "VND" : tienTe || "VND",
      maximumFractionDigits: tienTe === "VND" ? 0 : 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} ${tienTe || "VND"}`;
  }
}

function QuayMatHangMoTa({ moTa }: { moTa: string }) {
  const blocks = parseShopNhomMoTa(moTa);
  const first = blocks.find((b) => b.type === "p");
  const text =
    first && first.type === "p" ? first.text.trim() : moTa.trim();
  if (!text) return null;
  return <p className="j-shop-sf-type-desc">{text}</p>;
}

function hangFromShopCatalog(
  shopHang: ReadonlyArray<PublicShopListingHang>,
): PublicShopListingHang[] {
  const seen = new Set<string>();
  const out: PublicShopListingHang[] = [];
  for (const h of shopHang) {
    const id = h.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(h);
  }
  return out;
}

function collectMatHangCards(
  items: ReadonlyArray<ShopQuaySuKien>,
  query: string,
): QuayMatHangCard[] {
  const q = normalizeSearchText(query);
  const out: QuayMatHangCard[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.trangThai !== "da_duyet") continue;
    const shop = item.shop;
    if (!shop) continue;
    const ownerSlug = shop.ownerSlug?.trim();
    const shopSlug = shop.shopSlug?.trim();
    if (!ownerSlug || !shopSlug) continue;
    const catalog = hangFromShopCatalog([
      ...shop.featuredHang,
      ...shop.catalogHang,
    ]);
    const sellerName =
      shop.ten?.trim() || item.nguoiDungTen?.trim() || null;
    for (const h of catalog) {
      if (
        q &&
        !normalizeSearchText(
          [h.ten, h.moTa, sellerName, shop.ownerSlug].filter(Boolean).join(" "),
        ).includes(q)
      ) {
        continue;
      }
      const key = `${h.id}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: h.id,
        quayId: item.id,
        nhan: h.ten,
        moTa: h.moTa?.trim() || null,
        anhUrl: h.anhUrl,
        giaHienThi:
          h.giaHienThi != null && Number.isFinite(h.giaHienThi)
            ? h.giaHienThi
            : null,
        tienTe: h.tienTe?.trim() || "VND",
        hetHang: h.hetHang === true,
        noiBat: h.noiBat === true,
        soLuongBan: h.soLuongBan ?? 0,
        href: shopLoaiHref(ownerSlug, shopSlug, h.id),
        sellerName,
      });
    }
  }
  return out;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: ReadonlyArray<T>, seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

/** Nút nhắn tin 1-1 với chủ shop quầy (tab Đã duyệt). */
function QuayManageChatButton({ q }: { q: ShopQuaySuKien }) {
  const { openChat, viewerProfileId } = useCinsChat();
  const [busy, setBusy] = useState(false);
  const ownerId = q.idNguoiDung.trim();
  const isSelf = Boolean(viewerProfileId) && viewerProfileId === ownerId;
  const displayName =
    q.shop?.ten?.trim() ||
    q.nguoiDungTen?.trim() ||
    q.shop?.ownerTen?.trim() ||
    q.nguoiDungSlug?.trim() ||
    "Shop";
  const slug =
    q.shop?.ownerSlug?.trim() || q.nguoiDungSlug?.trim() || undefined;
  const avatarUrl =
    q.shop?.avatarUrl?.trim() || q.nguoiDungAvatarUrl?.trim() || null;

  const onClick = () => {
    if (!ownerId || isSelf || busy) return;
    setBusy(true);
    void openChat({
      targetUserId: ownerId,
      tab: "nguoi_la",
      peerPreview: {
        name: displayName,
        slug,
        avatarUrl,
        avatarInitial: avatarInitialFromName(displayName),
        avatarHue: avatarHueFromSeed(ownerId),
      },
    }).finally(() => setBusy(false));
  };

  return (
    <button
      type="button"
      disabled={isSelf || busy || !ownerId}
      title={isSelf ? "Không nhắn tin cho chính mình" : "Nhắn tin với shop"}
      aria-label="Nhắn tin với shop"
      onClick={onClick}
    >
      {busy ? (
        <Loader2 className="shop-spin" size={14} />
      ) : (
        <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
      )}
      Nhắn tin
    </button>
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

function QuayMatHangCatalogView({
  cards,
}: {
  cards: ReadonlyArray<QuayMatHangCard>;
}) {
  const shuffleSeedRef = useRef((Math.random() * 0x100000000) >>> 0);
  const shuffleSeed = shuffleSeedRef.current;
  const cardsKey = useMemo(
    () => cards.map((c) => `${c.id}:${c.quayId}`).join("|"),
    [cards],
  );
  const shuffledOrder = useMemo(
    () => seededShuffle(cardsKey ? cardsKey.split("|") : [], shuffleSeed),
    [cardsKey, shuffleSeed],
  );
  const shuffledCards = useMemo(() => {
    const byKey = new Map(
      cards.map((c) => [`${c.id}:${c.quayId}`, c] as const),
    );
    return shuffledOrder
      .map((k) => byKey.get(k))
      .filter((c): c is QuayMatHangCard => c !== undefined);
  }, [cards, shuffledOrder]);

  if (cards.length === 0) {
    return (
      <p className="shop-dash-hint">Không có mặt hàng khớp tìm kiếm.</p>
    );
  }

  return (
    <section
      className="j-shop-sf-group shop-quay-mat-hang"
      aria-label="Mặt hàng các quầy"
    >
      <ul className="j-shop-sf-grid">
        {shuffledCards.map((card) => {
          const giaLabel =
            card.giaHienThi != null
              ? formatQuayMatHangGia(card.giaHienThi, card.tienTe)
              : "Chưa có giá";
          return (
            <li key={`${card.id}:${card.quayId}`}>
              <Link
                href={card.href}
                className={`j-shop-sf-card j-shop-sf-type-card${
                  card.hetHang ? " is-soldout" : ""
                }`}
              >
                <span className="j-shop-sf-card-media" aria-hidden>
                  {card.anhUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.anhUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="j-shop-sf-card-ph" />
                  )}
                  {card.hetHang ? (
                    <span className="j-shop-sf-soldout">Hết hàng</span>
                  ) : null}
                </span>
                <span className="j-shop-sf-card-body">
                  <span className="j-shop-sf-card-name">{card.nhan}</span>
                  {card.moTa ? <QuayMatHangMoTa moTa={card.moTa} /> : null}
                  <span className="j-shop-sf-type-meta">
                    {card.sellerName ? (
                      <span className="shop-quay-mat-hang-seller">
                        {card.sellerName}
                      </span>
                    ) : null}
                    {card.soLuongBan > 0 ? (
                      <span>Đã bán {card.soLuongBan.toLocaleString("vi-VN")}</span>
                    ) : null}
                  </span>
                  <span
                    className={`j-shop-sf-card-price${
                      card.giaHienThi == null ? " is-empty" : ""
                    }`}
                  >
                    {giaLabel}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
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
  /* Seed sinh một lần mỗi lần mount — F5 ra thứ tự khác, re-render thì giữ nguyên. */
  const shuffleSeedRef = useRef((Math.random() * 0x100000000) >>> 0);
  const shuffleSeed = shuffleSeedRef.current;
  const cardsKey = useMemo(
    () => cards.map((c) => `${c.hangId}:${c.quayId}`).join("|"),
    [cards],
  );
  const shuffledOrder = useMemo(
    () => seededShuffle(cardsKey ? cardsKey.split("|") : [], shuffleSeed),
    [cardsKey, shuffleSeed],
  );
  const shuffledCards = useMemo(() => {
    const byKey = new Map(
      cards.map((c) => [`${c.hangId}:${c.quayId}`, c] as const),
    );
    return shuffledOrder
      .map((k) => byKey.get(k))
      .filter((c): c is QuayHangCard => c !== undefined);
  }, [cards, shuffledOrder]);
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

  if (cards.length === 0) {
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
      <ul className="shop-kiosk-catalog-grid">
            {shuffledCards.map((it) => {
              const outOfStock = it.hetHang || it.soLuongTon <= 0;
              const showLowStock =
                !outOfStock &&
                Number.isFinite(it.soLuongTon) &&
                it.soLuongTon > 0 &&
                it.soLuongTon < 5;
              const showSold = it.soLuongBan > 0;
              const qty = qtyByBt.get(it.idBienThe) ?? 0;
              const canInc = !outOfStock && qty < it.soLuongTon;
              const isOwnItem =
                Boolean(viewerProfileId) && it.idNguoiBan === viewerProfileId;
              const openShop = () => {
                if (it.shopHref) onOpen(it.shopHref);
              };
              const thumbBadge = outOfStock ? (
                <span className="shop-kiosk-catalog-soldout">Hết hàng</span>
              ) : showLowStock ? (
                <span className="shop-kiosk-catalog-low-stock">
                  Còn {it.soLuongTon}
                </span>
              ) : null;
              return (
                <li
                  key={`${it.hangId}:${it.quayId}`}
                  className={`shop-kiosk-catalog-card${outOfStock ? " is-soldout" : ""}`}
                >
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
                      {thumbBadge}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="shop-kiosk-catalog-thumb is-empty"
                      onClick={openShop}
                      disabled={!it.shopHref}
                      aria-label={`Xem shop bán ${it.tenSanPham}`}
                    >
                      {thumbBadge}
                    </button>
                  )}
                  <div className="shop-kiosk-catalog-card-body">
                    <div className="shop-kiosk-catalog-card-foot">
                      <strong>
                        {it.giaHienThi.toLocaleString("vi-VN")}{" "}
                        {it.tienTe === "VND" ? "đ" : it.tienTe}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="shop-kiosk-catalog-card-name shop-quay-hang-name-btn"
                      onClick={openShop}
                      disabled={!it.shopHref}
                      title={
                        it.nhanBienThe !== "Mặc định"
                          ? `${it.tenSanPham} · ${it.nhanBienThe}`
                          : it.tenSanPham
                      }
                    >
                      {it.tenSanPham}
                      {it.nhanBienThe !== "Mặc định" ? (
                        <span> · {it.nhanBienThe}</span>
                      ) : null}
                    </button>
                    {it.tenLoai ? (
                      <div className="shop-quay-hang-loai" title={it.tenLoai}>
                        {it.tenLoai}
                      </div>
                    ) : null}
                    {it.sellerName ? (
                      <button
                        type="button"
                        className="shop-quay-hang-seller"
                        onClick={openShop}
                        disabled={!it.shopHref}
                        aria-label={`Xem shop ${it.sellerName}`}
                      >
                        <span
                          className="shop-quay-hang-seller-avatar"
                          aria-hidden
                        >
                          {it.sellerAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.sellerAvatarUrl} alt="" />
                          ) : (
                            getNameInitials(
                              it.sellerName,
                              it.sellerSlug ?? "S",
                            )
                          )}
                        </span>
                        <span className="shop-quay-hang-seller-name">
                          {it.sellerName}
                        </span>
                      </button>
                    ) : null}
                    <div className="shop-kiosk-catalog-action">
                      {showSold ? (
                        <span className="shop-kiosk-catalog-stock">
                          Đã bán {it.soLuongBan}
                        </span>
                      ) : (
                        <span className="shop-kiosk-catalog-stock is-empty" />
                      )}
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
    </div>
  );
}

export function ShopQuaySuKienPanel(props: Props) {
  return (
    <Suspense
      fallback={
        <p className="shop-dash-hint">
          <Loader2 className="shop-spin" size={14} /> Đang tải quầy…
        </p>
      }
    >
      <ShopQuaySuKienPanelInner {...props} />
    </Suspense>
  );
}

function ShopQuaySuKienPanelInner({
  suKienId,
  canManage = false,
  alwaysShow = false,
  onPendingCountChange,
  viewerProfileId: viewerProfileIdProp,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quayFromUrl = parseSuKienQuayView(searchParams.get("quay"));
  const browseMode: SuKienQuayView =
    !canManage && quayFromUrl ? quayFromUrl : SU_KIEN_QUAY_VIEW_DEFAULT;

  const [items, setItems] = useState<ShopQuaySuKien[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerProfileId, setViewerProfileId] = useState<string | null>(
    viewerProfileIdProp !== undefined ? viewerProfileIdProp : null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [hangLoading, setHangLoading] = useState(false);
  const [hangLoaded, setHangLoaded] = useState(false);
  const hangInflightRef = useRef(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const catalogInflightRef = useRef(false);
  const [reasonTarget, setReasonTarget] = useState<{
    id: string;
    mode: "reject" | "revoke";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);
  /** Tab quản lý nội dung: chờ duyệt (mặc định) · đã duyệt. */
  const [manageTab, setManageTab] = useState<"cho_duyet" | "da_duyet">(
    "cho_duyet",
  );

  useEffect(() => {
    if (viewerProfileIdProp !== undefined) {
      setViewerProfileId(viewerProfileIdProp);
    }
  }, [viewerProfileIdProp]);

  const load = useCallback(async () => {
    setLoading(true);
    setHangLoaded(false);
    hangInflightRef.current = false;
    setCatalogLoaded(false);
    catalogInflightRef.current = false;
    try {
      const q = new URLSearchParams();
      if (canManage) q.set("pending", "1");
      const qs = q.toString();
      const res = await fetch(
        `/api/su-kien/${suKienId}/quay${qs ? `?${qs}` : ""}`,
        { cache: "no-store" },
      );
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

  const ensureCatalog = useCallback(async () => {
    if (canManage || catalogLoaded || catalogInflightRef.current) return;
    catalogInflightRef.current = true;
    setCatalogLoading(true);
    try {
      const res = await fetch(
        `/api/su-kien/${encodeURIComponent(suKienId)}/quay?catalog=1`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        items?: ShopQuaySuKien[];
      } | null;
      const next = json?.items ?? [];
      setItems((prev) => {
        const hangBySeller = new Map(
          prev
            .filter((p) => p.hangSearch?.length)
            .map((p) => [p.idNguoiDung, p.hangSearch!] as const),
        );
        return next.map((item) => ({
          ...item,
          hangSearch: hangBySeller.get(item.idNguoiDung) ?? item.hangSearch,
        }));
      });
      setCatalogLoaded(true);
    } finally {
      catalogInflightRef.current = false;
      setCatalogLoading(false);
    }
  }, [canManage, catalogLoaded, suKienId]);

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
    if (browseMode === "mat-hang") void ensureCatalog();
    if (browseMode === "hang") void ensureHang();
  }, [browseMode, ensureCatalog, ensureHang]);

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
  const pendingTotal = useMemo(
    () => items.filter((i) => i.trangThai === "cho_xu_ly").length,
    [items],
  );
  const approvedTotal = useMemo(
    () => items.filter((i) => i.trangThai === "da_duyet").length,
    [items],
  );
  const searchActive = normalizeSearchText(deferredSearch).length > 0;

  function switchManageTab(next: "cho_duyet" | "da_duyet") {
    if (next === manageTab) return;
    setManageTab(next);
    setReasonTarget(null);
    setReasonText("");
    setActionErr(null);
  }

  const showHangCatalog = browseMode === "hang" && !canManage;
  const showMatHangCatalog = browseMode === "mat-hang" && !canManage;
  const hangCards = useMemo(
    () =>
      showHangCatalog ? collectHangCards(items, deferredSearch) : [],
    [showHangCatalog, items, deferredSearch],
  );
  const matHangCards = useMemo(
    () =>
      showMatHangCatalog ? collectMatHangCards(items, deferredSearch) : [],
    [showMatHangCatalog, items, deferredSearch],
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
                    : browseMode === "mat-hang"
                      ? "Tìm mặt hàng…"
                      : "Tìm shop…"
                }
                aria-label={
                  browseMode === "hang"
                    ? "Tìm theo tên sản phẩm hoặc phân loại"
                    : browseMode === "mat-hang"
                      ? "Tìm theo tên mặt hàng"
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
            <Link
              href={withSuKienQuayView(pathname, "shop", searchParams)}
              replace
              scroll={false}
              className={`j-svt-btn${browseMode === "shop" ? " active" : ""}`}
              aria-current={browseMode === "shop" ? "page" : undefined}
              title="Xem theo cửa hàng"
            >
              <Store size={15} strokeWidth={2} aria-hidden />
              Shop
            </Link>
            <Link
              href={withSuKienQuayView(pathname, "mat-hang", searchParams)}
              replace
              scroll={false}
              className={`j-svt-btn${browseMode === "mat-hang" ? " active" : ""}`}
              aria-current={browseMode === "mat-hang" ? "page" : undefined}
              title="Xem theo mặt hàng"
            >
              <LayoutGrid size={15} strokeWidth={2} aria-hidden />
              Mặt hàng
            </Link>
            <Link
              href={withSuKienQuayView(pathname, "hang", searchParams)}
              replace
              scroll={false}
              className={`j-svt-btn${browseMode === "hang" ? " active" : ""}`}
              aria-current={browseMode === "hang" ? "page" : undefined}
              title="Xem theo hàng"
            >
              <Package size={15} strokeWidth={2} aria-hidden />
              Hàng
            </Link>
          </div>
        ) : null}
        {canManage ? (
          <div
            className="shop-quay-manage-tabs"
            role="tablist"
            aria-label="Trạng thái duyệt quầy"
          >
            <button
              type="button"
              role="tab"
              id="shop-quay-tab-cho-duyet"
              aria-selected={manageTab === "cho_duyet"}
              aria-controls="shop-quay-panel-cho-duyet"
              className={`shop-quay-manage-tab${
                manageTab === "cho_duyet" ? " is-active" : ""
              }`}
              onClick={() => switchManageTab("cho_duyet")}
            >
              Chờ duyệt
              <span className="shop-quay-manage-tab-count">{pendingTotal}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="shop-quay-tab-da-duyet"
              aria-selected={manageTab === "da_duyet"}
              aria-controls="shop-quay-panel-da-duyet"
              className={`shop-quay-manage-tab${
                manageTab === "da_duyet" ? " is-active" : ""
              }`}
              onClick={() => switchManageTab("da_duyet")}
            >
              Đã duyệt
              <span className="shop-quay-manage-tab-count">{approvedTotal}</span>
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
        ) : showMatHangCatalog ? (
          catalogLoading && !catalogLoaded ? (
            <p className="shop-dash-hint">
              <Loader2 className="shop-spin" size={14} /> Đang tải mặt hàng…
            </p>
          ) : matHangCards.length ? (
            <QuayMatHangCatalogView cards={matHangCards} />
          ) : (
            <p className="shop-dash-hint">
              {searchActive
                ? "Không có mặt hàng khớp tìm kiếm."
                : "Chưa có mặt hàng trên các quầy."}
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

          <div
            id="shop-quay-panel-cho-duyet"
            role="tabpanel"
            aria-labelledby="shop-quay-tab-cho-duyet"
            hidden={manageTab !== "cho_duyet"}
          >
            {manageTab === "cho_duyet" ? (
              pending.length > 0 ? (
                <div className="ch-list-grid shop-quay-manage-grid shop-quay-manage-grid--pending">
                  {pending.map((q) => {
                    const asking = reasonTarget?.id === q.id;
                    return (
                      <div
                        key={q.id}
                        className={
                          asking
                            ? "shop-quay-manage-item is-reason"
                            : "shop-quay-manage-item"
                        }
                      >
                        <div className="shop-quay-manage-shop">
                          {q.shop ? (
                            <CuaHangListCard
                              shop={q.shop}
                              query={deferredSearch}
                            />
                          ) : (
                            <QuayShopFallbackLink q={q} />
                          )}
                        </div>
                        <div className="shop-quay-manage-actions">
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() => void respond(q.id, "approve")}
                            aria-label="Duyệt"
                          >
                            <Check size={14} />
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={busyId === q.id}
                            onClick={() => openReason(q.id, "reject")}
                            aria-label="Từ chối"
                          >
                            <X size={14} />
                            Từ chối
                          </button>
                        </div>

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
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="shop-dash-hint">
                  {searchActive
                    ? "Không có quầy chờ duyệt khớp tìm kiếm."
                    : "Không có quầy đang chờ duyệt."}
                </p>
              )
            ) : null}
          </div>

          <div
            id="shop-quay-panel-da-duyet"
            role="tabpanel"
            aria-labelledby="shop-quay-tab-da-duyet"
            hidden={manageTab !== "da_duyet"}
          >
            {manageTab === "da_duyet" ? (
              approved.length ? (
                <div className="ch-list-grid shop-quay-manage-grid">
                  {approved.map((q) => {
                    const asking = reasonTarget?.id === q.id;
                    return (
                      <div
                        key={q.id}
                        className={
                          asking
                            ? "shop-quay-manage-item is-reason"
                            : "shop-quay-manage-item"
                        }
                      >
                        <div className="shop-quay-manage-shop">
                          {q.shop ? (
                            <CuaHangListCard
                              shop={q.shop}
                              query={deferredSearch}
                            />
                          ) : (
                            <QuayUserMeta q={q} />
                          )}
                        </div>
                        <div className="shop-quay-manage-actions">
                          <span className="shop-quay-status shop-quay-status--approved">
                            Đã duyệt
                          </span>
                          <QuayManageChatButton q={q} />
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={busyId === q.id}
                            onClick={() => openReason(q.id, "revoke")}
                          >
                            Gỡ
                          </button>
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
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="shop-dash-hint">
                  {searchActive
                    ? "Không có quầy đã duyệt khớp tìm kiếm."
                    : "Chưa có quầy được duyệt."}
                </p>
              )
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

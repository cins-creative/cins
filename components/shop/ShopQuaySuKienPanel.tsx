"use client";

import { Check, Loader2, Minus, Plus, Search, X } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import { GIO_CHUNG_CHANGED_EVENT } from "@/components/shop/ShopGioChungButton";
import { GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { JourneyMilestoneCard } from "@/components/journey/JourneyMilestoneCard";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { ShopQuayReviewPost } from "@/components/shop/ShopQuayReviewPost";
import { getCoverUrl } from "@/lib/articles/cover";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import { getNameInitials } from "@/lib/journey/profile";
import {
  galleryMediaKindFromBlocks,
  isGalleryVideoCoverSrc,
  milestoneCardCaptionPlain,
} from "@/lib/journey/post-media";
import { normalizeSearchText } from "@/lib/search/normalize";
import type {
  ShopEvidence,
  ShopGioChung,
  ShopQuayHangSearch,
  ShopQuaySuKien,
} from "@/lib/shop/types";

import "./shop-dashboard.css";
import "./shop-kiosk-block.css";

function quaySearchHaystack(q: ShopQuaySuKien): string {
  const m = q.cotMoc;
  const parts: Array<string | null | undefined> = [
    q.nguoiDungTen,
    q.nguoiDungSlug,
    m?.title,
    m?.lensOwnerName,
    m?.postOwnerSlug,
    milestoneCardCaptionPlain(m?.tacPhamMoTa ?? m?.body, m?.noiDungBlocks),
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
  milestoneId: string;
  sellerName: string | null;
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
    const milestoneId = item.idCotMoc?.trim();
    if (!milestoneId) continue;
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
      const key = `${h.idBienThe}:${milestoneId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...h,
        quayId: item.id,
        milestoneId,
        sellerName: item.nguoiDungTen?.trim() || null,
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
/** Bài gắn quầy — đủ lens owner để datebar entity giống Journey. */
function quayMilestoneCard(q: ShopQuaySuKien): MilestoneItem | null {
  const m = q.cotMoc;
  if (!m) return null;
  return {
    ...m,
    lensOwnerId: m.lensOwnerId ?? m.postOwnerId ?? q.idNguoiDung,
    lensOwnerSlug: m.lensOwnerSlug ?? m.postOwnerSlug ?? q.nguoiDungSlug,
    lensOwnerName: m.lensOwnerName ?? q.nguoiDungTen,
    lensOwnerAvatarUrl: m.lensOwnerAvatarUrl ?? q.nguoiDungAvatarUrl,
    postOwnerId: m.postOwnerId ?? q.idNguoiDung,
    postOwnerSlug: m.postOwnerSlug ?? q.nguoiDungSlug,
  };
}

/**
 * Thumb lưới quầy — giống EntityLightGrid: `media` (cover/video) rồi ảnh đầu
 * album trong blocks (`milestonePreviewMedia` cố ý để trống album không cover).
 */
function quayGridThumbSrc(m: MilestoneItem): string | null {
  const fromMedia = m.media?.[0]?.src?.trim();
  if (fromMedia) return fromMedia;

  const entry = resolvePostGridEntry({
    moTa: m.tacPhamMoTa ?? m.body,
    coverId: m.tacPhamCoverId,
    blocks: m.noiDungBlocks ?? [],
  });
  if (!entry) return null;

  return (
    entry.coverSrc?.trim() || getCoverUrl(entry.coverId, "public") || null
  );
}

type QuayGridItem = {
  quayId: string;
  milestoneId: string;
  title: string;
  excerpt: string | null;
  thumbSrc: string | null;
  isVideo: boolean;
};

function quayApprovedGridItems(
  items: ReadonlyArray<ShopQuaySuKien>,
): QuayGridItem[] {
  const out: QuayGridItem[] = [];
  for (const q of items) {
    const m = quayMilestoneCard(q);
    if (!m) continue;
    const milestoneId = (m.cotMocId ?? m.id).trim();
    if (!milestoneId) continue;
    const thumbSrc = quayGridThumbSrc(m);
    const mediaKind = galleryMediaKindFromBlocks(m.noiDungBlocks);
    out.push({
      quayId: q.id,
      milestoneId,
      title: m.title?.trim() || q.nguoiDungTen?.trim() || "Bài đóng góp",
      excerpt:
        milestoneCardCaptionPlain(
          m.tacPhamMoTa ?? m.body,
          m.noiDungBlocks,
        ) ||
        q.nguoiDungTen?.trim() ||
        null,
      thumbSrc,
      isVideo:
        mediaKind === "video" ||
        Boolean(m.media?.[0]?.isVideo) ||
        isGalleryVideoCoverSrc(thumbSrc),
    });
  }
  return out;
}

function focusQuayMilestoneOnTimeline(milestoneId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector(
      `.shop-quay-review-list [data-mid="${CSS.escape(milestoneId)}"]`,
    );
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("is-flash");
    window.setTimeout(() => el.classList.remove("is-flash"), 1600);
  });
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

function QuayApprovedCard({
  q,
  viewerProfileId,
}: {
  q: ShopQuaySuKien;
  viewerProfileId: string | null;
}) {
  const milestone = quayMilestoneCard(q);
  if (!milestone) {
    return (
      <li className="shop-dash-item shop-quay-review-item">
        <QuayUserMeta q={q} />
        <p className="shop-dash-hint">
          {q.idCotMoc
            ? "Không tải được bài gốc của cột mốc này."
            : "Yêu cầu không gắn bài viết."}
        </p>
      </li>
    );
  }

  const ownerSlug =
    milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? q.nguoiDungSlug ?? "";
  const ownerProfileId =
    milestone.lensOwnerId ?? milestone.postOwnerId ?? q.idNguoiDung;
  const isOwner =
    Boolean(viewerProfileId) &&
    Boolean(ownerProfileId) &&
    viewerProfileId === ownerProfileId;

  return (
    <li className="shop-quay-review-card">
      <JourneyMilestoneCard
        milestone={milestone}
        isOwner={isOwner}
        entityLens
        analyticsNguon="entity_lens"
        ownerSlug={ownerSlug || undefined}
        ownerProfileId={ownerProfileId}
        viewerProfileId={viewerProfileId}
        authorAvatarUrl={milestone.lensOwnerAvatarUrl ?? null}
        authorName={milestone.lensOwnerName ?? null}
      />
    </li>
  );
}

function QuayApprovedGridView({
  items,
  layout,
  onOpen,
}: {
  items: ReadonlyArray<QuayGridItem>;
  layout: "card" | "masonry";
  onOpen: (milestoneId: string) => void;
}) {
  if (items.length === 0) {
    return <p className="shop-dash-hint">Chưa có nội dung được duyệt.</p>;
  }

  const gridClass =
    layout === "masonry"
      ? "j-main-gallery-grid j-main-gallery-grid--masonry shop-quay-gallery-grid"
      : "j-main-gallery-grid j-main-gallery-grid--card shop-quay-gallery-grid";

  return (
    <div className={gridClass} role="list" aria-label="Lưới đóng góp sự kiện">
      {items.map((it) => (
        <button
          key={it.quayId}
          type="button"
          role="listitem"
          className={`j-main-gallery-item${it.thumbSrc ? "" : " is-text"}`}
          onClick={() => onOpen(it.milestoneId)}
          aria-label={`Xem bài: ${it.title}`}
        >
          <div className="j-main-gallery-thumb">
            {it.thumbSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.thumbSrc}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : null}
            {it.isVideo ? <GalleryVideoPlayBadge /> : null}
          </div>
          {layout === "card" ? (
            <span className="j-main-gallery-info-panel">
              <strong className="j-main-gallery-info-title">{it.title}</strong>
              {it.excerpt ? (
                <small className="j-main-gallery-info-excerpt">
                  {it.excerpt}
                </small>
              ) : null}
            </span>
          ) : (
            <span className="j-main-gallery-overlay" aria-hidden>
              <span className="j-main-gallery-overlay-title">{it.title}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function QuayHangCatalogView({
  cards,
  onOpen,
  viewerProfileId,
}: {
  cards: ReadonlyArray<QuayHangCard>;
  onOpen: (milestoneId: string) => void;
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
      setQtyByBt((prev) => {
        const next = new Map(prev);
        if (qty <= 0) next.delete(idBienThe);
        else next.set(idBienThe, qty);
        return next;
      });
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
              return (
                <li key={`${it.hangId}:${it.milestoneId}`} className="shop-kiosk-catalog-card">
                  {it.anhUrl ? (
                    <button
                      type="button"
                      className="shop-kiosk-catalog-thumb-btn"
                      onClick={() => onOpen(it.milestoneId)}
                      aria-label={`Xem bài bán ${it.tenSanPham}`}
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
                      onClick={() => onOpen(it.milestoneId)}
                      aria-label={`Xem bài bán ${it.tenSanPham}`}
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
}: Props) {
  const [items, setItems] = useState<ShopQuaySuKien[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerProfileId, setViewerProfileId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<ContentSurfaceView>("timeline");
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [searchHang, setSearchHang] = useState(true);
  const [reasonTarget, setReasonTarget] = useState<{
    id: string;
    mode: "reject" | "revoke";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          profile?: { id?: string } | null;
        } | null;
        if (!cancelled) {
          setViewerProfileId(json?.profile?.id?.trim() || null);
        }
      } catch {
        if (!cancelled) setViewerProfileId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    if (view !== "timeline" || !pendingFocusId) return;
    focusQuayMilestoneOnTimeline(pendingFocusId);
    setPendingFocusId(null);
  }, [view, pendingFocusId]);

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
  const showHangCatalog = searchHang && searchActive && !canManage;
  const hangCards = useMemo(
    () =>
      showHangCatalog
        ? collectHangCards(items, deferredSearch)
        : [],
    [showHangCatalog, items, deferredSearch],
  );
  const gridItems = useMemo(
    () => quayApprovedGridItems(approved),
    [approved],
  );

  const openFromGrid = useCallback((milestoneId: string) => {
    setSearch("");
    setView("timeline");
    setPendingFocusId(milestoneId);
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

  const hasApprovedAll = items.some((i) => i.trangThai === "da_duyet");
  const showPublicSurface = !canManage && hasApprovedAll;
  const showSearch = hasAny || alwaysShow;

  return (
    <section
      className="shop-quay-panel"
      style={{ marginTop: alwaysShow ? 0 : 16 }}
      aria-label="Đóng góp sự kiện"
    >
      <div className="j-tlb shop-quay-tlb">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-tlb-date">
          {showSearch ? (
            <>
              <label className="shop-quay-search">
                <Search size={14} strokeWidth={2.25} aria-hidden />
                <input
                  type="search"
                  value={search}
                  placeholder="Tìm kiếm"
                  aria-label="Tìm theo tên người, sản phẩm hoặc phân loại"
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
              {!canManage ? (
                <button
                  type="button"
                  className={`shop-quay-hang-toggle${searchHang ? " is-active" : ""}`}
                  aria-pressed={searchHang}
                  title={
                    searchHang
                      ? "Đang tìm hàng — tắt để tìm bài đóng góp"
                      : "Bật để hiện lưới hàng khi tìm"
                  }
                  onClick={() => setSearchHang((v) => !v)}
                >
                  Search hàng
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {showPublicSurface && !showHangCatalog ? (
          <ContentSurfaceViewToggle view={view} onViewChange={setView} />
        ) : null}
      </div>

      {!canManage ? (
        showHangCatalog ? (
          hangCards.length ? (
            <QuayHangCatalogView
              cards={hangCards}
              onOpen={openFromGrid}
              viewerProfileId={viewerProfileId}
            />
          ) : (
            <p className="shop-dash-hint">Không có hàng khớp tìm kiếm.</p>
          )
        ) : approved.length ? (
          view === "timeline" ? (
            <ul className="shop-dash-list shop-quay-review-list">
              {approved.map((q) => (
                <QuayApprovedCard
                  key={q.id}
                  q={q}
                  viewerProfileId={viewerProfileId}
                />
              ))}
            </ul>
          ) : (
            <QuayApprovedGridView
              items={gridItems}
              layout={view === "masonry" ? "masonry" : "card"}
              onOpen={openFromGrid}
            />
          )
        ) : alwaysShow || searchActive ? (
          <p className="shop-dash-hint">
            {searchActive
              ? "Không có đóng góp khớp tìm kiếm."
              : "Chưa có nội dung được duyệt."}
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
            <ul className="shop-dash-list">
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
                      <QuayUserMeta q={q} />
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
                ? "Không có đóng góp đã duyệt khớp tìm kiếm."
                : "Chưa có nội dung được duyệt."}
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
                        <QuayUserMeta q={q} />
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

                      {q.cotMoc ? (
                        <ShopQuayReviewPost
                          milestone={q.cotMoc}
                          sellerUserId={q.idNguoiDung}
                          sellerName={q.nguoiDungTen}
                          sellerSlug={q.nguoiDungSlug}
                          viewerProfileId={viewerProfileId}
                        />
                      ) : q.idCotMoc ? (
                        <p className="shop-dash-hint">
                          Không tải được bài gốc của cột mốc này.
                        </p>
                      ) : (
                        <p className="shop-dash-hint">
                          Yêu cầu không gắn bài viết.
                        </p>
                      )}

                      <EvidenceBlock items={q.bangChung} />
                    </li>
                  );
                })}
              </ul>
            </>
          ) : alwaysShow ? (
            <p className="shop-dash-hint" style={{ marginTop: 10 }}>
              {searchActive
                ? "Không có nội dung chờ duyệt khớp tìm kiếm."
                : "Không có nội dung đang chờ duyệt."}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

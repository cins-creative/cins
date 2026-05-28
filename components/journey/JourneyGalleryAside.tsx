import Link from "next/link";

export type GalleryPinnedBanner = {
  id: string;
  /** URL ảnh nền 16:9. */
  src: string;
  /** Badge nhỏ góc trái-trên (Dự án / Motion / Brand…). */
  pin: string;
  title: string;
  meta: string;
  /** Link ngữ cảnh — VD /{slug}?mid=cins. */
  href?: string;
};

export type GalleryGridItem = {
  id: string;
  /** URL ảnh vuông 1:1. */
  src: string;
  label: string;
  /** Có icon ✓ góc phải-trên không. */
  isVerified?: boolean;
  /** Có overlay ▶ giữa thumbnail không. */
  isVideo?: boolean;
  href?: string;
};

type Props = {
  ownerSlug: string;
  /** Tổng số tác phẩm trong gallery (hiển thị trong title). */
  totalTacPham: number;
  /** Banner ghim nổi bật (0..N). 16:9. */
  pinned?: ReadonlyArray<GalleryPinnedBanner>;
  /** Grid item vuông (0..N). 1:1. */
  items?: ReadonlyArray<GalleryGridItem>;
};

/**
 * Gallery cột phải — tổng hợp visual từ cột mốc + tác phẩm.
 *
 * Cấu trúc:
 *   - Head: tiêu đề + count + link "xem tất cả"
 *   - Sub: dòng mô tả 1 câu
 *   - Pinned banners (optional)
 *   - Grid 2-col square items (optional)
 *   - Empty state nếu cả 2 đều trống
 */
export function JourneyGalleryAside({
  ownerSlug,
  totalTacPham,
  pinned = [],
  items = [],
}: Props) {
  const empty = pinned.length === 0 && items.length === 0;
  const galleryHref = `/${encodeURIComponent(ownerSlug)}/gallery`;

  return (
    <aside className="j-gallery" aria-label="Tác phẩm gần đây">
      <div className="j-gallery-head">
        <div className="j-gallery-title">
          Tác phẩm
          <span className="j-gallery-count">{totalTacPham}</span>
        </div>
        {totalTacPham > 0 ? (
          <Link href={galleryHref} className="j-gallery-all">
            Xem tất cả →
          </Link>
        ) : (
          <span className="j-gallery-all" aria-hidden>
            Xem tất cả →
          </span>
        )}
      </div>
      <div className="j-gallery-sub">
        Tổng hợp visual từ các cột mốc · sắp theo mới nhất
      </div>

      {empty ? (
        <div className="j-gallery-empty">
          <span className="j-gallery-empty-ico" aria-hidden>
            ▢
          </span>
          Tác phẩm sẽ xuất hiện ở đây khi bạn đính ảnh vào cột mốc.
        </div>
      ) : (
        <>
          {pinned.length > 0 ? (
            <div className="j-g-pinned">
              <div className="j-g-pinned-label">
                <span className="j-pin-dot" aria-hidden>
                  ★
                </span>
                Ghim nổi bật · {pinned.length}
              </div>
              {pinned.map((b) => (
                <a
                  key={b.id}
                  href={b.href ?? "#"}
                  className="j-g-banner"
                  data-pinned-id={b.id}
                >
                  <span className="j-g-banner-bg">
                    <img loading="lazy" src={b.src} alt="" />
                  </span>
                  <span className="j-g-banner-pin">{b.pin}</span>
                  <span className="j-g-banner-info">
                    <span className="j-g-banner-title">{b.title}</span>
                    <span className="j-g-banner-meta">{b.meta}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : null}

          {items.length > 0 ? (
            <div className="j-gallery-grid">
              {items.map((it) => (
                <a
                  key={it.id}
                  href={it.href ?? "#"}
                  className={"j-g-item" + (it.isVerified ? " is-verified" : "")}
                  data-item-id={it.id}
                  aria-label={it.label}
                >
                  <span className="j-g-thumb">
                    <img loading="lazy" src={it.src} alt={it.label} />
                  </span>
                  {it.isVideo ? (
                    <span className="j-g-play" aria-hidden>
                      ▶
                    </span>
                  ) : null}
                  <span className="j-g-overlay">
                    <span className="j-g-label">{it.label}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}

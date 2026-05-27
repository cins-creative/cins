import type {
  GalleryGridItem,
  GalleryPinnedBanner,
} from "@/components/journey/JourneyGalleryAside";

type Props = {
  pinned: ReadonlyArray<GalleryPinnedBanner>;
  items: ReadonlyArray<GalleryGridItem>;
};

export function JourneyGalleryGridView({ pinned, items }: Props) {
  const all = [
    ...pinned.map((item) => ({
      id: item.id,
      src: item.src,
      label: item.title,
      href: item.href,
      meta: item.meta,
      featured: true,
    })),
    ...items.map((item) => ({
      id: item.id,
      src: item.src,
      label: item.label,
      href: item.href,
      meta: "",
      featured: false,
    })),
  ];

  return (
    <section className="j-main-panel" aria-label="Gallery tác phẩm">
      <div className="j-main-panel-head">
        <span>Gallery</span>
        <strong>{all.length} tác phẩm</strong>
      </div>
      {all.length === 0 ? (
        <div className="j-main-empty">
          Chưa có tác phẩm dạng ảnh. Các bài có cover public/feature sẽ hiện ở đây.
        </div>
      ) : (
        <div className="j-main-gallery-grid">
          {all.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className={item.featured ? "j-main-gallery-item is-featured" : "j-main-gallery-item"}
            >
              <img src={item.src} alt={item.label} loading="lazy" />
              <span className="j-main-gallery-info">
                <strong>{item.label}</strong>
                {item.meta ? <small>{item.meta}</small> : null}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

import Image from "next/image";

import type { FbFeatureCardData } from "./feature-cards-data";

type Props = {
  card: FbFeatureCardData;
  exportRef?: (el: HTMLElement | null) => void;
};

export function FbFeatureCard({ card, exportRef }: Props) {
  const gallery = card.images ?? [];
  const hasGallery = gallery.length > 0;
  const hasImage = Boolean(card.image);

  return (
    <article
      ref={exportRef}
      className={`fb-card${hasGallery ? " fb-card--duo" : ""}`}
      data-fb-card-id={card.id}
      aria-label={`${card.kicker} — ${card.highlight}`}
    >
      <div className="fb-card__top">
        <Image
          src="/assets/logo-cins-wide.svg"
          alt="CINs"
          width={504}
          height={226}
          className="fb-card__brand-logo"
          priority
        />
        <span className="fb-card__kicker">{card.kicker}</span>
      </div>

      <div className="fb-card__copy">
        <p className="fb-card__highlight">{card.highlight}</p>
        <p className="fb-card__subtitle">{card.subtitle}</p>
        {card.tags.length > 0 ? (
          <ul className="fb-card__tags" aria-label="Điểm nổi bật">
            {card.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="fb-card__visual">
        <div className="fb-card__visual-frame">
          {hasGallery ? (
            <div className="fb-card__screenshot-duo">
              {gallery.map((item, index) => (
                <div
                  key={item.src}
                  className={`fb-card__screenshot-wrap fb-card__screenshot-wrap--layer-${index + 1}`}
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="fb-card__screenshot fb-card__screenshot--fill"
                    sizes="(max-width: 900px) 92vw, 1080px"
                    priority
                  />
                </div>
              ))}
            </div>
          ) : hasImage ? (
            <div className="fb-card__screenshot-wrap fb-card__screenshot-wrap--fluid">
              <Image
                src={card.image!}
                alt={card.imageAlt ?? card.highlight}
                width={1920}
                height={1080}
                className="fb-card__screenshot fb-card__screenshot--fluid"
                style={{ width: "100%", height: "auto" }}
                sizes="(max-width: 900px) 92vw, 1080px"
                priority
              />
            </div>
          ) : (
            <div className="fb-card__visual-placeholder">
              <div className="fb-card__visual-bg" aria-hidden />
              <div className="fb-card__icon-wrap" aria-hidden>
                <span className="material-symbols-outlined">
                  {card.icon ?? "storefront"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fb-card__footer">
        <Image
          src="/assets/logo-cins-icon.svg"
          alt=""
          width={32}
          height={32}
          className="fb-card__footer-icon"
          aria-hidden
        />
        <span className="fb-card__footer-url">cins.vn</span>
      </div>
    </article>
  );
}

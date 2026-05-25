import Image from "next/image";

import { getCoverUrl } from "@/lib/articles/cover";
import { relGradient, relInitials } from "@/lib/articles/rel-visual";

type Props = {
  title: string;
  coverId?: string | null;
  coverUrl?: string | null;
  slug: string;
};

export function KeywordCoverHero({ title, coverId, coverUrl, slug }: Props) {
  const img = coverUrl?.trim() || getCoverUrl(coverId);
  const grad = relGradient(slug);
  const ini = relInitials(title);

  return (
    <header className="kw-cover" aria-label="Ảnh bìa keyword">
      <div className="kw-cover-media">
        {img ? (
          <Image
            src={img}
            alt=""
            fill
            priority
            sizes="100vw"
            className="kw-cover-img"
            unoptimized
          />
        ) : (
          <div
            className="kw-cover-ph"
            style={{ background: grad }}
            aria-hidden
          >
            <span className="mascot-ph">{ini}</span>
          </div>
        )}
        <div className="kw-cover-scrim" aria-hidden />
      </div>
      <div className="kw-cover-title-bar">
        <h1 className="h-disp kw-cover-title">{title}</h1>
      </div>
    </header>
  );
}

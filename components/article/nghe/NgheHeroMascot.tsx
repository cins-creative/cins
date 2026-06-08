import Image from "next/image";

function heroInitials(title: string): string {
  const w = title.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2)
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  return title.trim().slice(0, 2).toUpperCase() || "C";
}

type Props = {
  /** URL từ `resolveArticleThumbnailOnlySync(article.thumbnail)` — không fallback `cover_id`. */
  thumbnailUrl?: string | null;
  title: string;
};

/** Ô mascot hero nghề — 4:3, map `article_bai_viet.thumbnail`. */
export function NgheHeroMascot({ thumbnailUrl, title }: Props) {
  const src = thumbnailUrl?.trim() || null;

  return (
    <div className={`mascot${src ? " mascot--has-img" : ""}`}>
      {src ? (
        <Image
          src={src}
          alt=""
          width={220}
          height={165}
          className="arv2-mascot-img"
          unoptimized
        />
      ) : (
        <span className="mascot-ph" aria-hidden>
          {heroInitials(title)}
        </span>
      )}
    </div>
  );
}

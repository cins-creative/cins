import Image from "next/image";

import { relGradient, relInitials } from "@/lib/articles/rel-visual";
import type { ArticleCard } from "@/lib/articles/types";

type Props = {
  card: ArticleCard;
  /** `thumb-sm` tile · `lg` sidebar môn học. */
  size?: "md" | "sm" | "lg";
};

export function RelThumb({ card, size = "md" }: Props) {
  const thumb = card.thumb_url?.trim() || null;
  const grad = relGradient(card.slug || card.id);
  const ini = relInitials(card.tieu_de);
  const className = [
    "rel-thumb",
    size === "sm" ? "thumb-sm" : "",
    thumb ? "rel-thumb--has-img" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      style={thumb ? undefined : { background: grad }}
      aria-hidden
    >
      {thumb ? (
        <Image
          src={thumb}
          alt=""
          width={size === "sm" ? 32 : size === "lg" ? 64 : 40}
          height={size === "sm" ? 24 : size === "lg" ? 48 : 30}
          unoptimized
        />
      ) : (
        ini
      )}
    </span>
  );
}

import { BookOpen, Users } from "lucide-react";

import { FeaturedFlagBadge } from "@/components/journey/FeaturedFlagBadge";
import type { MilestoneCardLayout } from "@/components/journey/milestone-types";

type Props = {
  layout: Extract<MilestoneCardLayout, "cong-dong-create" | "co-so-create">;
  label: string;
  kicker?: string | null;
  description?: string | null;
  coverSrc?: string;
  orgAvatarUrl?: string | null;
  featured?: boolean;
};

function formatOrgCreateKicker(text: string): string {
  return text.trim().replace(/^Người\s+/iu, "");
}

function orgCreateCardDescription(
  excerpt: string | null | undefined,
  kicker: string | null | undefined,
  orgName: string,
): string {
  const trimmed = (excerpt ?? "").trim();
  if (!trimmed) return "";

  const formattedKicker = kicker ? formatOrgCreateKicker(kicker) : "";
  if (trimmed === kicker?.trim() || trimmed === formattedKicker) return "";

  const cleaned = trimmed
    .replace(/^Người tạo (cơ sở đào tạo|cộng đồng)\s*[·•]\s*/iu, "")
    .replace(/\s*trên CINs\.?$/iu, "")
    .trim();

  if (!cleaned || cleaned === orgName.trim()) return "";
  return cleaned;
}

export function GalleryOrgCreateCardBody({
  layout,
  label,
  kicker,
  description,
  coverSrc,
  orgAvatarUrl,
  featured = false,
}: Props) {
  const isCongDong = layout === "cong-dong-create";
  const initial = (label.trim().charAt(0) || "?").toUpperCase();
  const kickerLabel = kicker ? formatOrgCreateKicker(kicker) : "";
  const desc = orgCreateCardDescription(description, kicker, label);

  return (
    <div className="j-gallery-org-card">
      <div
        className={[
          "j-gallery-org-card__hero",
          isCongDong ? "is-cong-dong" : "is-co-so",
          coverSrc ? "has-cover" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {featured ? <FeaturedFlagBadge className="j-gallery-org-card__pin" /> : null}
        {coverSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverSrc} alt="" className="j-gallery-org-card__cover" />
        ) : null}
        <span className="j-gallery-org-card__type">
          {isCongDong ? (
            <>
              <Users size={12} strokeWidth={1.9} aria-hidden />
              Cộng đồng
            </>
          ) : (
            <>
              <BookOpen size={12} strokeWidth={1.9} aria-hidden />
              Cơ sở đào tạo
            </>
          )}
        </span>
      </div>

      <div className="j-gallery-org-card__body">
        <div className="j-gallery-org-card__logo" aria-hidden>
          {orgAvatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={orgAvatarUrl} alt="" />
          ) : (
            initial
          )}
        </div>
        {kickerLabel ? (
          <p className="j-gallery-org-card__kicker">{kickerLabel}</p>
        ) : null}
        <h3 className="j-gallery-org-card__title">{label}</h3>
        {desc ? <p className="j-gallery-org-card__desc">{desc}</p> : null}
      </div>
    </div>
  );
}

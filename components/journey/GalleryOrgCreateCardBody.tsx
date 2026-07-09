import { FeaturedFlagBadge } from "@/components/journey/FeaturedFlagBadge";
import type { MilestoneCardLayout } from "@/components/journey/milestone-types";

type Props = {
  layout: Extract<
    MilestoneCardLayout,
    "cong-dong-create" | "co-so-create" | "studio-create"
  >;
  label: string;
  kicker?: string | null;
  description?: string | null;
  coverSrc?: string;
  orgAvatarUrl?: string | null;
  featured?: boolean;
};

const ORG_CREATE_KICKER: Record<Props["layout"], string> = {
  "cong-dong-create": "Người tạo cộng đồng",
  "co-so-create": "Người tạo cơ sở đào tạo",
  "studio-create": "Người tạo studio",
};

function orgCreateCardDescription(
  layout: Props["layout"],
  excerpt: string | null | undefined,
  kicker: string | null | undefined,
  orgName: string,
): string {
  const trimmed = (excerpt ?? "").trim();
  if (!trimmed) return "";

  const kickerLabel = ORG_CREATE_KICKER[layout];
  if (trimmed === kicker?.trim() || trimmed === kickerLabel) return "";

  const cleaned = trimmed
    .replace(/^Người tạo (cơ sở đào tạo|cộng đồng|studio)\s*[·•]\s*/iu, "")
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
  const isStudio = layout === "studio-create";
  const initial = (label.trim().charAt(0) || "?").toUpperCase();
  const kickerLabel = ORG_CREATE_KICKER[layout];
  const desc = orgCreateCardDescription(layout, description, kicker, label);

  return (
    <div className="j-gallery-org-card">
      <div
        className={[
          "j-gallery-org-card__hero",
          isCongDong ? "is-cong-dong" : isStudio ? "is-studio" : "is-co-so",
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
        <p className="j-gallery-org-card__kicker">{kickerLabel}</p>
        <h3 className="j-gallery-org-card__title">{label}</h3>
        {desc ? <p className="j-gallery-org-card__desc">{desc}</p> : null}
      </div>
    </div>
  );
}

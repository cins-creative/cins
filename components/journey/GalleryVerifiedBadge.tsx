import { BadgeCheck } from "lucide-react";

type Props = {
  className?: string;
};

export function GalleryVerifiedBadge({ className }: Props) {
  return (
    <span
      className={["j-gallery-verified-badge", className].filter(Boolean).join(" ")}
      aria-hidden
    >
      <BadgeCheck size={13} strokeWidth={2.4} />
    </span>
  );
}

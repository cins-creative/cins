import Image from "next/image";

import {
  resolveSchoolAvatarSrc,
  schoolInitials,
  type SchoolAvatarFields,
} from "@/lib/truong/school-avatar";

type Props = {
  school: SchoolAvatarFields & { ten: string };
  /** Xem trước khi chỉnh sửa inline (ảnh bìa / logo). */
  previewUrl?: string | null;
  variant: "card-cover" | "banner-cover";
};

export function TruongOrgBrandMark({
  school,
  previewUrl,
  variant,
}: Props) {
  const src = resolveSchoolAvatarSrc(school, previewUrl);
  const initials = schoolInitials(school.ten);
  const wrapClass =
    variant === "card-cover"
      ? "tdh-card-cover-logo"
      : "cover-overlay-brand";

  if (!src) {
    if (variant !== "banner-cover") return null;
    return (
      <div className={wrapClass} aria-hidden>
        <span className="cover-overlay-brand-initials">{initials}</span>
      </div>
    );
  }

  const isRemote =
    src.includes("imagedelivery.net") || src.startsWith("blob:");

  return (
    <div className={wrapClass} aria-hidden>
      <Image
        src={src}
        alt=""
        width={variant === "card-cover" ? 96 : 200}
        height={variant === "card-cover" ? 96 : 200}
        className={
          variant === "card-cover"
            ? "tdh-card-cover-logo-img"
            : "cover-overlay-brand-img"
        }
        unoptimized={isRemote}
      />
    </div>
  );
}

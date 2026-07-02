"use client";

import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import {
  haOrgKindForPopover,
  haOrgProfileHref,
} from "@/lib/cins/home-adaptive/org-popover-kind";

type Props = {
  orgSlug: string;
  orgName: string;
  orgLoai?: string | null;
  orgAvatarUrl?: string | null;
  wrapClassName: string;
  nameClassName: string;
};

/** Logo + tên tổ chức — bấm mở card preview (JourneyOrgPopover). */
export function HaOrgPopoverChip({
  orgSlug,
  orgName,
  orgLoai,
  orgAvatarUrl,
  wrapClassName,
  nameClassName,
}: Props) {
  const loai = orgLoai?.trim() || "co_so_dao_tao";
  const orgKind = haOrgKindForPopover(loai);
  const profileHref = haOrgProfileHref(loai, orgSlug);

  const chip = (
    <span className={wrapClassName}>
      <span className="ha-trow-org-logo" aria-hidden>
        {orgAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={orgAvatarUrl} alt="" width={18} height={18} loading="lazy" />
        ) : (
          <span className="ha-trow-org-logo-fallback">
            {orgName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className={nameClassName}>{orgName}</span>
    </span>
  );

  if (!orgKind) return chip;

  return (
    <JourneyOrgPopover
      slug={orgSlug}
      orgKind={orgKind}
      href={profileHref}
      fallbackName={orgName}
      fallbackAvatarUrl={orgAvatarUrl ?? null}
    >
      {chip}
    </JourneyOrgPopover>
  );
}

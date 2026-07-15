import Link from "next/link";

import { linhVucHubHref } from "@/lib/cins/worldJourneyGuestAside";
import type { CongDongLinhVuc } from "@/lib/cong-dong/types";

export function CongDongLinhVucRowLink({ item }: { item: CongDongLinhVuc }) {
  return (
    <Link
      href={linhVucHubHref(item.slug)}
      className="cd-v4-category-row"
      prefetch={false}
    >
      <span
        className="cd-v4-category-row-dot"
        style={item.mauAccent ? { background: item.mauAccent } : undefined}
        aria-hidden
      />
      <span className="cd-v4-category-row-title">{item.ten}</span>
      <span className="cd-v4-category-row-meta">Lĩnh vực</span>
    </Link>
  );
}

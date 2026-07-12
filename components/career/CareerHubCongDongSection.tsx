import Link from "next/link";
import { Users } from "lucide-react";

import { getAvatarUrl } from "@/lib/journey/profile";
import type { CongDongOrgCategoryPreview } from "@/lib/cong-dong/categories";

type Props = {
  communities: CongDongOrgCategoryPreview[];
  linhVucLabel: string;
  linhVucSlug?: string | null;
};

function formatMemberCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

export function CareerHubCongDongSection({
  communities,
  linhVucLabel,
  linhVucSlug = null,
}: Props) {
  if (!communities.length) return null;

  const allHref = linhVucSlug
    ? `/cong-dong?linh_vuc=${encodeURIComponent(linhVucSlug)}`
    : "/cong-dong";

  return (
    <section
      className="hn-cong-dong"
      aria-labelledby="hn-cong-dong-title"
    >
      <header className="hn-cong-dong-head">
        <div>
          <h2 className="hn-cong-dong-title" id="hn-cong-dong-title">
            Cộng đồng trong lĩnh vực này
          </h2>
          <p className="hn-cong-dong-desc">
            Nhóm đang hoạt động quanh {linhVucLabel} — trao đổi, chia sẻ và kết
            nối trên CINs.
          </p>
        </div>
        <Link href={allHref} className="hn-cong-dong-all">
          Xem tất cả
        </Link>
      </header>

      <ul className="hn-cong-dong-grid">
        {communities.map((org) => {
          const avatarUrl = getAvatarUrl(org.avatarId);
          return (
            <li key={org.id}>
              <Link
                href={`/cong-dong/${org.slug}`}
                className="hn-cong-dong-card"
              >
                <span className="hn-cong-dong-avatar" aria-hidden>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" />
                  ) : (
                    <span>{org.ten.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="hn-cong-dong-meta">
                  <strong className="hn-cong-dong-name">{org.ten}</strong>
                  <span className="hn-cong-dong-stat">
                    <Users size={13} strokeWidth={2} aria-hidden />
                    {formatMemberCount(org.soThanhVien)} thành viên
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

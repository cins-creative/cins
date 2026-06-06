"use client";

import Link from "next/link";
import { Lock, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { CONG_DONG_CHE_DO } from "@/lib/cong-dong/constants";
import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { CongDongOrg } from "@/lib/cong-dong/types";
import { labelTinhThanh } from "@/lib/truong/contact";

type Props = {
  communities: CongDongOrg[];
};

function formatMemberCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function CongDongListCard({ org }: { org: CongDongOrg }) {
  const coverUrl = getCoverUrl(org.coverId);
  const avatarUrl = getAvatarUrl(org.avatarId);
  const location = labelTinhThanh(org.tinhThanh);
  const isPrivate = org.cheDo === CONG_DONG_CHE_DO.RIENG_TU;

  return (
    <Link href={`/cong-dong/${org.slug}`} className="cd-list-card">
      <div className="cd-list-card-cover">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" />
        ) : null}
      </div>
      <div className="cd-list-card-body">
        <div className="cd-list-card-head">
          <div className="cd-list-card-avatar" aria-hidden>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              <span>{org.ten.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="cd-list-card-meta">
            <h2 className="cd-list-card-title">{org.ten}</h2>
            {location ? <p className="cd-list-card-location">{location}</p> : null}
          </div>
        </div>
        {org.moTa ? <p className="cd-list-card-desc">{org.moTa}</p> : null}
        <div className="cd-list-card-foot">
          <span className="cd-list-card-stat">
            <Users size={14} strokeWidth={2} aria-hidden />
            {formatMemberCount(org.soThanhVien)} thành viên
          </span>
          {isPrivate ? (
            <span className="cd-list-card-badge">
              <Lock size={12} strokeWidth={2} aria-hidden />
              Riêng tư
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function CongDongListingClient({ communities }: Props) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((org) => {
      const haystack = [org.ten, org.moTa ?? "", labelTinhThanh(org.tinhThanh) ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [communities, query]);

  const totalMembers = useMemo(
    () => communities.reduce((n, org) => n + org.soThanhVien, 0),
    [communities],
  );

  return (
    <>
      <header className="cd-list-hero">
        <div className="cd-list-hero-inner">
          <p className="cd-list-kicker">Kết nối nghề</p>
          <h1 className="cd-list-title">Cộng đồng trên CINs</h1>
          <p className="cd-list-lead">
            Thảo luận có ngữ cảnh nghề — từ motion design đến game art và nhiều
            lĩnh vực sáng tạo khác.
          </p>
          <div className="cd-list-stats">
            <span>
              <strong>{communities.length}</strong> cộng đồng
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong>{formatMemberCount(totalMembers)}</strong> thành viên
            </span>
          </div>
          <Link href="/cong-dong/tao" className="cd-list-create-btn">
            <Plus size={18} strokeWidth={2} aria-hidden />
            Tạo cộng đồng
          </Link>
        </div>
      </header>

      <div className="cd-list-toolbar">
        <label className="cd-list-search">
          <Search size={18} strokeWidth={2} aria-hidden />
          <input
            type="search"
            placeholder="Tìm cộng đồng..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm cộng đồng"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="cd-list-empty">
          <p>
            {communities.length === 0
              ? "Chưa có cộng đồng nào. Hãy là người đầu tiên tạo cộng đồng nghề trên CINs."
              : "Không tìm thấy cộng đồng phù hợp."}
          </p>
          {communities.length === 0 ? (
            <Link href="/cong-dong/tao" className="cd-list-create-btn cd-list-create-btn--inline">
              <Plus size={18} strokeWidth={2} aria-hidden />
              Tạo cộng đồng
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="cd-list-grid">
          {visible.map((org) => (
            <CongDongListCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </>
  );
}

"use client";

import {
  AtSign,
  Link2,
  MapPin,
  Pencil,
  Share2,
} from "lucide-react";

import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { JourneyAvatarTrigger } from "@/components/journey/JourneyAvatarTrigger";
import { JourneyCoverTrigger } from "@/components/journey/JourneyCoverTrigger";
import { JourneyProfileGuestSection } from "@/components/journey/JourneyProfileGuestSection";
import { JourneySidebarOwnerActions } from "@/components/journey/JourneySidebarOwnerActions";
import type { GiaiDoan } from "@/lib/auth/session";
import {
  formatTinhThanh,
  getGiaiDoanLabel,
  getNameInitials,
  normalizeSocialLinks,
} from "@/lib/journey/profile";
import type { KetBanStatusSummary } from "@/lib/social/types";

export type SidebarProfile = {
  /** UUID `user_nguoi_dung.id` — dùng cho follow API. */
  id: string;
  tenHienThi: string | null;
  slug: string;
  /** Avatar URL đã resolve ở server (Cloudflare imagedelivery). Null → fallback initials. */
  avatarUrl: string | null;
  /** Cover URL đã resolve ở server. Null → giữ gradient mặc định + blob vàng. */
  coverUrl: string | null;
  bio: string | null;
  tinhThanh: string | null;
  emailLienHe: string | null;
  mxhLinks: unknown;
  aiSummaryJourney: string | null;
  giaiDoan: GiaiDoan | null;
};

export type SidebarStats = {
  cotMoc: number;
  cotMocVerified: number;
  tacPham: number;
  toChuc: number;
};

export type JourneyProfileView =
  | "journey"
  | "gallery"
  | "friends"
  | "organizations";

type Props = {
  profile: SidebarProfile;
  isOwner: boolean;
  /** Nav switch (Journey / Gallery / Bạn bè) — thường bọc Suspense ở page. */
  switchNav: React.ReactNode;
  /**
   * Dữ liệu ban đầu cho modal "Chỉnh sửa hồ sơ" — chỉ truyền khi `isOwner`.
   * Server resolve sẵn các field DB (kể cả những field không hiển thị ở sidebar
   * như `visibility_email`) để client modal không phải fetch lại.
   */
  editProfileInitial?: EditProfileInitial;
  /** Viewer profile id — null nếu không đăng nhập (hiếm trên Journey). */
  viewerProfileId?: string | null;
  /** Trạng thái kết bạn hydrate từ server — tránh fetch client khi mở profile khách. */
  initialKetBanStatus?: KetBanStatusSummary | null;
};

/**
 * Sidebar trái sticky — profile column (mockup v2 §3.1).
 *
 * Cấu trúc theo v2:
 *   1. Profile cover (gradient blue→violet + blob vàng)
 *   2. Avatar tròn 68px chồng lên cover, badge `#NNN` (Journey index)
 *   3. Tên · vai trò · handle `cins.vn/{slug}`
 *   4. Action stack: Nhắn tin (primary) + hàng Theo dõi · Kết bạn · Chia sẻ
 *   5. Info rows (📍 · 💼 · 🔗 · ✉) — bỏ row nào nếu dữ liệu thiếu
 *   6. AI Summary card (blue-soft bg)
 *   7. Stats card (Cột mốc / Tác phẩm / Tổ chức)
 */
export function JourneySidebar({
  profile,
  isOwner,
  switchNav,
  editProfileInitial,
  viewerProfileId = null,
  initialKetBanStatus = null,
}: Props) {
  const { avatarUrl, coverUrl } = profile;
  const initials = getNameInitials(profile.tenHienThi, profile.slug);
  const cityLabel = formatTinhThanh(profile.tinhThanh);
  const socialLinks = normalizeSocialLinks(profile.mxhLinks);

  /* "Vai trò" tạm dùng giai_doan label. Sau này có thể thay bằng vai trò tự nhập. */
  const roleLine = getGiaiDoanLabel(profile.giaiDoan);

  return (
    <aside className="j-sidebar" aria-label="Hồ sơ người dùng">
      {isOwner ? (
        <JourneyCoverTrigger
          coverUrl={coverUrl}
          alt={profile.tenHienThi || profile.slug}
        />
      ) : (
        <div
          className={`j-profile-cover${coverUrl ? " has-img" : ""}`}
          aria-hidden
        >
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverUrl}
              alt=""
              className="j-profile-cover-img"
            />
          ) : (
            <div className="j-profile-cover-blob" />
          )}
        </div>
      )}

      {isOwner ? (
        <JourneyAvatarTrigger
          avatarUrl={avatarUrl}
          initials={initials}
          alt={profile.tenHienThi || profile.slug}
        />
      ) : (
        <div className="j-avatar">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt={profile.tenHienThi || profile.slug} />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>
      )}

      <h1 className="j-profile-name">
        {profile.tenHienThi || `@${profile.slug}`}
      </h1>
      <div className="j-profile-role">{roleLine}</div>
      <div className="j-profile-handle">cins.vn/{profile.slug}</div>

      {!isOwner ? (
        <JourneyProfileGuestSection
          targetUserId={profile.id}
          viewerProfileId={viewerProfileId}
          initialKetBanStatus={initialKetBanStatus}
          chatPeerPreview={{
            name: profile.tenHienThi || profile.slug,
            role: roleLine,
            avatarUrl,
            avatarInitial: initials,
          }}
        />
      ) : editProfileInitial ? (
        <JourneySidebarOwnerActions
          ownerSlug={profile.slug}
          initial={editProfileInitial}
        />
      ) : (
        <div className="j-profile-actions">
          <button type="button" className="j-btn-msg" disabled>
            <Pencil size={14} strokeWidth={1.8} aria-hidden /> Chỉnh sửa hồ sơ
          </button>
          <button
            type="button"
            className="j-btn-icon"
            title="Chia sẻ Journey"
            disabled
            aria-label="Chia sẻ"
          >
            <Share2 size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      )}

      {profile.bio ? (
        <p className="j-profile-bio">{profile.bio}</p>
      ) : null}

      <div className="j-profile-info">
        {cityLabel ? (
          <div className="j-info-row">
            <span className="j-info-ico" aria-hidden>
              <MapPin size={14} strokeWidth={1.7} />
            </span>
            <span>{cityLabel}</span>
          </div>
        ) : null}
        {socialLinks.slice(0, 2).map((link) => (
          <div key={link.url} className="j-info-row">
            <span className="j-info-ico" aria-hidden>
              <Link2 size={14} strokeWidth={1.7} />
            </span>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </div>
        ))}
        {profile.emailLienHe ? (
          <div className="j-info-row">
            <span className="j-info-ico" aria-hidden>
              <AtSign size={14} strokeWidth={1.7} />
            </span>
            <a href={`mailto:${profile.emailLienHe}`}>{profile.emailLienHe}</a>
          </div>
        ) : null}
      </div>

      <div className="j-profile-summary">
        <div className="j-ai-tag">AI Summary</div>
        {profile.aiSummaryJourney ? (
          <p>{profile.aiSummaryJourney}</p>
        ) : (
          <p className="j-profile-summary-empty">
            Chưa có tóm tắt AI. Tóm tắt sẽ tự sinh sau khi bạn ghi vài cột mốc
            đầu tiên trên Journey.
          </p>
        )}
      </div>

      {switchNav}
    </aside>
  );
}

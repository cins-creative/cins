"use client";

import {
  AtSign,
  Link2,
  MapPin,
  Pencil,
} from "lucide-react";

import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { JourneyAvatarTrigger } from "@/components/journey/JourneyAvatarTrigger";
import { AVATAR_DISPLAY_PX } from "@/lib/cloudflare/cf-image-variants";
import { JourneyCoverTrigger } from "@/components/journey/JourneyCoverTrigger";
import { JourneyProfileGuestSection } from "@/components/journey/JourneyProfileGuestSection";
import { JourneyProfileShareTrigger } from "@/components/journey/JourneyProfileShareTrigger";
import { JourneySidebarOwnerActions } from "@/components/journey/JourneySidebarOwnerActions";
import type { JourneyShareProfile } from "@/lib/journey/profile-share";
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

  const shareProfile: JourneyShareProfile = {
    slug: profile.slug,
    displayName: profile.tenHienThi || profile.slug,
    initials,
    avatarUrl,
    coverUrl,
    bio: profile.bio,
    roleLine,
    locationLine: cityLabel,
    emailLine: profile.emailLienHe?.trim() || null,
    socialLine: socialLinks[0]
      ? (() => {
          try {
            const u = new URL(socialLinks[0]!.url);
            const host = u.hostname.replace(/^www\./, "");
            const path = u.pathname.replace(/\/$/, "");
            return path && path !== "/" ? `${host}${path}` : host;
          } catch {
            return socialLinks[0]!.label;
          }
        })()
      : null,
  };

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
            <img
              src={avatarUrl}
              alt={profile.tenHienThi || profile.slug}
              width={AVATAR_DISPLAY_PX}
              height={AVATAR_DISPLAY_PX}
              decoding="async"
            />
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
            slug: profile.slug,
            role: roleLine,
            avatarUrl,
            avatarInitial: initials,
          }}
          shareProfile={shareProfile}
        />
      ) : editProfileInitial ? (
        <JourneySidebarOwnerActions
          ownerSlug={profile.slug}
          initial={editProfileInitial}
          shareProfile={shareProfile}
          viewerProfileId={viewerProfileId}
        />
      ) : (
        <div className="j-profile-actions">
          <button type="button" className="j-btn-msg" disabled>
            <Pencil size={14} strokeWidth={1.8} aria-hidden /> Chỉnh sửa hồ sơ
          </button>
          <JourneyProfileShareTrigger
            shareProfile={shareProfile}
            viewerProfileId={viewerProfileId}
          />
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

      {profile.aiSummaryJourney ? (
        <div className="j-profile-summary">
          <div className="j-ai-tag">AI Summary</div>
          <p>{profile.aiSummaryJourney}</p>
        </div>
      ) : null}

      {switchNav}
    </aside>
  );
}

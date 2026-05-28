import {
  AtSign,
  Grid3X3,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Share2,
  UserRound,
  Waypoints,
} from "lucide-react";
import Link from "next/link";

import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { JourneyAvatarTrigger } from "@/components/journey/JourneyAvatarTrigger";
import { JourneyCoverTrigger } from "@/components/journey/JourneyCoverTrigger";
import { JourneyFollowButton } from "@/components/journey/JourneyFollowButton";
import { JourneySidebarOwnerActions } from "@/components/journey/JourneySidebarOwnerActions";
import type { GiaiDoan } from "@/lib/auth/session";
import {
  formatTinhThanh,
  getGiaiDoanLabel,
  getNameInitials,
  normalizeSocialLinks,
} from "@/lib/journey/profile";

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

export type JourneyProfileView = "journey" | "gallery" | "friends";

type Props = {
  profile: SidebarProfile;
  stats: SidebarStats;
  isOwner: boolean;
  /**
   * Dữ liệu ban đầu cho modal "Chỉnh sửa hồ sơ" — chỉ truyền khi `isOwner`.
   * Server resolve sẵn các field DB (kể cả những field không hiển thị ở sidebar
   * như `visibility_email`) để client modal không phải fetch lại.
   */
  editProfileInitial?: EditProfileInitial;
  /** Viewer profile id — null nếu không đăng nhập (hiếm trên Journey). */
  viewerProfileId?: string | null;
  activeView?: JourneyProfileView;
  friendCount?: number;
};

/**
 * Sidebar trái sticky — profile column (mockup v2 §3.1).
 *
 * Cấu trúc theo v2:
 *   1. Profile cover (gradient blue→violet + blob vàng)
 *   2. Avatar tròn 68px chồng lên cover, badge `#NNN` (Journey index)
 *   3. Tên · vai trò · handle `cins.vn/{slug}`
 *   4. Action row: "Nhắn tin" (primary) + 2 icon buttons
 *   5. Info rows (📍 · 💼 · 🔗 · ✉) — bỏ row nào nếu dữ liệu thiếu
 *   6. AI Summary card (blue-soft bg)
 *   7. Stats card (Cột mốc / Tác phẩm / Tổ chức)
 */
export function JourneySidebar({
  profile,
  stats,
  isOwner,
  editProfileInitial,
  viewerProfileId = null,
  activeView = "journey",
  friendCount = 0,
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
        <div className="j-profile-actions">
          <button type="button" className="j-btn-msg" disabled>
            <Mail size={14} strokeWidth={1.8} aria-hidden /> Nhắn tin
          </button>
          <JourneyFollowButton
            targetUserId={profile.id}
            viewerProfileId={viewerProfileId}
          />
          <button
            type="button"
            className="j-btn-icon"
            title="Chia sẻ"
            disabled
            aria-label="Chia sẻ"
          >
            <Share2 size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
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

      <nav className="j-profile-switch" aria-label="Chuyển giao diện hồ sơ">
        <ProfileSwitchLink
          slug={profile.slug}
          view="journey"
          activeView={activeView}
          icon={<Waypoints size={15} aria-hidden />}
          label="Journey"
          count={stats.cotMoc}
        />
        <ProfileSwitchLink
          slug={profile.slug}
          view="gallery"
          activeView={activeView}
          icon={<Grid3X3 size={15} aria-hidden />}
          label="Gallery"
          count={stats.tacPham}
        />
        <ProfileSwitchLink
          slug={profile.slug}
          view="friends"
          activeView={activeView}
          icon={<UserRound size={15} aria-hidden />}
          label="Bạn bè"
          count={friendCount}
        />
      </nav>
    </aside>
  );
}

function ProfileSwitchLink({
  slug,
  view,
  activeView,
  icon,
  label,
  count,
}: {
  slug: string;
  view: JourneyProfileView;
  activeView: JourneyProfileView;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  const href =
    view === "journey"
      ? `/${encodeURIComponent(slug)}`
      : `/${encodeURIComponent(slug)}?view=${view}`;
  const active = view === activeView;
  return (
    <Link
      href={href}
      className={`j-profile-switch-btn${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="j-profile-switch-ico">{icon}</span>
      <span className="j-profile-switch-main">
        <span>{label}</span>
        <strong>{count}</strong>
      </span>
    </Link>
  );
}

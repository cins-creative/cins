import {
  AtSign,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Share2,
} from "lucide-react";

import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import { JourneyAvatarTrigger } from "@/components/journey/JourneyAvatarTrigger";
import { JourneySidebarOwnerActions } from "@/components/journey/JourneySidebarOwnerActions";
import type { GiaiDoan } from "@/lib/auth/session";
import {
  formatJourneyBadge,
  formatTinhThanh,
  getGiaiDoanLabel,
  getNameInitials,
  normalizeSocialLinks,
} from "@/lib/journey/profile";

export type SidebarProfile = {
  tenHienThi: string | null;
  slug: string;
  /** Avatar URL đã resolve ở server (Cloudflare imagedelivery). Null → fallback initials. */
  avatarUrl: string | null;
  bio: string | null;
  tinhThanh: string | null;
  emailLienHe: string | null;
  mxhLinks: unknown;
  aiSummaryJourney: string | null;
  giaiDoan: GiaiDoan | null;
  /** Index thứ tự Journey (#001…) — chưa wire, để mặc định 1. */
  journeyIndex?: number | null;
};

export type SidebarStats = {
  cotMoc: number;
  cotMocVerified: number;
  tacPham: number;
  toChuc: number;
};

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
}: Props) {
  const { avatarUrl } = profile;
  const initials = getNameInitials(profile.tenHienThi, profile.slug);
  const cityLabel = formatTinhThanh(profile.tinhThanh);
  const socialLinks = normalizeSocialLinks(profile.mxhLinks);
  const journeyBadge = formatJourneyBadge(profile.journeyIndex);

  /* "Vai trò" tạm dùng giai_doan label. Sau này có thể thay bằng vai trò tự nhập. */
  const roleLine = getGiaiDoanLabel(profile.giaiDoan);

  return (
    <aside className="j-sidebar" aria-label="Hồ sơ người dùng">
      <div className="j-profile-cover" aria-hidden>
        <div className="j-profile-cover-blob" />
      </div>

      {isOwner ? (
        <JourneyAvatarTrigger
          avatarUrl={avatarUrl}
          initials={initials}
          alt={profile.tenHienThi || profile.slug}
          badge={journeyBadge}
        />
      ) : (
        <div className="j-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile.tenHienThi || profile.slug} />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
          <span className="j-avatar-badge" aria-label={`Journey ${journeyBadge}`}>
            {journeyBadge}
          </span>
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
          <button
            type="button"
            className="j-btn-icon"
            title="Theo dõi"
            disabled
            aria-label="Theo dõi"
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
          </button>
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

      <div className="j-profile-stats" aria-label="Thống kê hồ sơ">
        <div className="j-stat">
          <div className="j-stat-num">
            {stats.cotMoc}
            {stats.cotMocVerified > 0 ? (
              <span className="j-stat-v">{stats.cotMocVerified}✓</span>
            ) : null}
          </div>
          <div className="j-stat-label">Cột mốc</div>
        </div>
        <div className="j-stat">
          <div className="j-stat-num">{stats.tacPham}</div>
          <div className="j-stat-label">Tác phẩm</div>
        </div>
        <div className="j-stat">
          <div className="j-stat-num">{stats.toChuc}</div>
          <div className="j-stat-label">Tổ chức</div>
        </div>
      </div>
    </aside>
  );
}

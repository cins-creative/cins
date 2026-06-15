"use client";

import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Briefcase,
  Calendar,
  FileText,
  FolderKanban,
  Globe,
  Heart,
  Link2,
  Lock,
  MessageCircle,
  Star,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import {
  articleTagLoaiClass,
} from "@/lib/editor/article-tag";
import type {
  MilestonePostAuthor,
  MilestonePostContributor,
  MilestonePostContent,
} from "@/lib/journey/milestone-post-types";
import {
  mapCheDoToMilestoneVisibility,
  mapLoaiMocToMilestoneType,
} from "@/lib/journey/milestone-ui-map";
import { getAvatarUrl } from "@/lib/journey/profile";

const TYPE_LABEL: Record<string, string> = {
  hoc: "Học",
  lam_viec: "Làm việc",
  du_an: "Dự án",
  su_kien: "Sự kiện",
  thanh_tuu: "Thành tựu",
  ca_nhan: "Cá nhân",
};

const VIS_LABEL: Record<string, { Icon: LucideIcon; text: string }> = {
  feature: { Icon: Star, text: "Nổi bật" },
  public: { Icon: Globe, text: "Công khai" },
  theo_nhom: { Icon: Users, text: "Theo nhóm" },
  chi_minh: { Icon: Lock, text: "Chỉ mình tôi" },
  cong_dong: { Icon: Users, text: "Cộng đồng" },
};

const TYPE_ICON: Record<string, LucideIcon> = {
  hoc: BookOpen,
  lam_viec: Briefcase,
  du_an: FolderKanban,
  su_kien: Calendar,
  thanh_tuu: Trophy,
  ca_nhan: UserCircle2,
};

type Props = {
  owner: MilestonePostAuthor;
  milestone: {
    id: string;
    thoiDiem: string;
    loaiMoc: string;
    cheDoHienThi: string;
  };
  mainPost?: MilestonePostContent;
  postSlug?: string | null;
  isOwner: boolean;
  social: {
    likeCount: number;
    bookmarkCount: number;
  };
  commentCount: number;
  actionsRail: ReactNode;
  onMilestoneUpdated?: () => void;
  hidden?: boolean;
};

export function PostMetaRail({
  owner,
  milestone,
  mainPost,
  postSlug,
  isOwner,
  social,
  commentCount,
  actionsRail,
  onMilestoneUpdated,
  hidden,
}: Props) {
  const typeLabel = TYPE_LABEL[milestone.loaiMoc] ?? "Cột mốc";
  const TypeIcon = TYPE_ICON[milestone.loaiMoc] ?? UserCircle2;
  const vis = VIS_LABEL[milestone.cheDoHienThi] ?? VIS_LABEL.public;
  const dateLabel = formatVnDate(milestone.thoiDiem);
  const ownerInitial = (owner.tenHienThi || owner.slug).charAt(0).toUpperCase();
  const ownerAvatarUrl = getAvatarUrl(owner.avatarId);
  const firstTag = mainPost?.articleTags[0] ?? null;
  const roleLabel = firstTag?.tieu_de ?? typeLabel;
  const RoleIcon = firstTag ? FileText : TypeIcon;
  const permalinkPath =
    postSlug && owner.slug ? `/${owner.slug}/p/${postSlug}` : null;
  const people = buildRailPeople(owner, mainPost?.contributors ?? []);
  const articleTags = mainPost?.articleTags ?? [];

  const authorBody = (
    <>
      <span className="post-rail-avatar" aria-hidden>
        {ownerAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={ownerAvatarUrl} alt="" />
        ) : (
          ownerInitial
        )}
      </span>
      <span className="post-rail-author-copy">
        <strong>{owner.tenHienThi}</strong>
        <span className="post-rail-handle">@{owner.slug}</span>
        <span className="post-rail-role-chip">
          <RoleIcon size={12} strokeWidth={2} aria-hidden />
          {roleLabel}
        </span>
      </span>
    </>
  );

  return (
    <aside
      className="post-view-rail"
      aria-label="Thông tin bài viết"
      aria-hidden={hidden ? true : undefined}
      hidden={hidden}
    >
      <div className="post-rail-blk post-rail-blk--author">
        <div className="post-rail-author">
          <JourneyUserPopover
            slug={owner.slug}
            fallbackName={owner.tenHienThi}
            fallbackAvatarUrl={ownerAvatarUrl}
          >
            <Link
              href={`/${owner.slug}`}
              className="post-rail-author-link"
              prefetch={false}
            >
              {authorBody}
            </Link>
          </JourneyUserPopover>
          {isOwner ? (
            <JourneyMilestoneOwnerMenu
              className="post-rail-menu"
              milestoneId={milestone.id}
              ownerSlug={owner.slug}
              currentType={mapLoaiMocToMilestoneType(milestone.loaiMoc)}
              currentVisibility={mapCheDoToMilestoneVisibility(
                milestone.cheDoHienThi,
              )}
              postSlug={postSlug ?? null}
              onAfterChange={onMilestoneUpdated}
            />
          ) : null}
        </div>
        <Link href={`/${owner.slug}`} className="post-rail-profile-link" prefetch={false}>
          Xem hồ sơ Journey
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </Link>
      </div>

      <div className="post-rail-div" role="presentation" />

      <div className="post-rail-blk">
        <div className="post-rail-lbl">Bài viết</div>
        <div className="post-rail-fact">
          <TypeIcon size={15} strokeWidth={1.9} aria-hidden />
          <span>
            Loại cột mốc · <strong>{typeLabel}</strong>
          </span>
        </div>
        <div className="post-rail-fact">
          <vis.Icon size={15} strokeWidth={1.9} aria-hidden />
          <span>{vis.text}</span>
        </div>
        <div className="post-rail-fact">
          <Calendar size={15} strokeWidth={1.9} aria-hidden />
          <time className="post-rail-date" dateTime={milestone.thoiDiem}>
            {dateLabel}
          </time>
        </div>
        {permalinkPath ? (
          <div className="post-rail-fact post-rail-fact--permalink">
            <Link2 size={15} strokeWidth={1.9} aria-hidden />
            <Link href={permalinkPath} className="post-rail-permalink" prefetch={false}>
              {permalinkPath}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="post-rail-div" role="presentation" />

      <div className="post-rail-blk">
        <div className="post-rail-lbl">Thống kê</div>
        <div className="post-rail-stats" aria-label="Thống kê tương tác">
          <div className="post-rail-stat">
            <Heart size={15} strokeWidth={1.9} aria-hidden />
            <span className="post-rail-stat-num">{social.likeCount}</span>
            <span className="post-rail-stat-lbl">Thích</span>
          </div>
          <div className="post-rail-stat">
            <Bookmark size={15} strokeWidth={1.9} aria-hidden />
            <span className="post-rail-stat-num">{social.bookmarkCount}</span>
            <span className="post-rail-stat-lbl">Lưu</span>
          </div>
          <div className="post-rail-stat">
            <MessageCircle size={15} strokeWidth={1.9} aria-hidden />
            <span className="post-rail-stat-num">{commentCount}</span>
            <span className="post-rail-stat-lbl">Bình luận</span>
          </div>
        </div>
      </div>

      <div className="post-rail-div" role="presentation" />

      <div className="post-rail-blk post-rail-blk--actions">{actionsRail}</div>

      <div className="post-rail-div" role="presentation" />

      <div className="post-rail-blk">
        <div className="post-rail-lbl">Thẻ bài viết</div>
        {articleTags.length > 0 ? (
          <div className="post-rail-tags">
            {articleTags.map((t) => (
              <JourneyArticleTagLink
                key={t.id}
                tag={t}
                className={`post-rail-tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
              />
            ))}
          </div>
        ) : (
          <p className="post-rail-empty">Chưa gắn thẻ bài viết</p>
        )}
      </div>

      <div className="post-rail-div" role="presentation" />

      <div className="post-rail-blk">
        <div className="post-rail-lbl">Người đóng góp · {people.length}</div>
        <div className="post-rail-people">
          {people.map((c) => {
            const avatarUrl = getAvatarUrl(c.avatarId);
            const initial = (c.tenHienThi || c.slug || "?")
              .charAt(0)
              .toUpperCase();
            const body = (
              <>
                <span
                  className={`post-rail-person-avatar${c.laChuSoHuu ? "" : " post-rail-person-avatar--sq"}`}
                  aria-hidden
                >
                  {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarUrl} alt="" />
                  ) : (
                    initial
                  )}
                </span>
                <span className="post-rail-person-copy">
                  <strong>
                    {c.tenHienThi}
                    {c.laChuSoHuu ? (
                      <span className="post-rail-owner-tag">Chủ</span>
                    ) : null}
                  </strong>
                  <span>{c.vaiTro || (c.laChuSoHuu ? "Chủ bài viết" : "Cộng sự")}</span>
                </span>
              </>
            );
            return (
              <JourneyUserPopover
                key={c.id}
                slug={c.slug}
                fallbackName={c.tenHienThi}
                fallbackAvatarUrl={avatarUrl}
              >
                <span className="post-rail-person">{body}</span>
              </JourneyUserPopover>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function buildRailPeople(
  owner: MilestonePostAuthor,
  contributors: ReadonlyArray<MilestonePostContributor>,
): MilestonePostContributor[] {
  if (contributors.length === 0) {
    return [
      {
        id: owner.id,
        slug: owner.slug,
        tenHienThi: owner.tenHienThi,
        avatarId: owner.avatarId,
        vaiTro: null,
        laChuSoHuu: true,
      },
    ];
  }
  if (contributors.length === 1 && contributors[0]?.laChuSoHuu) {
    return [...contributors];
  }
  return [...contributors];
}

function formatVnDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

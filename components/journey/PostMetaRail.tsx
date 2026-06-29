"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  FolderKanban,
  Globe,
  Lock,
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
  theo_nhom: { Icon: Users, text: "Bạn bè" },
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
  actionsRail: ReactNode;
  /** Caption album/video — dưới meta author trên rail. */
  contentRail?: ReactNode;
  /** Tiêu đề + mô tả ngắn — split bài viết, trong block author. */
  heroRail?: ReactNode;
  /** Ảnh bìa — ngay sau mô tả ngắn trên rail split. */
  coverRail?: ReactNode;
  commentsRail?: ReactNode;
  onMilestoneUpdated?: () => void;
};

export function PostMetaRail({
  owner,
  milestone,
  mainPost,
  postSlug,
  isOwner,
  actionsRail,
  contentRail,
  heroRail,
  coverRail,
  commentsRail,
  onMilestoneUpdated,
}: Props) {
  const typeLabel = TYPE_LABEL[milestone.loaiMoc] ?? "Cột mốc";
  const TypeIcon = TYPE_ICON[milestone.loaiMoc] ?? UserCircle2;
  const vis = VIS_LABEL[milestone.cheDoHienThi] ?? VIS_LABEL.public;
  const dateLabel = formatVnDate(milestone.thoiDiem);
  const ownerInitial = (owner.tenHienThi || owner.slug).charAt(0).toUpperCase();
  const ownerAvatarUrl = getAvatarUrl(owner.avatarId);
  const people = buildRailPeople(mainPost?.contributors ?? []);
  const articleTags = mainPost?.articleTags ?? [];
  const verifyTags = articleTags.filter((t) => t.da_verify === true);
  const attachTags = articleTags.filter((t) => t.da_verify !== true);

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
        <span className="post-rail-author-top">
          <strong>{owner.tenHienThi}</strong>
          <time className="post-rail-date" dateTime={milestone.thoiDiem}>
            {dateLabel}
          </time>
        </span>
      </span>
    </>
  );

  return (
    <aside
      className="post-view-rail"
      aria-label="Thông tin bài viết"
    >
      <div className="post-rail-scroll">
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
        <div className="post-rail-meta-chips" aria-label="Thông tin bài viết">
          <span className="post-rail-chip">
            <TypeIcon size={12} strokeWidth={2} aria-hidden />
            {typeLabel}
          </span>
          <span className="post-rail-chip">
            <vis.Icon size={12} strokeWidth={2} aria-hidden />
            {vis.text}
          </span>
        </div>
        {heroRail ? <div className="post-rail-hero">{heroRail}</div> : null}
        {coverRail ? <div className="post-rail-cover">{coverRail}</div> : null}
        {contentRail ? (
          <div className="post-rail-body">{contentRail}</div>
        ) : null}
      </div>

      <div className="post-rail-blk post-rail-blk--actions">{actionsRail}</div>

      {verifyTags.length > 0 ? (
        <div className="post-rail-blk post-rail-blk--tags post-rail-blk--verify">
          <div className="post-rail-lbl">Xác thực</div>
          <div className="post-rail-tags">
            {verifyTags.map((t) => (
              <JourneyArticleTagLink
                key={t.id}
                tag={t}
                className={`post-rail-tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
                label={`Được xác thực bởi ${t.tieu_de}`}
                verified
              />
            ))}
          </div>
        </div>
      ) : null}

      {attachTags.length > 0 ? (
        <div className="post-rail-blk post-rail-blk--tags">
          <div className="post-rail-lbl">Thẻ</div>
          <div className="post-rail-tags">
            {attachTags.map((t) => (
              <JourneyArticleTagLink
                key={t.id}
                tag={t}
                className={`post-rail-tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {people.length > 0 ? (
        <div className="post-rail-blk post-rail-blk--people">
          <div className="post-rail-lbl">
            Đóng góp · {people.length.toLocaleString("vi-VN")}
          </div>
          <div className="post-rail-people">
            {people.map((c) => {
              const avatarUrl = getAvatarUrl(c.avatarId);
              const initial = (c.tenHienThi || c.slug || "?")
                .charAt(0)
                .toUpperCase();
              const body = (
                <>
                  <span
                    className="post-rail-person-avatar"
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
      ) : null}

      {commentsRail ? (
        <div className="post-rail-blk post-rail-blk--comments">{commentsRail}</div>
      ) : null}
      </div>
    </aside>
  );
}

function buildRailPeople(
  contributors: ReadonlyArray<MilestonePostContributor>,
): MilestonePostContributor[] {
  if (contributors.length === 0) return [];
  if (contributors.length === 1 && contributors[0]?.laChuSoHuu) return [];
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

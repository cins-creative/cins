"use client";

import {
  BadgeCheck,
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
  X,
  type LucideIcon,
} from "lucide-react";
import { useContext, type ReactNode } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { PostOverlayCloseContext } from "@/components/journey/post-overlay-close";
import { ShopKioskBlock } from "@/components/shop/ShopKioskBlock";
import type {
  MilestonePostAuthor,
  MilestonePostContributor,
  MilestonePostContent,
  MilestonePostVerifier,
} from "@/lib/journey/milestone-post-types";
import {
  mapCheDoToMilestoneVisibility,
  mapLoaiMocToMilestoneType,
} from "@/lib/journey/milestone-ui-map";
import { formatDate, formatNumber } from "@/lib/format";
import { useT } from "@/lib/i18n/use-t";
import type { MessageKey } from "@/lib/i18n/messages";
import { getAvatarUrl } from "@/lib/journey/profile";
import { useLocale } from "@/lib/locale/context";

const TYPE_MSG: Record<string, MessageKey> = {
  hoc: "meta.type.hoc",
  lam_viec: "meta.type.lam_viec",
  du_an: "meta.type.du_an",
  su_kien: "meta.type.su_kien",
  thanh_tuu: "meta.type.thanh_tuu",
  ca_nhan: "meta.type.ca_nhan",
};

const VIS_MSG: Record<string, { Icon: LucideIcon; key: MessageKey }> = {
  feature: { Icon: Star, key: "meta.vis.feature" },
  public: { Icon: Globe, key: "meta.vis.public" },
  theo_nhom: { Icon: Users, key: "meta.vis.theo_nhom" },
  chi_minh: { Icon: Lock, key: "meta.vis.chi_minh" },
  cong_dong: { Icon: Users, key: "meta.vis.cong_dong" },
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
    /** Org xác thực — `✓ Tên` (timeline `verifiedBy`). */
    verifiedBy?: string | null;
    verifier?: MilestonePostVerifier | null;
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
  const t = useT();
  const locale = useLocale();
  const { viewerProfileId } = useCinsChat();
  const onClose = useContext(PostOverlayCloseContext);
  const typeKey = TYPE_MSG[milestone.loaiMoc];
  const typeLabel = typeKey ? t(typeKey) : t("meta.milestone");
  const TypeIcon = TYPE_ICON[milestone.loaiMoc] ?? UserCircle2;
  const visSpec = VIS_MSG[milestone.cheDoHienThi] ?? VIS_MSG.public;
  const vis = { Icon: visSpec.Icon, text: t(visSpec.key) };
  const dateLabel = formatDate(milestone.thoiDiem, locale);
  const ownerInitial = (owner.tenHienThi || owner.slug).charAt(0).toUpperCase();
  const ownerAvatarUrl = getAvatarUrl(owner.avatarId);
  const people = buildRailPeople(mainPost?.contributors ?? []);
  const articleTags = mainPost?.articleTags ?? [];
  const attachTags = articleTags;
  const verifiedBy = milestone.verifiedBy?.trim() || null;
  const verifier = resolveVerifierDisplay(milestone.verifier, verifiedBy);
  const isVerified = Boolean(verifier);

  const authorHit = (
    <span className="post-rail-author-link">
      <span className="post-rail-avatar" aria-hidden>
        {ownerAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={ownerAvatarUrl} alt="" />
        ) : (
          ownerInitial
        )}
      </span>
      <strong>{owner.tenHienThi}</strong>
    </span>
  );

  const authorMeta = (
    <span className="post-rail-author-sub">
      <time className="post-rail-date" dateTime={milestone.thoiDiem}>
        {dateLabel}
      </time>
      <span
        className="post-rail-meta-icons"
        aria-label={`${typeLabel} · ${vis.text}`}
      >
        <span className="post-rail-meta-ico" title={typeLabel}>
          <TypeIcon size={12} strokeWidth={2} aria-hidden />
          <span className="post-rail-meta-ico-label">{typeLabel}</span>
        </span>
        <span className="post-rail-meta-ico" title={vis.text}>
          <vis.Icon size={12} strokeWidth={2} aria-hidden />
          <span className="post-rail-meta-ico-label">{vis.text}</span>
        </span>
      </span>
    </span>
  );

  return (
    <aside
      className={
        "post-view-rail" + (isVerified ? " post-view-rail--verified" : "")
      }
      aria-label="Thông tin bài viết"
    >
      <div className="post-rail-scroll">
        <div
          className={
            "post-rail-blk post-rail-blk--author" +
            (isVerified ? " is-verified" : "")
          }
        >
        <div className="post-rail-author">
          <div className="post-rail-author-main">
            <JourneyUserPopover
              slug={owner.slug}
              fallbackName={owner.tenHienThi}
              fallbackAvatarUrl={ownerAvatarUrl}
              track={{ idBoiCanh: milestone.id }}
            >
              {/* Chỉ avatar + tên mở card — vùng trống không focus/scroll đầu bài. */}
              {authorHit}
            </JourneyUserPopover>
            {authorMeta}
          </div>
          {isOwner || onClose ? (
            <div className="post-rail-author-tools">
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
              {onClose ? (
                <button
                  type="button"
                  className="post-rail-close"
                  aria-label="Đóng"
                  onClick={onClose}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="post-rail-meta-row">
          {verifier ? <PostRailVerifierCallout verifier={verifier} /> : null}
        </div>
        {heroRail ? <div className="post-rail-hero">{heroRail}</div> : null}
        {coverRail ? <div className="post-rail-cover">{coverRail}</div> : null}
        {contentRail ? (
          <div className="post-rail-body">{contentRail}</div>
        ) : null}
      </div>

      {attachTags.length > 0 ? (
        <div className="post-rail-blk post-rail-blk--tags">
          <div
            className="tags jcard-tags post-rail-tags"
            aria-label="Bài viết liên quan"
          >
            {attachTags.map((t) => (
              <JourneyArticleTagLink key={t.id} tag={t} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="post-rail-blk post-rail-blk--shop">
        <ShopKioskBlock
          milestoneId={milestone.id}
          sellerUserId={owner.id}
          viewerProfileId={viewerProfileId}
          sellerName={owner.tenHienThi}
          sellerAvatarUrl={ownerAvatarUrl}
          sellerSlug={owner.slug}
        />
      </div>

      {people.length > 0 ? (
        <div className="post-rail-blk post-rail-blk--people">
          <div className="post-rail-lbl">
            {t("meta.contributors", {
              count: formatNumber(people.length, locale),
            })}
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

      <div className="post-rail-blk post-rail-blk--actions">
        {actionsRail}
      </div>

      {commentsRail ? (
        <div className="post-rail-blk post-rail-blk--comments">
          {commentsRail}
        </div>
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

function resolveVerifierDisplay(
  verifier: MilestonePostVerifier | null | undefined,
  verifiedBy: string | null,
): MilestonePostVerifier | null {
  if (verifier?.name?.trim()) return verifier;
  if (!verifiedBy) return null;
  const name = verifiedBy.replace(/^✓\s*/, "").trim();
  if (!name) return null;
  return {
    name,
    slug: null,
    avatarUrl: null,
    href: null,
    role: "Xác nhận bởi tổ chức",
    orgKind: null,
  };
}

function PostRailVerifierCallout({
  verifier,
}: {
  verifier: MilestonePostVerifier;
}) {
  const initial = (verifier.name.charAt(0) || "?").toUpperCase();
  const orgCluster = (
    <span className="post-rail-verifier-org">
      <span className="post-rail-verifier-avatar" aria-hidden>
        {verifier.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={verifier.avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      <span className="post-rail-verifier-org-copy">
        <strong>{verifier.name}</strong>
      </span>
    </span>
  );

  const orgKind = verifier.orgKind;
  const canPopover = Boolean(verifier.slug?.trim() && orgKind);

  return (
    <div
      className="post-rail-verifier"
      role="status"
      aria-label={`Đã xác thực bởi ${verifier.name}`}
    >
      <div className="post-rail-verifier-head">
        <span className="post-rail-verifier-icon" aria-hidden>
          <BadgeCheck size={12} strokeWidth={2.4} />
        </span>
        <span className="post-rail-verifier-lead">Xác thực bởi</span>
      </div>
      {canPopover && orgKind ? (
        <JourneyOrgPopover
          slug={verifier.slug}
          orgKind={orgKind}
          href={verifier.href}
          fallbackName={verifier.name}
          fallbackAvatarUrl={verifier.avatarUrl}
        >
          {orgCluster}
        </JourneyOrgPopover>
      ) : verifier.href ? (
        <a
          href={verifier.href}
          className="post-rail-verifier-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {orgCluster}
        </a>
      ) : (
        orgCluster
      )}
    </div>
  );
}


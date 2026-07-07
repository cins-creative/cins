import Image from "next/image";
import { BadgeCheck } from "lucide-react";

import { EntityLightTimeline } from "@/components/tag/EntityLightTimeline";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getAvatarUrl, getNameInitials } from "@/lib/journey/profile";
import { decodeEntityTomTat } from "@/lib/tag/decode-tom-tat";
import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import {
  fetchEntityMilestones,
  fetchEntityTaggedUsers,
} from "@/lib/tag/entity-milestones-fetch";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

import "./entity-page.css";
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

type EntityLoai = "keyword" | "phan_mem" | "mon_hoc";

type ArticleHeader = {
  id: string;
  slug: string;
  tieu_de: string;
  tom_tat?: string | null;
  thumbnail?: string | null;
  da_verify?: boolean | null;
  loai_bai_viet: EntityLoai;
};

type Props = {
  article: ArticleHeader;
  sort: TagAggSort;
};

function loaiLabel(loai: EntityLoai): string {
  if (loai === "phan_mem") return "Phần mềm";
  if (loai === "mon_hoc") return "Môn học";
  return "Khái niệm";
}

function loaiBadgeClass(loai: EntityLoai): string {
  if (loai === "phan_mem") return "is-phan-mem";
  if (loai === "mon_hoc") return "is-mon-hoc";
  return "is-keyword";
}

const FACEPILE_MAX = 4;

export async function EntityLightView({ article, sort }: Props) {
  const session = await getCurrentSessionAndProfile();
  const viewerProfileId = session?.profile?.id ?? null;

  const [users, milestones] = await Promise.all([
    fetchEntityTaggedUsers(article.id),
    fetchEntityMilestones(article.id, sort, viewerProfileId),
  ]);

  const thumbUrl = resolveArticleThumbnailOnlySync(article.thumbnail);

  const summary = decodeEntityTomTat(article.tom_tat);
  const verified = article.da_verify === true;
  const pile = users.slice(0, FACEPILE_MAX);

  return (
    <article className="entity-light-page">
      <header className="entity-light-header">
        <div className="entity-light-header-inner">
          <div className="entity-light-hero">
            <div className="entity-light-hero-main">
              <span className={`entity-light-badge ${loaiBadgeClass(article.loai_bai_viet)}`}>
                {loaiLabel(article.loai_bai_viet)}
              </span>
              <div className="entity-light-title-row">
                <h1 className="entity-light-title">{article.tieu_de}</h1>
                {verified ? (
                  <span className="entity-light-verified">
                    <BadgeCheck size={16} strokeWidth={2.2} aria-hidden />
                    Verified
                  </span>
                ) : null}
              </div>
              {summary ? <p className="entity-light-desc">{summary}</p> : null}
              {users.length > 0 ? (
                <div className="entity-light-users">
                  <div className="entity-light-pile" aria-hidden>
                    {pile.map((u) => {
                      const avatarUrl = getAvatarUrl(u.avatarId);
                      return avatarUrl ? (
                        <Image
                          key={u.id}
                          src={avatarUrl}
                          alt=""
                          width={30}
                          height={30}
                          className="entity-light-pile-avatar"
                          unoptimized
                        />
                      ) : (
                        <span
                          key={u.id}
                          className="entity-light-pile-avatar entity-light-pile-fallback"
                        >
                          {getNameInitials(u.tenHienThi, u.slug)}
                        </span>
                      );
                    })}
                  </div>
                  <p className="entity-light-users-meta">
                    <strong>{users.length} người</strong> dùng tag này
                  </p>
                </div>
              ) : null}
            </div>
            {thumbUrl ? (
              <div className="entity-light-thumb">
                <Image
                  src={thumbUrl}
                  alt=""
                  fill
                  className="entity-light-thumb-img"
                  sizes="(max-width: 640px) 100vw, 360px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="entity-light-thumb is-placeholder">
                <span>Chưa có thumbnail minh họa cho {article.tieu_de}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="entity-light-body">
        <EntityLightTimeline
          milestones={milestones}
          sort={sort}
          viewerProfileId={viewerProfileId}
        />
      </div>
    </article>
  );
}

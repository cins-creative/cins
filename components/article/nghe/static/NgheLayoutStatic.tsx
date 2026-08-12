import type { ReactNode } from "react";

import type { ArticleCard } from "@/lib/articles/types";
import type { NgheRolePerson } from "@/lib/articles/nghe-role-people-types";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import { EntityArticleLayout } from "@/components/article/entity/EntityArticleLayout";
import { EntityRelatedSection } from "@/components/article/entity/EntityRelatedSection";
import { NgheEntityHeader } from "@/components/article/nghe/NgheEntityHeader";
import { NgheRolePeopleSection } from "@/components/article/nghe/NgheRolePeopleSection";
import { NgheTaggedWorksSection } from "@/components/article/nghe/NgheTaggedWorksSection";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  NGHE_COURSE_CARDS,
  NGHE_JOB_CARDS,
  NGHE_LEAD_BODY_HTML,
  NGHE_LEAD_HTML,
  NGHE_SW_TILES,
} from "@/components/article/nghe/static/nghe-static-data";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";
import {
  NgheRelCard,
  NgheRelTile,
} from "@/components/article/nghe/NgheRelParts";
import {
  StaticRelCard,
  StaticRelTile,
} from "@/components/article/nghe/static/NgheStaticParts";
import { NgheLeadRich } from "@/components/article/nghe/NgheLeadRich";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";

type NgheLayoutStaticProps = {
  leadSource?: string | null;
  lienQuan?: ArticleCard[];
  heroTitle?: string | null;
  heroEmLine?: string | null;
  heroSummary?: string | null;
  heroLinhVucLabel?: string | null;
  leadVideoUrl?: string | null;
  heroThumbnailUrl?: string | null;
  heroDraftTools?: ReactNode;
  heroAttribution?: ReactNode;
  heroBlock?: ReactNode;
  leadBlock?: ReactNode;
  entityTaggedUsers?: TagAggUser[];
  entityMilestones?: ReadonlyArray<MilestoneItem>;
  entitySort?: TagAggSort;
  viewerProfileId?: string | null;
  rolePeople?: ReadonlyArray<NgheRolePerson>;
  contribution?: ReactNode;
  canonicalEmpty?: boolean;
  isLoggedIn?: boolean;
  loginNext?: string;
};

/** Khung trang nghề — header cố định + tab nội dung/thảo luận. */
export function NgheLayoutStatic({
  leadSource,
  lienQuan = [],
  heroTitle,
  heroEmLine,
  heroSummary,
  heroLinhVucLabel,
  leadVideoUrl,
  heroThumbnailUrl,
  heroDraftTools,
  heroAttribution,
  heroBlock,
  leadBlock,
  entityTaggedUsers = [],
  entityMilestones = [],
  entitySort = "moi_nhat",
  viewerProfileId = null,
  rolePeople = [],
  contribution,
  canonicalEmpty = false,
  isLoggedIn = false,
  loginNext = "",
}: NgheLayoutStaticProps = {}) {
  const leadTrim = leadSource?.trim() ?? "";
  const leadVid = leadVideoUrl?.trim() ?? "";
  const ngheLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "nghe",
  );
  const useDbJobCards = ngheLienQuan.length > 0;
  const phanMemLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "phan_mem",
  );
  const useDbSwTiles = phanMemLienQuan.length > 0;
  const monHocLienQuan = lienQuan.filter(
    (c) => String(c.loai_bai_viet) === "mon_hoc",
  );
  const useDbCourseCards = monHocLienQuan.length > 0;

  const leadPanel =
    leadBlock ??
    (
      <div className="nghe-lead-panel entity-lead-panel" data-rich-lead-slot="true">
        {leadVid ? <NgheLeadVideo url={leadVid} /> : null}
        {leadTrim ? (
          <NgheLeadRich html={leadTrim} />
        ) : (
          <div
            className="nghe-lead-rich article-rich-content article-content-html"
            dangerouslySetInnerHTML={{
              __html: imagedeliveryPreferPublicInHtml(
                leadVid ? NGHE_LEAD_BODY_HTML : NGHE_LEAD_HTML,
              ),
            }}
          />
        )}
      </div>
    );

  const peopleBelowHero =
    rolePeople.length > 0 ? (
      <NgheRolePeopleSection people={rolePeople} />
    ) : null;

  const header =
    heroBlock ??
    (
      <NgheEntityHeader
        title={heroTitle}
        emLine={heroEmLine}
        summary={heroSummary}
        linhVucLabel={heroLinhVucLabel}
        thumbnailUrl={heroThumbnailUrl}
        draftTools={heroDraftTools}
        attribution={heroAttribution}
        belowInner={peopleBelowHero}
      />
    );

  const contentExtra = (
    <>
      <EntityRelatedSection num="03" title="Vị trí công việc liên quan" id="nghe-sec-jobs">
        <div className="job-grid ent-card-grid">
          {useDbJobCards
            ? ngheLienQuan.map((card, i) => (
                <NgheRelCard
                  key={card.id}
                  card={card}
                  tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
                />
              ))
            : NGHE_JOB_CARDS.map((card) => (
                <StaticRelCard key={card.name} item={card} />
              ))}
        </div>
      </EntityRelatedSection>

      <EntityRelatedSection num="04" title="Phần mềm sử dụng" id="nghe-sec-software">
        <div className="sw-row ent-tile-row">
          {useDbSwTiles
            ? phanMemLienQuan.map((card, i) => (
                <NgheRelTile
                  key={card.id}
                  card={card}
                  tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
                />
              ))
            : NGHE_SW_TILES.map((tile) => (
                <StaticRelTile key={tile.name} item={tile} />
              ))}
        </div>
      </EntityRelatedSection>

      <EntityRelatedSection num="05" title="Các khóa học liên quan" id="nghe-sec-courses">
        <div className="job-grid ent-card-grid">
          {useDbCourseCards
            ? monHocLienQuan.map((card, i) => (
                <NgheRelCard
                  key={card.id}
                  card={card}
                  tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
                />
              ))
            : NGHE_COURSE_CARDS.map((card) => (
                <StaticRelCard key={card.name} item={card} />
              ))}
        </div>
      </EntityRelatedSection>
    </>
  );

  return (
    <EntityArticleLayout
      pageClassName="ent-page--nghe"
      header={header}
      content={leadPanel}
      contentExtra={contentExtra}
      contribution={contribution}
      canonicalEmpty={canonicalEmpty}
      entityKindLabel="Nghề"
      isLoggedIn={isLoggedIn}
      loginNext={loginNext}
      discussion={
        <NgheTaggedWorksSection
          users={entityTaggedUsers}
          milestones={entityMilestones}
          sort={entitySort}
          viewerProfileId={viewerProfileId}
          showSectionHeading={false}
        />
      }
    />
  );
}

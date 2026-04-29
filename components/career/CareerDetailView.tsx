import type {
  KyNangRow,
  LinhVucRow,
  NgheNghiepRow,
  RelatedCareerCard,
  SkillDetail,
} from "@/lib/career/types";

import { CareerHero } from "./CareerHero";
import { CareerLaAi } from "./CareerLaAi";
import { KeywordPanel } from "./KeywordPanel";
import { RelatedCareers } from "./RelatedCareers";
import { RoadmapSection } from "./RoadmapSection";
import { SkillSection } from "./SkillSection";
import { VideoEmbed } from "./VideoEmbed";
import { WorkSection } from "./WorkSection";

type Props = {
  nghe: NgheNghiepRow;
  linhVucs: LinhVucRow[];
  related: RelatedCareerCard[];
  skills: KyNangRow[];
};

export function CareerDetailView({
  nghe,
  linhVucs,
  related,
  skills,
}: Props) {
  const mc = nghe.main_content;
  const skillIds = nghe.skill_id ?? [];
  const skillDetails: SkillDetail[] = nghe.skill_detail ?? [];

  return (
    <article className="career-page">
      <div className="career-page-inner page">
        <div className="career-page-main">
          <CareerHero nghe={nghe} linhVucs={linhVucs} />
          <VideoEmbed
            url={nghe.main_video}
            title={`Giới thiệu ${nghe.title_eng ?? ""}`}
          />
          <CareerLaAi
            nghe={nghe}
            html={mc?.la_ai}
            illuUrl={nghe.hinh_minh_hoa_url}
          />
          <WorkSection
            titleEng={nghe.title_eng ?? ""}
            mainContent={mc}
            showreelUrl={nghe.showreel_video_url}
          />
          <SkillSection
            nghe={nghe}
            skillIds={skillIds}
            skills={skills}
            skillDetails={skillDetails}
          />
          <RelatedCareers
            related={related}
            lienQuanHtml={mc?.lien_quan_text}
          />
          <RoadmapSection
            titleEng={nghe.title_eng ?? ""}
            items={nghe.lo_trinh}
          />
        </div>
        <aside className="career-page-aside" aria-label="Từ khoá và liên quan">
          <KeywordPanel related={related} />
        </aside>
      </div>
    </article>
  );
}

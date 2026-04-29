import type { KyNangRow, NgheNghiepRow, SkillDetail } from "@/lib/career/types";

import { MsIcon } from "@/components/cins/MsIcon";

type Props = {
  nghe: NgheNghiepRow;
  skillIds: string[];
  skills: KyNangRow[];
  skillDetails: SkillDetail[];
};

export function SkillSection({
  nghe,
  skillIds,
  skills,
  skillDetails,
}: Props) {
  const titleEng = nghe.title_eng ?? "";
  if (!skillIds.length) return null;

  const detailMap = new Map(skillDetails.map((d) => [d.skill_id, d.noi_dung]));

  return (
    <section
      className="career-section career-surface"
      aria-labelledby="career-skills-title"
    >
      <h2 id="career-skills-title" className="cins-h2 career-section-title">
        {titleEng} cần giỏi gì?
      </h2>
      <div className="career-skills-icons" aria-hidden>
        {skillIds.map((id) => {
          const sk = skills.find((s) => s.id === id);
          const glyph = sk?.icon ?? "star";
          return (
            <span key={id} className="career-skill-icon-wrap">
              <MsIcon name={glyph} className="career-skill-icon" />
            </span>
          );
        })}
      </div>
      <div className="career-skills-body">
        {skillIds.map((id, index) => {
          const sk = skills.find((s) => s.id === id);
          const bodyHtml = detailMap.get(id);
          const name = sk?.title_vietnam ?? "";
          if (!name && !bodyHtml?.trim()) return null;
          return (
            <article key={id} className="career-skill-block">
              <h3 className="career-skill-name">
                <span className="career-skill-order">{index + 1}.</span> {name}
              </h3>
              {bodyHtml?.trim() ? (
                <div
                  className="cins-rich-text cins-body"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

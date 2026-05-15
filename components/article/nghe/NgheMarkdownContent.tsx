import { parseNgheMarkdown } from "@/lib/articles/nghe-markdown";
import { NgheMdInline } from "@/components/article/nghe/NgheRelParts";

function SectionHeading({
  num,
  title,
  titleEm,
}: {
  num: string;
  title: string;
  titleEm: string | null;
}) {
  return (
    <h2 className="section-h">
      <span className="num">{num}</span>
      {title}
      {titleEm ? <em>— {titleEm}</em> : null}
    </h2>
  );
}

export function NgheMarkdownContent({ markdown }: { markdown: string }) {
  const { intro, sections } = parseNgheMarkdown(markdown);

  if (!intro && !sections.length) {
    return (
      <p className="body body-md-empty">Nội dung đang được cập nhật.</p>
    );
  }

  return (
    <>
      {intro ? (
        <div className="body">
          <NgheMdInline text={intro} />
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.num}>
          <SectionHeading
            num={section.num}
            title={section.title}
            titleEm={section.titleEm}
          />

          {section.skills.length > 0 ? (
            <div className="skill-grid">
              {section.skills.map((skill) => (
                <div
                  key={skill.text}
                  className={`skill-item${skill.hot ? " hot" : ""}`}
                >
                  {skill.text}
                </div>
              ))}
            </div>
          ) : null}

          {section.intro ? (
            <div className="body">
              <NgheMdInline text={section.intro} />
            </div>
          ) : null}

          {section.techBlocks.map((block) => (
            <div key={block.roman + block.title} className="tech-block">
              <span className="tech-num">{block.roman}</span>
              <h3>{block.title}</h3>
              {block.body ? (
                <div className="body">
                  <NgheMdInline text={block.body} />
                </div>
              ) : null}
            </div>
          ))}

          {section.prose ? (
            <div className="body">
              <NgheMdInline text={section.prose} />
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}

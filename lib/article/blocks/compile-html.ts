import { escapeHtml } from "@/lib/article/blocks/escape";
import type {
  AccordionItem,
  ArticleDocument,
  BlockNode,
  ImagePlaceholderAttrs,
  InfoboxAttrs,
  JobItemAttrs,
  PathStep,
  SkillItem,
} from "@/lib/article/blocks/types";

function skillIconHtml(icon: string): string {
  const lig = escapeHtml(icon.trim() || "widgets");
  return `<span class="arc-skill-emoji arc-skill-ms material-symbols-outlined" aria-hidden="true">${lig}</span>`;
}

export function compileSkillGridHtml(items: SkillItem[]): string {
  const cells = items
    .map(
      (item) =>
        `<div class="arc-skill-icon-item">${skillIconHtml(item.icon)}<span class="arc-skill-label">${escapeHtml(item.label)}</span></div>`,
    )
    .join("\n");
  return `<div class="arc-skill-grid">\n${cells}\n</div>`;
}

export function compileAccordionHtml(items: AccordionItem[]): string {
  const cards = items
    .map((item) => {
      const open = item.open ? " open" : "";
      return `<details class="arc-card"${open}>\n<summary>${escapeHtml(item.summary)}</summary>\n<div class="arc-card-body"><p>${escapeHtml(item.body)}</p></div>\n</details>`;
    })
    .join("\n");
  return `<div class="arc-accordion">\n${cards}\n</div>`;
}

export function compilePathHtml(steps: PathStep[]): string {
  const rows = steps
    .map(
      (step, i) =>
        `<div class="arc-path-step">\n<div class="arc-step-num">${i + 1}</div>\n<div class="arc-step-body">\n<strong>${escapeHtml(step.title)}</strong>\n<p>${escapeHtml(step.body)}</p>\n</div>\n</div>`,
    )
    .join("\n");
  return `<div class="arc-path">\n${rows}\n</div>`;
}

export function compileJobItemHtml(attrs: JobItemAttrs): string {
  return `<div class="arc-job-item">\n<h3 class="arc-h3">${escapeHtml(attrs.title)}</h3>\n<p>${escapeHtml(attrs.body)}</p>\n</div>`;
}

export function compileInfoboxHtml(attrs: InfoboxAttrs): string {
  return `<div class="arc-infobox">\n<span class="arc-infobox-label">${escapeHtml(attrs.label)}</span>\n<p>${escapeHtml(attrs.body)}</p>\n</div>`;
}

export function compileImagePlaceholderHtml(attrs: ImagePlaceholderAttrs): string {
  const wide = attrs.wide ? " arc-image-placeholder--wide" : "";
  const kw = attrs.keywords.trim() ? `"${escapeHtml(attrs.keywords)}"` : "&nbsp;";
  return `<div class="arc-image-block arc-image-single">\n<div class="arc-image-placeholder${wide}">\n<span class="arc-img-hint-label">${escapeHtml(attrs.label)}</span>\n<span class="arc-img-hint-kw">${kw}</span>\n</div>\n<p class="arc-image-caption">Chú thích ảnh</p>\n</div>`;
}

function compileSectionHeading(title: string, sectionNum?: string): string {
  if (sectionNum?.trim()) {
    const num = escapeHtml(sectionNum.trim());
    const body = escapeHtml(title);
    return `<h2 class="arc-h2" data-arc-section="${num}"><span class="arc-heading-body">${body}</span></h2>`;
  }
  return `<h2>${escapeHtml(title)}</h2>`;
}

function compileBlock(node: BlockNode): string {
  switch (node.type) {
    case "lead": {
      const t = node.attrs.entityTitle?.trim();
      if (t) {
        return `<p class="arc-lead">Bản đóng góp của bạn về <strong>${escapeHtml(t)}</strong>.</p>`;
      }
      return `<p class="arc-lead">Soạn bản đóng góp của bạn — mỗi người một bài riêng.</p>`;
    }
    case "section": {
      const head = compileSectionHeading(
        node.attrs.title,
        node.attrs.sectionNum,
      );
      const hint = node.attrs.hint?.trim()
        ? `<p><em>${escapeHtml(node.attrs.hint)}</em></p>`
        : "";
      const inner = node.attrs.children.map(compileBlock).join("\n");
      return `<section class="arc-section">\n${head}\n${hint}\n${inner}\n</section>`;
    }
    case "paragraph":
      return `<p>${escapeHtml(node.attrs.text)}</p>`;
    case "skill-grid":
      return compileSkillGridHtml(node.attrs.items);
    case "accordion":
      return compileAccordionHtml(node.attrs.items);
    case "path":
      return compilePathHtml(node.attrs.steps);
    case "job-item":
      return compileJobItemHtml(node.attrs);
    case "infobox":
      return compileInfoboxHtml(node.attrs);
    case "image-placeholder":
      return compileImagePlaceholderHtml(node.attrs);
    default:
      return "";
  }
}

/** Biên dịch document → HTML lưu DB (wrapper article-rich-content). */
export function compileArticleHtml(doc: ArticleDocument): string {
  const body = doc.blocks.map(compileBlock).join("\n");
  const docMeta = encodeURIComponent(
    JSON.stringify({ version: doc.version, loaiBaiViet: doc.loaiBaiViet }),
  );
  return `<div class="article-rich-content article-content-html" data-cins-doc="${docMeta}">\n${body}\n</div>`;
}

/** Gỡ wrapper nếu có — giữ nội dung trong editor. */
export function stripArticleWrapper(html: string): string {
  const t = html.trim();
  const m = t.match(
    /^<div[^>]*class="[^"]*article-rich-content[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/i,
  );
  return m?.[1]?.trim() ?? t;
}

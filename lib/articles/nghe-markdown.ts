import { isSkillSection, romanIndex, splitSectionTitle } from "@/lib/articles/rel-visual";

export type NgheSkillItem = { text: string; hot: boolean };

export type NgheTechBlock = {
  roman: string;
  title: string;
  body: string;
};

export type NgheMdSection = {
  num: string;
  title: string;
  titleEm: string | null;
  intro: string;
  techBlocks: NgheTechBlock[];
  skills: NgheSkillItem[];
  prose: string;
};

export type ParsedNgheMarkdown = {
  intro: string;
  sections: NgheMdSection[];
};

function parseSkillList(block: string): NgheSkillItem[] {
  const items: NgheSkillItem[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (!m) continue;
    let text = m[1]!.trim();
    let hot = false;
    if (text.startsWith("**") && text.endsWith("**")) {
      hot = true;
      text = text.slice(2, -2).trim();
    } else if (text.includes("**")) {
      const inner = text.match(/\*\*(.+?)\*\*/);
      if (inner) {
        hot = true;
        text = inner[1]!.trim();
      }
    }
    if (text) items.push({ text, hot });
  }
  return items;
}

function splitTechBlocks(body: string): {
  techBlocks: NgheTechBlock[];
  remainder: string;
} {
  const techBlocks: NgheTechBlock[] = [];
  const parts = body.split(/^### /m);
  const preamble = parts[0]?.trim() ?? "";
  let roman = 0;

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]!;
    const nl = chunk.indexOf("\n");
    const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const rest = (nl === -1 ? "" : chunk.slice(nl + 1)).trim();
    techBlocks.push({
      roman: romanIndex(roman),
      title,
      body: rest,
    });
    roman++;
  }

  return { techBlocks, remainder: preamble };
}

export function parseNgheMarkdown(markdown: string): ParsedNgheMarkdown {
  if (!markdown?.trim()) {
    return { intro: "", sections: [] };
  }

  const chunks = markdown.split(/^## /m);
  const intro = chunks[0]?.trim() ?? "";
  const sections: NgheMdSection[] = [];

  chunks.slice(1).forEach((chunk, idx) => {
    const nl = chunk.indexOf("\n");
    const rawTitle = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = (nl === -1 ? "" : chunk.slice(nl + 1)).trim();
    const { main, em } = splitSectionTitle(rawTitle);
    const num = String(idx + 1).padStart(2, "0");

    if (isSkillSection(rawTitle)) {
      sections.push({
        num,
        title: main,
        titleEm: em,
        intro: "",
        techBlocks: [],
        skills: parseSkillList(body),
        prose: "",
      });
      return;
    }

    const { techBlocks, remainder } = splitTechBlocks(body);
    sections.push({
      num,
      title: main,
      titleEm: em,
      intro: remainder,
      techBlocks,
      skills: [],
      prose: techBlocks.length ? "" : body,
    });
  });

  return { intro, sections };
}

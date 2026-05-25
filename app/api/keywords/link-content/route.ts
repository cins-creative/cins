import { NextResponse } from "next/server";

import { linkKeywordsInContent } from "@/lib/articles/link-keywords-in-content";
import {
  markdownToArcLeadHtml,
  normalizeArticleRichHtml,
} from "@/lib/articles/article-rich-html-normalize";
import { stripLeadingSqlComments } from "@/lib/article/rich-body";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      source?: string;
      excludeSlug?: string;
    };
    const raw = String(body.source ?? "").trim();
    if (!raw) {
      return NextResponse.json({ html: "" });
    }
    const stripped = stripLeadingSqlComments(raw.replace(/\r\n/g, "\n"));
    const html = /^\s*</.test(stripped)
      ? stripped
      : markdownToArcLeadHtml(stripped);
    const normalized = normalizeArticleRichHtml(html);
    const linked = await linkKeywordsInContent(normalized, {
      excludeSlug: body.excludeSlug?.trim() || undefined,
    });
    return NextResponse.json({ html: linked });
  } catch {
    return NextResponse.json({ html: "" }, { status: 500 });
  }
}

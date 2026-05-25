"use client";

import { useEffect, useState } from "react";

import { KeywordInlineProse } from "@/components/article/keyword/KeywordInlineProse";

type Props = {
  html: string;
  className?: string;
  excludeSlug?: string;
};

/** Client preview (draft ngành/nghề) — gọi API gắn keyword rồi render tooltip. */
export function KeywordInlineLeadPreview({
  html,
  className,
  excludeSlug,
}: Props) {
  const [linked, setLinked] = useState(html);

  useEffect(() => {
    const trimmed = html.trim();
    if (!trimmed) {
      setLinked("");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/keywords/link-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: trimmed, excludeSlug }),
        });
        const data = (await res.json()) as { html?: string };
        if (!cancelled) setLinked(data.html?.trim() ? data.html : trimmed);
      } catch {
        if (!cancelled) setLinked(trimmed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html, excludeSlug]);

  if (!linked.trim()) return null;

  return <KeywordInlineProse html={linked} className={className} />;
}

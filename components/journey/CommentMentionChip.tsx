"use client";

import { useEffect, useMemo, useState } from "react";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { fetchUserPreview } from "@/lib/journey/user-preview-cache";

export type MentionPreview = {
  tenHienThi: string;
  avatarUrl: string | null;
};

type ChipProps = {
  slug: string;
  preview?: MentionPreview | null;
};

export function CommentMentionChip({ slug, preview }: ChipProps) {
  const displayName = preview?.tenHienThi ?? slug;
  const avatarUrl = preview?.avatarUrl ?? null;
  const initial = (displayName || slug).charAt(0).toUpperCase();

  return (
    <JourneyUserPopover
      slug={slug}
      fallbackName={displayName}
      fallbackAvatarUrl={avatarUrl}
      backdropZIndex={9800}
    >
      <span className="post-comments-mention-tag">
        <span className="post-comments-mention-tag-avatar" aria-hidden>
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{initial}</span>
          )}
        </span>
        <span className="post-comments-mention-tag-name">{displayName}</span>
      </span>
    </JourneyUserPopover>
  );
}

/** Resolve slug → tên + avatar (dedupe, cache trong phiên component). */
export function useMentionPreviews(slugs: readonly string[]) {
  const slugKey = useMemo(
    () =>
      [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))].join(
        "\0",
      ),
    [slugs],
  );
  const uniqueSlugs = useMemo(
    () => (slugKey ? slugKey.split("\0") : []),
    [slugKey],
  );
  const [previews, setPreviews] = useState<Record<string, MentionPreview>>({});

  useEffect(() => {
    if (uniqueSlugs.length === 0) return;

    let cancelled = false;

    void Promise.all(
      uniqueSlugs.map(async (slug) => {
        try {
          const profile = await fetchUserPreview(slug);
          if (!profile) return null;
          return {
            slug,
            preview: {
              tenHienThi: profile.tenHienThi ?? slug,
              avatarUrl: profile.avatarUrl ?? null,
            } satisfies MentionPreview,
          };
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setPreviews((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const row of rows) {
          if (row && !next[row.slug]) {
            next[row.slug] = row.preview;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [slugKey]);

  return previews;
}

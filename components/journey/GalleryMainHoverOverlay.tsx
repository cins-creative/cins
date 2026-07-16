import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";

type Props = {
  label: string;
  meta?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
};

/** Overlay hover gallery — dùng chung main grid + aside banner. */
export function GalleryMainHoverOverlay({
  label,
  meta,
  authorName,
  authorAvatarUrl,
}: Props) {
  return (
    <span className="j-main-gallery-overlay" aria-hidden>
      <span className="j-main-gallery-overlay-body">
        {authorName ? (
          <span className="j-main-gallery-author">
            {authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="j-main-gallery-author-avatar"
                src={authorAvatarUrl}
                alt=""
                loading="lazy"
              />
            ) : (
              <span className="j-main-gallery-author-avatar j-main-gallery-author-avatar--fallback">
                {authorName.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="j-main-gallery-author-name">{authorName}</span>
          </span>
        ) : null}
        <strong className="j-main-gallery-overlay-title">{label}</strong>
        {meta ? (
          <MoTaMarkdown
            text={meta}
            as="small"
            className="j-main-gallery-overlay-excerpt"
            linkify={false}
          />
        ) : null}
      </span>
    </span>
  );
}

import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";

type Props = {
  label: string;
  meta?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  /** Slug user của tác giả — có thì click tên mở card user thay vì chỉ hiển thị. */
  authorSlug?: string | null;
};

/** Overlay hover gallery — dùng chung main grid + aside banner. */
export function GalleryMainHoverOverlay({
  label,
  meta,
  authorName,
  authorAvatarUrl,
  authorSlug,
}: Props) {
  const authorChip = authorName ? (
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
  ) : null;

  return (
    <span className="j-main-gallery-overlay" aria-hidden>
      <span className="j-main-gallery-overlay-body">
        {authorChip && authorSlug ? (
          <JourneyUserPopover
            slug={authorSlug}
            fallbackName={authorName}
            fallbackAvatarUrl={authorAvatarUrl}
          >
            {authorChip}
          </JourneyUserPopover>
        ) : (
          authorChip
        )}
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

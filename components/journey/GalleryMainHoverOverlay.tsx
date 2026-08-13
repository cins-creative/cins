import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";

type AuthorRowProps = {
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  /** Slug user của tác giả — có thì click tên mở card user thay vì chỉ hiển thị. */
  authorSlug?: string | null;
};

type Props = AuthorRowProps & {
  label: string;
  meta?: string | null;
};

/** Avatar + tên tác giả — overlay hover hoặc caption dưới ảnh. */
export function GalleryAuthorRow({
  authorName,
  authorAvatarUrl,
  authorSlug,
}: AuthorRowProps) {
  if (!authorName) return null;
  const chip = (
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
  );
  if (!authorSlug) return chip;
  return (
    <JourneyUserPopover
      slug={authorSlug}
      fallbackName={authorName}
      fallbackAvatarUrl={authorAvatarUrl}
    >
      {chip}
    </JourneyUserPopover>
  );
}

/** Overlay hover gallery — dùng chung main grid + aside banner. */
export function GalleryMainHoverOverlay({
  label,
  meta,
  authorName,
  authorAvatarUrl,
  authorSlug,
}: Props) {
  return (
    <span className="j-main-gallery-overlay" aria-hidden>
      <span className="j-main-gallery-overlay-body">
        <GalleryAuthorRow
          authorName={authorName}
          authorAvatarUrl={authorAvatarUrl}
          authorSlug={authorSlug}
        />
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

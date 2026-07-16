import type { GallerySourcePerson } from "@/lib/journey/gallery-source-author";

type Props = {
  people?: ReadonlyArray<GallerySourcePerson> | null;
  /** @deprecated Dùng `people` — giữ cho call-site cũ 1 avatar. */
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  title?: string;
};

/** Avatar góc thumb — stack người có vai trò trong dự án (pinned + featured). */
export function GalleryAuthorCornerBadge({
  people,
  name,
  avatarUrl,
  className,
  title,
}: Props) {
  const list: GallerySourcePerson[] =
    people && people.length > 0
      ? [...people]
      : name || avatarUrl
        ? [
            {
              name: name?.trim() || "?",
              avatarUrl: avatarUrl ?? null,
              initial: (name?.trim() || "?").charAt(0).toUpperCase(),
            },
          ]
        : [];

  if (list.length === 0) return null;

  const tip =
    title ??
    (list.length === 1
      ? `Từ ${list[0].name}`
      : list.map((p) => p.name).join(", "));

  return (
    <span
      className={["j-g-source-author", className].filter(Boolean).join(" ")}
      title={tip}
      aria-hidden
    >
      {list.map((person, index) => (
        <span
          key={person.id ?? `${person.name}-${index}`}
          className="j-g-source-author-chip"
          style={{ zIndex: list.length - index }}
        >
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatarUrl} alt="" />
          ) : (
            <span className="j-g-source-author-fallback">
              {(person.initial ?? person.name.charAt(0)).toUpperCase()}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

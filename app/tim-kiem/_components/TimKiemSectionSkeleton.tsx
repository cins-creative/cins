import type { SearchEntityKind, SearchSectionLayout } from "@/lib/search/types";
import { SEARCH_SECTION_META } from "@/lib/search/types";

const SKELETON_COUNT: Record<SearchSectionLayout, number> = {
  knowledge: 4,
  orgs: 3,
  people: 3,
  posts: 2,
  courses: 3,
  jobs: 2,
};

/** Skeleton match layout thật (cùng grid/số ô) → không layout shift khi stream về. */
export function TimKiemSectionSkeleton({
  entityKind,
}: {
  entityKind: SearchEntityKind;
}) {
  const layout = SEARCH_SECTION_META[entityKind].layout;
  const count = SKELETON_COUNT[layout] ?? 4;

  return (
    <section className="tk-section tk-section--pending" aria-hidden>
      <div className="tk-skel-head">
        <span className="tk-skel-icon" />
        <span className="tk-skel-copy">
          <span className="tk-skel-line tk-skel-line--title" />
          <span className="tk-skel-line tk-skel-line--sub" />
        </span>
      </div>
      <ul className={`tk-grid tk-grid--${layout}`}>
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <div className={`tk-skel-card tk-skel-card--${layout}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}

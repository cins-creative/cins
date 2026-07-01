import { Search } from "lucide-react";

import { TIM_KIEM_PATH } from "@/lib/search/paths";

type Props = {
  query: string;
  kind: string;
};

export function TimKiemSearchForm({ query, kind }: Props) {
  return (
    <form action={TIM_KIEM_PATH} method="get" className="tk-search-form" role="search">
      {kind && kind !== "all" ? (
        <input type="hidden" name="kind" value={kind} />
      ) : null}
      <label className="tk-search-field">
        <Search size={18} strokeWidth={2} aria-hidden className="tk-search-icon" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nghề, trường, @slug, từ khóa bài viết…"
          aria-label="Tìm kiếm trên CINs"
          autoComplete="off"
          autoFocus={!query}
        />
      </label>
      <button type="submit" className="tk-search-submit">
        Tìm kiếm
      </button>
    </form>
  );
}

import { searchByEntityKind } from "@/lib/search/global-search";
import type { SearchEntityKind } from "@/lib/search/types";

import { TimKiemStreamedSection } from "./TimKiemStreamedSection";

type Props = {
  entityKind: SearchEntityKind;
  query: string;
};

/** Async Server Component: chỉ chờ 1 loại → stream độc lập, xong trước hiện trước. */
export async function TimKiemKindStream({ entityKind, query }: Props) {
  const hits = await searchByEntityKind(entityKind, query);
  return <TimKiemStreamedSection entityKind={entityKind} hits={hits} />;
}

/** Parse `?filter=slug1&filter=slug2,slug3` từ request URL. */
export function parseFilterSlugsFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams.getAll("filter");
  const slugs = raw
    .flatMap((part) => part.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(slugs)];
}

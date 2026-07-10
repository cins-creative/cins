/** Tách H1 chính và dòng phụ sau dấu ` | `. */
export function splitArticleTitleEm(title: string): {
  main: string;
  em: string | null;
} {
  const idx = title.indexOf(" | ");
  if (idx === -1) return { main: title, em: null };
  return {
    main: title.slice(0, idx).trim(),
    em: title.slice(idx + 3).trim() || null,
  };
}

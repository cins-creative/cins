export function KeywordCapDoBadge({ capDo }: { capDo?: string | null }) {
  const raw = capDo?.trim().toLowerCase();
  if (!raw) return null;
  const label = raw === "core" ? "core" : raw === "related" ? "related" : raw;
  const cls =
    raw === "core"
      ? "kw-cap-do kw-cap-do--core"
      : "kw-cap-do kw-cap-do--related";
  return (
    <span className={cls} aria-label={`Mức liên quan: ${label}`}>
      {label}
    </span>
  );
}

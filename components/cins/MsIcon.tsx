/** Google Material Symbols Outlined — tên glyph: https://fonts.google.com/icons */
export function MsIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`.trim()}
      aria-hidden
    >
      {name}
    </span>
  );
}

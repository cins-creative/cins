import Link from "next/link";

export function LabSlicePlaceholder({
  title,
  slice,
  notes,
}: {
  title: string;
  slice: string;
  notes: string[];
}) {
  return (
    <div className="lab-placeholder">
      <p className="gh-eyebrow">lát cắt sau</p>
      <h1>{title}</h1>
      <p>
        Route lab <code>{slice}</code> — chưa visual-fork. Làm sau khi Home ổn.
      </p>
      <ul>
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: "var(--cins-blue)", fontWeight: 700 }}>
          ← Về Home lab
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem", margin: 0 }}>Trung CINs website</h1>
      <p className="muted" style={{ maxWidth: 520 }}>
        Nhánh Trung — shell nền tảng nhẹ & nhanh; portfolio trước; edit, design,
        3D, game và Sine Art gắn sau dạng capability lazy.
      </p>
      <div className="row">
        <Link href="/explore" className="btn btn-primary">
          Khám phá lĩnh vực
        </Link>
        <Link href="/studio" className="btn">
          Vào studio
        </Link>
      </div>
    </div>
  );
}

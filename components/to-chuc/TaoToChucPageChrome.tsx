import Link from "next/link";

export function TaoToChucPageChrome() {
  return (
    <header className="ttc-page-top">
      <Link href="/" className="ttc-page-logo" prefetch={false}>
        <span className="ttc-page-logo-mark">C</span>
      </Link>
      <Link href="/" className="ttc-page-back" prefetch={false}>
        ← Về trang chủ
      </Link>
    </header>
  );
}

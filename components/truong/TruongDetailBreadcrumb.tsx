import Link from "next/link";

type Props = {
  schoolName: string;
};

export function TruongDetailBreadcrumb({ schoolName }: Props) {
  const short =
    schoolName.length > 42 ? `${schoolName.slice(0, 40).trimEnd()}…` : schoolName;

  return (
    <nav className="crumb fade f1" aria-label="Breadcrumb">
      <Link href="/">Trang chủ</Link>
      <span className="sep">/</span>
      <Link href="/truong-dai-hoc">Trường đào tạo</Link>
      <span className="sep">/</span>
      <span className="here">{short}</span>
    </nav>
  );
}

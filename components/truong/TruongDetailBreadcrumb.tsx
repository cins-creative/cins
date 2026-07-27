import Link from "next/link";

import { TO_CHUC_HUB_PATH } from "@/lib/cins/hubPaths";

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
      <Link href={TO_CHUC_HUB_PATH}>Tổ chức</Link>
      <span className="sep">/</span>
      <span className="here">{short}</span>
    </nav>
  );
}

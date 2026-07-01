import Link from "next/link";

export function SidebarBrandStaticLink() {
  return (
    <Link href="/" className="sb-brand" aria-label="C.INS trang chủ">
      <span className="sb-brand-static" aria-hidden>
        <img src="/assets/logo-cins-icon.svg" alt="" />
      </span>
    </Link>
  );
}

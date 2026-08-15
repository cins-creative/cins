import Link from "next/link";

export function CinsChatListBrand() {
  return (
    <Link href="/" className="cins-chat-list-brand" aria-label="C.INS trang chủ">
      <img
        className="cins-chat-list-brand-logo"
        src="/assets/logo-cins-wide-white.svg"
        alt=""
        width={148}
        height={40}
        decoding="async"
      />
    </Link>
  );
}

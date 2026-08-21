"use client";

import Link from "next/link";

import { useT } from "@/lib/i18n/use-t";

export function CinsChatListBrand() {
  const t = useT();
  return (
    <Link href="/" className="cins-chat-list-brand" aria-label={t("chat.homeAria")}>
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

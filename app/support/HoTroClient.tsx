"use client";

import { useRouter } from "next/navigation";

import { HelpCenterModal } from "@/components/cins/HelpCenterModal";
import type { HuongDanCatalogPublic } from "@/lib/huong-dan/types";

type Props = {
  initialMode?: "help" | "guide";
  initialNhomSlug?: string | null;
  guideCatalog: HuongDanCatalogPublic;
  isCinsAdmin?: boolean;
};

export function HoTroClient({
  initialMode = "help",
  initialNhomSlug = null,
  guideCatalog,
  isCinsAdmin = false,
}: Props) {
  const router = useRouter();

  return (
    <HelpCenterModal
      open
      syncUrl
      initialMode={initialMode}
      initialNhomSlug={initialNhomSlug}
      guideCatalog={guideCatalog}
      isCinsAdmin={isCinsAdmin}
      onClose={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/");
      }}
    />
  );
}

"use client";

import { useRouter } from "next/navigation";

import { HelpCenterModal } from "@/components/cins/HelpCenterModal";

export function HoTroClient() {
  const router = useRouter();

  return (
    <HelpCenterModal
      open
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

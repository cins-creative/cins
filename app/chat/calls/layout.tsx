import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cuộc gọi · CINs",
  robots: { index: false, follow: false },
};

export default function ChatGoiLayout({ children }: { children: ReactNode }) {
  return children;
}

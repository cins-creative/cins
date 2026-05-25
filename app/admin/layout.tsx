import type { Metadata } from "next";

import "@/app/cins-design-tokens.css";
import "@/app/cins-font-bridge.css";
import "@/app/cins-gradients.css";
import "@/app/cins-nganh-chi-tiet.css";
import "@/app/cins-admin.css";
import "@/app/cins-inline-multi-image.css";
import "@/styles/article-rich-content.css";

export const metadata: Metadata = {
  title: "Admin | CINs",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

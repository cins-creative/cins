import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | CINs",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

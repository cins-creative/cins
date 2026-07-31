import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "@/styles/cins-tokens.css";

export const dynamic = "force-dynamic";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trung CINs website",
    template: "%s · Trung CINs website",
  },
  description: "Nhánh Trung — shell portfolio nhẹ trên hệ sinh thái sáng tạo CINs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body style={{ fontFamily: "var(--font-be-vietnam), var(--font-sans)" }}>
        <div className="shell">
          <SiteHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Anton, Be_Vietnam_Pro } from "next/font/google";

import { LabChrome } from "@/components/lab/LabChrome";
import { LabProvider } from "@/components/lab/LabProvider";

import "@/styles/cins-design-tokens.css";
import "@/styles/guest-home.css";
import "@/styles/guest-home-login.css";
import "@/styles/world-journey-feed.css";
import "@/styles/lab.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "800", "900"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin", "vietnamese"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "CINs UI Lab",
  description:
    "Sandbox UI tách khỏi web CINs chính — visual fork + interactive mock, không gọi DB/API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light">
      <body className={`${beVietnam.variable} ${anton.variable}`}>
        <LabProvider>
          <div className="lab-shell">
            <LabChrome />
            <div className="lab-main">{children}</div>
          </div>
        </LabProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { AuthEnterOverlayHost } from "@/components/auth/AuthEnterOverlayHost";
import { AuthSessionRemember } from "@/components/auth/AuthSessionRemember";
import { ThemeRoot } from "@/components/cins/ThemeRoot";
import { HardNavGuard } from "@/components/navigation/HardNavGuard";
import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { THEME_NO_FLASH_SCRIPT } from "@/lib/theme/theme-mode";
import "./globals.css";
import "./cins-design-tokens.css";
import "./cins-font-bridge.css";
import "./cins-styles.css";
import "./cins-cmm.css";
import "./cins-material-symbols.css";
import "./cins-gradients.css";
import "./cins-app-nav.css";
import "./cins-frost-sticky.css";
import "./cins-chat-overlay.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "800", "900"],
});

const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
  description:
    "Mạng xã hội chuyên môn ngành sáng tạo Việt Nam — portfolio, cộng đồng, khóa học, cửa hàng và cơ sở đào tạo.",
  icons: {
    icon: [
      { url: "/assets/logo-cins-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "CINs",
    locale: "vi_VN",
    url: "/",
    title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
    description:
      "Mạng xã hội chuyên môn ngành sáng tạo Việt Nam — portfolio, cộng đồng, khóa học, cửa hàng và cơ sở đào tạo.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CINs — Khám phá ngành sáng tạo thị giác tại Việt Nam",
    description:
      "Mạng xã hội chuyên môn ngành sáng tạo Việt Nam — portfolio, cộng đồng, khóa học, cửa hàng và cơ sở đào tạo.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* No-flash theme: một script tĩnh trong <head>. Không dùng useServerInsertedHTML
            (streaming SSR gọi callback mỗi chunk → chèn hàng chục script, phá RSC/hydration). */}
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_NO_FLASH_SCRIPT,
          }}
        />
        {/* Load Material Symbols in <head> — @import in CSS is easy to block or apply late; icon text shows as words if the font never loads. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
        {/* Crimson Pro — editorial only (blockquote / long-form); UI dùng Be Vietnam Pro qua next/font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeRoot />
        <HardNavGuard />
        <AuthSessionRemember />
        <AuthEnterOverlayHost />
        {children}
      </body>
    </html>
  );
}

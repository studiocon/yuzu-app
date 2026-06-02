import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Unbounded } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import SplashScreen from "@/components/SplashScreen";
import { PostHogProvider } from "@/components/PostHogProvider";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-display",
});

const SITE_NAME = "YUZU";
const SITE_DESCRIPTION = "BE TRUE / 本物でいろ — 声を絞り出すジャーナル。長押し。話せ。";
const SITE_URL = "https://yuzu.style";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s — YUZU",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["YUZU", "ジャーナル", "音声", "BE TRUE", "本物でいろ"],
  authors: [{ name: "YUZU" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={unbounded.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@400;700&display=swap"
        />
      </head>
      <body>
        <SplashScreen />
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}

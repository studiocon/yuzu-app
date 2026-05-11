import "./globals.css";
import type { Metadata } from "next";
import { Unbounded, Noto_Sans_JP } from "next/font/google";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-display",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yuzu-journal.vercel.app"),
  title: "YUZU",
  description: "生の声が、香る。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${unbounded.variable} ${notoSansJp.variable}`}>
      <body>{children}</body>
    </html>
  );
}

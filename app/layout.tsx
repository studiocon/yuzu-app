import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, Zen_Kaku_Gothic_New } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "PEACH",
  description: "声は、種。つぶやきは、実る。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${fraunces.variable} ${zenKaku.variable}`}>
      <body>{children}</body>
    </html>
  );
}

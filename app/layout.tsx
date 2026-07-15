// バックエンド専用リポの最小 root layout（route handler のみでも next build を安定させる）。
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Noto_Serif_JP, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-mincho",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Diary",
  description: "AI diary assistant",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${zenMaru.className} ${zenMaru.variable} ${notoSerifJp.variable} font-sans antialiased`}
      >
        <div id="__next" className="app-next-root">
          {children}
        </div>
      </body>
    </html>
  );
}

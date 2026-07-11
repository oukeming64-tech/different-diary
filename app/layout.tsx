import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./motion.css";
import "./editorial.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://jianfei-paipai-le.kemo64.chatgpt.site"),
  title: "不一样的日记｜先接住你，再说别的",
  description:
    "一个不催促、不打分、可以离线使用的本机陪伴工具。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/app-icon-192.png",
    apple: "/app-icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "不一样的日记",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "不一样的日记｜先接住你，再说别的",
    description: "你这会儿，想从哪儿说起？一个不催促、不打分的生活日记。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "黄昏湖边的黄色空椅与不一样的日记陪伴界面",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "不一样的日记｜先接住你，再说别的",
    description: "你这会儿，想从哪儿说起？一个不催促、不打分的生活日记。",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e9e6e4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

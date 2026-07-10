import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./motion.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "减肥拍拍乐｜先接住你，再说别的",
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
    title: "拍拍乐",
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

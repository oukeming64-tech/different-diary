import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "不一样的日记",
    short_name: "不一样的日记",
    description: "一个不催促、不打分、可以离线使用的本机陪伴工具。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#efede7",
    lang: "zh-CN",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paxora Parish OS",
    short_name: "Paxora",
    description: "Week-first parish coordination",
    start_url: "/this-week",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1e40af",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      },
      {
        src: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png"
      }
    ]
  };
}

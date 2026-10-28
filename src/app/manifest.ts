import type { MetadataRoute } from "next";
import { CONTENT } from "@/content/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: CONTENT.site.name,
    short_name: CONTENT.site.shortName,
    description: CONTENT.site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    orientation: "landscape",
    background_color: CONTENT.site.backgroundColor,
    theme_color: CONTENT.site.themeColor,
    lang: "en",
    dir: "ltr",
    categories: ["entertainment", "personalization"],
    icons: CONTENT.site.manifestIcons.map((icon) => ({ ...icon })),
  };
}

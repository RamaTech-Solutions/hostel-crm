import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.8 },
  ];
}

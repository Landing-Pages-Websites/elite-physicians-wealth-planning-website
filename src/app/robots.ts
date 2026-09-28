import type { MetadataRoute } from "next";

/**
 * /decision-atlas is Direction B, kept in the tree for comparison until
 * Direction A has shipped. It is a review surface, not part of the site, so it
 * is excluded from crawling as well as from the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/decision-atlas"] },
    sitemap: "https://elitephysicianswealthplanning.com/sitemap.xml",
  };
}

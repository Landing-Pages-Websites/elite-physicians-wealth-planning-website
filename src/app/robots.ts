import type { MetadataRoute } from "next";

/**
 * /decision-atlas is Direction B, kept in the tree for comparison until
 * Direction A has shipped. It carries its own `robots: { index: false }` rather
 * than a Disallow here: a disallowed URL cannot be crawled, so its noindex is
 * never read, and the combination is exactly what produces a URL-only listing.
 * It stays out of the sitemap either way.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://elitephysicianswealthplanning.com/sitemap.xml",
  };
}

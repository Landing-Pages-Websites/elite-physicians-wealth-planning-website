import type { MetadataRoute } from "next";
import { allRoutes } from "@/lib/pages";

/**
 * Launch domain per section_manifest hard_rules: the PLURAL
 * elitephysicianswealthplanning.com. The singular domain the source site runs
 * on is reference-only and is never emitted here.
 *
 * Routes come from the captured-copy map, so the sitemap cannot drift from
 * what actually ships: a route with no copy throws at build time rather than
 * appearing here as a 404. /decision-atlas is deliberately absent — it is
 * Direction B, retained for comparison until Direction A has shipped, and it
 * is not part of the public site.
 */
const BASE_URL = "https://elitephysicianswealthplanning.com";

/** Depth decides priority: the homepage, then families, then their children. */
function priorityFor(route: string): number {
  if (route === "/") return 1;
  return route.split("/").filter(Boolean).length === 1 ? 0.8 : 0.6;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return allRoutes().map((route) => ({
    url: `${BASE_URL}${route === "/" ? "" : route}`,
    changeFrequency: "monthly",
    priority: priorityFor(route),
  }));
}

/** The starter lead pipeline's identity seam, without changing this legacy site's shape. */
export const siteConfig = {
  megaCustomerId: "2443cdd5-f9c8-44a5-9201-e46bafde1dfe",
  megaSiteId: "5bf9cf55-5194-46dd-ae6d-45a7f4d8b66f",
  megaSiteKey: "t651hug14c8gq3du",
  sourceProvider: "website-elite-physicians-wealth-planning",
  // Every intent currently shares the existing form and website catch-all.
  formKeys: ["contact-form"],
  // No attachment control exists on this site. Do not enable storage implicitly.
  uploadsEnabled: false,
} as const;

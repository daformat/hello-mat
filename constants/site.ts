/**
 * The few facts about this site that more than one component needs to agree on:
 * where it lives, who wrote it, and where else that person can be found.
 */

export const SITE_URL = "https://hello-mat.com";
export const SITE_NAME = "Hello Mat";
export const SITE_TAGLINE = "Mathieu Jouhet, design engineer";

export const AUTHOR_NAME = "Mathieu Jouhet";
export const AUTHOR_ALTERNATE_NAME = "daformat";
export const AUTHOR_TWITTER = "@daformat";

/**
 * Every profile linked from the header, plus the two package registries. This
 * is what ties "Mathieu Jouhet", "daformat", and this domain together as one
 * person rather than three unrelated names.
 */
export const AUTHOR_PROFILES = [
  "https://github.com/daformat",
  "https://observablehq.com/@daformat",
  "https://twitter.com/daformat",
  "https://www.linkedin.com/in/mathieu-jouhet/",
  "https://daformat.medium.com",
  "https://www.npmjs.com/~daformat",
];

/** The gallery index. Everything below it is an article. */
export const GALLERY_PATH = "/design-engineering";

/** Relative paths become absolute, absolute ones are left alone. */
export const getAbsoluteUrl = (url: string) =>
  url.startsWith("http") ? url : `${SITE_URL}${url}`;

/** True for an article page, false for the homepage and the gallery index. */
export const isGalleryArticle = (url: string) => {
  const path = url.startsWith("http") ? url.slice(SITE_URL.length) : url;
  return path.startsWith(`${GALLERY_PATH}/`);
};

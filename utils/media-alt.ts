import {
  COMPONENTS,
  COMPONENTS_ORDER,
} from "@/constants/design-engineering/components";

/**
 * The demos on several pages are filled with the preview cards of other
 * components, which makes them look like real content because they are real
 * content. Rather than hand-writing alt text next to every one, look the image
 * up in the gallery it came from.
 */
const NAMES_BY_IMAGE = new Map<string, string>([
  ["/media/hello-mat-light.png", "Hello Mat"],
  ["/media/hello-mat-dark.png", "Hello Mat"],
]);

for (const componentId of COMPONENTS_ORDER) {
  const { metas } = COMPONENTS[componentId];
  // The demos are filled with the social cards, which come in both themes.
  NAMES_BY_IMAGE.set(metas.image, metas.shortTitle);
  NAMES_BY_IMAGE.set(
    metas.image.replace("-light.png", "-dark.png"),
    metas.shortTitle
  );
}

/**
 * Alt text for a preview card. Anything unrecognised comes back empty, which
 * is the right answer for an image that is only there to fill a slide.
 */
export const describePreview = (source: string) => {
  const name = NAMES_BY_IMAGE.get(source);
  return name ? `Preview card: ${name}` : "";
};

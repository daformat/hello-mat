import { PageMetasProps } from "@/components/PageMetas/PageMetas"

export const COMPONENTS = {
  toc: {
    metas: {
      title: "Design engineering: a table of contents component",
      description:
        "Building a table of contents component, using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/table-of-contents",
      image:
        "https://hello-mat.com/media/design-engineering/toc/og-toc-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  details: {
    metas: {
      title: "Design engineering: a details (or disclosure) component",
      description:
        "Building a details (disclosure) component, using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/details-disclosure-component",
      image:
        "https://hello-mat.com/media/design-engineering/details/og-details-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "images-and-embeds": {
    metas: {
      title: "Design engineering: images and embeds",
      description:
        "Building a Media component supporting images and embeds using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/images-and-embeds",
      image:
        "https://hello-mat.com/media/design-engineering/images-and-embeds/og-media-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "collapsible-toolbar": {
    metas: {
      title: "Design engineering: a collapsible toolbar",
      description:
        "Building a collapsible / resizable toolbar using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/collapsible-toolbar",
      image:
        "https://hello-mat.com/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "publish-button": {
    metas: {
      title: "Design engineering: a publish button",
      description:
        "Building a publish button component with feedback, using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/publish-button",
      image:
        "https://hello-mat.com/media/design-engineering/publish-button/og-publish-button-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "dock-component": {
    metas: {
      title: "Design engineering: a dock component",
      description:
        "Building a macOS-like dock component, using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/dock-component",
      image:
        "https://hello-mat.com/media/design-engineering/dock/og-dock-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "carousel-component": {
    metas: {
      title: "Design engineering: a carousel component",
      description:
        "Building a scrollable, and swipeable carousel, with momentum scrolling, overscroll and rubber-banding using React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/component/carousel-component",
      image:
        "https://hello-mat.com/media/design-engineering/carousel/og-carousel-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "stacking-cards": {
    metas: {
      title: "Design engineering: rolling stacking cards",
      description:
        "Building a rolling stacking cards scroll-driven animation with React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/stacking-cards",
      image:
        "https://hello-mat.com/media/design-engineering/stacking-cards/og-stacking-cards-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "swipeable-cards": {
    metas: {
      title: "Design engineering: a swipeable cards carousel",
      description:
        "Building a swipeable cards stack with React, TypeScript, and SCSS.",
      url: "https://hello-mat.com/design-engineering/swipeable-cards",
      image:
        "https://hello-mat.com/media/design-engineering/swipeable-cards/og-swipeable-cards-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
} as const satisfies Record<string, { metas: PageMetasProps }>

export type ComponentId = keyof typeof COMPONENTS

type MissingKeys<T extends readonly unknown[]> = Exclude<ComponentId, T[number]>

type ExtraKeys<T extends readonly unknown[]> = Exclude<T[number], ComponentId>

type HasDuplicates<T extends readonly unknown[]> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends Rest[number]
    ? First
    : HasDuplicates<Rest>
  : never

const createComponentOrder = <T extends readonly unknown[] = []>(
  order: MissingKeys<T> extends never
    ? ExtraKeys<T> extends never
      ? HasDuplicates<T> extends never
        ? T
        : `Error: Duplicate component ID: ${HasDuplicates<T> & string}`
      : `Error: Invalid component ID: ${ExtraKeys<T> & string}`
    : `Error: Missing component IDs: ${MissingKeys<T> & string}`
): T => {
  return order as T
}

export const COMPONENTS_ORDER = createComponentOrder([
  "toc",
  "details",
  "images-and-embeds",
  "collapsible-toolbar",
  "publish-button",
  "dock-component",
  "carousel-component",
  "stacking-cards",
  "swipeable-cards",
] as const)

import { PageMetasProps } from "@/components/PageMetas/PageMetas";
import { VideoSourcesWithoutSlowVersions } from "@/components/VideoPlayer/VideoPlayer";

export const COMPONENTS = {
  toc: {
    video: {
      dark: {
        src: "/media/design-engineering/toc/toc-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/toc/toc-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A Table of content component",
      title: "A table of contents component",
      description:
        "Building a table of contents component, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/table-of-contents",
      image: "/media/design-engineering/toc/og-toc-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  details: {
    video: {
      dark: {
        src: "/media/design-engineering/details/details-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/details/details-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A details (or disclosure) component",
      title: "A details (or disclosure) component",
      description:
        "Building a details (disclosure) component, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/details-disclosure-component",
      image: "/media/design-engineering/details/og-details-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "images-and-embeds": {
    video: {
      dark: {
        src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "Images and embeds",
      title: "Images and embeds component",
      description:
        "Building a Media component supporting images and embeds using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/images-and-embeds",
      image: "/media/design-engineering/images-and-embeds/og-media-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "collapsible-toolbar": {
    video: {
      dark: {
        src: "/media/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A collapsible toolbar",
      title: "A collapsible toolbar component",
      description:
        "Building a collapsible / resizable toolbar using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/collapsible-toolbar",
      image:
        "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "publish-button": {
    video: {
      dark: {
        src: "/media/design-engineering/publish-button/publish-button-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/publish-button/publish-button-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A publish button",
      title: "A publish button component",
      description:
        "Building a publish button component with feedback, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/publish-button",
      image:
        "/media/design-engineering/publish-button/og-publish-button-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "dock-component": {
    video: {
      dark: {
        src: "/media/design-engineering/dock/dock-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/dock/dock-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A macOS inspired dock",
      title: "A macOS inspired dock component",
      description:
        "Building a macOS-like dock component, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/dock-component",
      image: "/media/design-engineering/dock/og-dock-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "carousel-component": {
    video: {
      dark: {
        src: "/media/design-engineering/carousel/carousel-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/carousel/carousel-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A carousel component",
      title: "A carousel component with inertia and momentum scrolling",
      description:
        "Building a scrollable, and swipeable carousel, with momentum scrolling, overscroll and rubber-banding using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/carousel-component",
      image: "/media/design-engineering/carousel/og-carousel-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "stacking-cards": {
    video: {
      dark: {
        src: "/media/design-engineering/stacking-cards/stacking-cards-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/stacking-cards/stacking-cards-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "Rolling stacking cards",
      title: "Rolling stacking cards component",
      description:
        "Building a rolling stacking cards scroll-driven animation with React, TypeScript, and SCSS.",
      url: "/design-engineering/component/stacking-cards",
      image:
        "/media/design-engineering/stacking-cards/og-stacking-cards-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "swipeable-cards": {
    video: {
      dark: {
        src: "/media/design-engineering/swipeable-cards/swipeable-cards-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/swipeable-cards/swipeable-cards-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "Swipeable cards carousel",
      title: "A swipeable cards carousel component",
      description:
        "Building a swipeable cards stack with React, TypeScript, and SCSS.",
      url: "/design-engineering/component/swipeable-cards",
      image:
        "/media/design-engineering/swipeable-cards/og-swipeable-cards-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "number-flow-input": {
    video: {
      dark: {
        src: "/media/design-engineering/number-flow-input/number-flow-input-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/number-flow-input/number-flow-input-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A Number Flow Input component",
      title: "A number flow input component",
      description:
        "Building a number flow input component with React, TypeScript, and SCSS. Inspired by Number Flow and the Family wallet",
      url: "/design-engineering/component/number-flow-input",
      image:
        "/media/design-engineering/number-flow-input/og-number-flow-input-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "split-flap-display": {
    video: {
      dark: {
        src: "/media/design-engineering/split-flap-display/split-flap-display-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/split-flap-display/split-flap-display-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A split-flap display component",
      title: "A split-flap display component",
      description:
        "Building a realistic split-flap display with, React and css",
      url: "/design-engineering/component/split-flap-display",
      image:
        "/media/design-engineering/split-flap-display/og-split-flap-display-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  slider: {
    video: {
      dark: {
        src: "/media/design-engineering/slider/slider-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/slider/slider-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A slider component",
      title: "A composable headless slider component",
      description:
        "Building a headless and composable slider component with React and Css",
      url: "/design-engineering/component/slider",
      image: "/media/design-engineering/slider/og-slider-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "tilting-tile": {
    video: {
      dark: {
        src: "/media/design-engineering/tilting-tile/tilting-tile-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/tilting-tile/tilting-tile-overview-light.mp4",
        type: "video/mp4",
      },
    },
    metas: {
      shortTitle: "A tilting card with parallax",
      title: "A tilting card component with parallax, just like tvOS",
      description:
        "Building a tvOS inspired tilting card component with parallax using React and Css",
      url: "/design-engineering/component/tilting-tile",
      image: "/media/design-engineering/tilting-tile/og-tilting-tile-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
} as const satisfies Record<
  string,
  {
    metas: PageMetasProps;
    video: VideoSourcesWithoutSlowVersions;
  }
>;

export type ComponentId = keyof typeof COMPONENTS;

type MissingKeys<T extends readonly unknown[]> = Exclude<
  ComponentId,
  T[number]
>;

type ExtraKeys<T extends readonly unknown[]> = Exclude<T[number], ComponentId>;

type HasDuplicates<T extends readonly unknown[]> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends Rest[number]
    ? First
    : HasDuplicates<Rest>
  : never;

const createComponentOrder = <T extends readonly ComponentId[] = []>(
  order: MissingKeys<T> extends never
    ? ExtraKeys<T> extends never
      ? HasDuplicates<T> extends never
        ? T
        : `Error: Duplicate component ID: ${HasDuplicates<T> & string}`
      : `Error: Invalid component ID: ${ExtraKeys<T> & string}`
    : `Error: Missing component IDs: ${MissingKeys<T> & string}`
): T => {
  return order as T;
};

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
  "number-flow-input",
  "split-flap-display",
  "slider",
  "tilting-tile",
] as const);

export const getNextComponent = (currentComponentId: ComponentId) => {
  const componentIndex = COMPONENTS_ORDER.findIndex(
    (id) => id === currentComponentId
  );
  const nextComponentId =
    COMPONENTS_ORDER[componentIndex + 1] ?? COMPONENTS_ORDER[0];
  return COMPONENTS[nextComponentId];
};

export const getPreviousComponent = (currentComponentId: ComponentId) => {
  const componentIndex = COMPONENTS_ORDER.findIndex(
    (id) => id === currentComponentId
  );
  const nextComponentId =
    COMPONENTS_ORDER[componentIndex - 1] ??
    COMPONENTS_ORDER[COMPONENTS_ORDER.length - 1] ??
    COMPONENTS_ORDER[0];
  return COMPONENTS[nextComponentId];
};

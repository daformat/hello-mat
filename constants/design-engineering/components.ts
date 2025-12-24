import { PageMetasProps } from "@/components/PageMetas/PageMetas";
import { VideoSourcesWithoutSlowVersions } from "@/components/VideoPlayer/VideoPlayer";

export const COMPONENTS = {
  toc: {
    shortTitle: "A Table of content component",
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
      title: "Design engineering: a table of contents component",
      description:
        "Building a table of contents component, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/table-of-contents",
      image: "/media/design-engineering/toc/og-toc-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  details: {
    shortTitle: "A details (or disclosure) component",
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
      title: "Design engineering: a details (or disclosure) component",
      description:
        "Building a details (disclosure) component, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/details-disclosure-component",
      image: "/media/design-engineering/details/og-details-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "images-and-embeds": {
    shortTitle: "Images and embeds",
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
      title: "Design engineering: images and embeds",
      description:
        "Building a Media component supporting images and embeds using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/images-and-embeds",
      image: "/media/design-engineering/images-and-embeds/og-media-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "collapsible-toolbar": {
    shortTitle: "A collapsible toolbar",
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
      title: "Design engineering: a collapsible toolbar",
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
    shortTitle: "A publish button",
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
      title: "Design engineering: a publish button",
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
    shortTitle: "A macOS inspired dock",
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
      title: "Design engineering: a dock component",
      description:
        "Building a macOS-like dock component, using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/dock-component",
      image: "/media/design-engineering/dock/og-dock-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "carousel-component": {
    shortTitle: "A carousel component",
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
      title: "Design engineering: a carousel component",
      description:
        "Building a scrollable, and swipeable carousel, with momentum scrolling, overscroll and rubber-banding using React, TypeScript, and SCSS.",
      url: "/design-engineering/component/carousel-component",
      image: "/media/design-engineering/carousel/og-carousel-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
  "stacking-cards": {
    shortTitle: "Rolling stacking cards",
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
      title: "Design engineering: rolling stacking cards",
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
    shortTitle: "Swipeable cards carousel",
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
      title: "Design engineering: a swipeable cards carousel",
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
    shortTitle: "A Number Flow Input component",
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
      title: "Design engineering: a number flow input component",
      description:
        "Building a number flow input component with React, TypeScript, and SCSS. Inspired by Number Flow and the Family wallet",
      url: "/design-engineering/component/number-flow-input",
      image:
        "/media/design-engineering/number-flow-input/og-number-flow-input-light.png",
      imageWidth: 1200,
      imageHeight: 630,
    },
  },
} as const satisfies Record<
  string,
  {
    metas: PageMetasProps;
    shortTitle: string;
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
] as const);

export const getNextComponent = (currentComponentId: ComponentId) => {
  const componentIndex = COMPONENTS_ORDER.findIndex(
    (id) => id === currentComponentId
  );
  const nextComponentId =
    COMPONENTS_ORDER[componentIndex + 1] ?? COMPONENTS_ORDER[0];
  return COMPONENTS[nextComponentId];
};

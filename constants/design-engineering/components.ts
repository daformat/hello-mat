import { PageMetasProps } from "@/components/PageMetas/PageMetas";
import { VideoSourcesWithoutSlowVersions } from "@/components/VideoPlayer/VideoPlayer";

export const COMPONENTS = {
  toc: {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/toc/toc-overview-dark-poster.webp",
      light: "/media/design-engineering/toc/toc-overview-light-poster.webp",
    },
    videoDuration: 8.517,
    metas: {
      shortTitle: "A table of contents component",
      title: "A scroll-aware table of contents in React",
      description:
        "A table of contents built from the headings already in the page, that tracks the one you are reading. React, TypeScript, and SCSS.",
      url: "/design-engineering/table-of-contents",
      image: "/media/design-engineering/toc/og-toc-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-09-14",
      dateModified: "2026-01-15",
    },
  },
  details: {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/details/details-overview-dark-poster.webp",
      light:
        "/media/design-engineering/details/details-overview-light-poster.webp",
    },
    videoDuration: 5.9,
    metas: {
      shortTitle: "A details (or disclosure) component",
      title: "Animating the native details element in React",
      description:
        "Animating a disclosure without giving up the native details element, its keyboard behaviour, or its semantics. React, TypeScript, and SCSS.",
      url: "/design-engineering/details-disclosure-component",
      image: "/media/design-engineering/details/og-details-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-09-16",
      dateModified: "2026-01-15",
    },
  },
  "images-and-embeds": {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-dark-poster.webp",
      light:
        "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-light-poster.webp",
    },
    videoDuration: 27.95,
    metas: {
      shortTitle: "Images and embeds",
      title: "A media component for images, video and embeds",
      description:
        "One component for images, video, and third-party embeds, with loading states you can watch and aspect ratios that hold their space. React, TypeScript, and SCSS.",
      url: "/design-engineering/images-and-embeds",
      image: "/media/design-engineering/images-and-embeds/og-media-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-09-16",
      dateModified: "2026-06-06",
    },
  },
  "collapsible-toolbar": {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-dark-poster.webp",
      light:
        "/media/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-light-poster.webp",
    },
    videoDuration: 11.55,
    metas: {
      shortTitle: "A collapsible toolbar",
      title: "A collapsible, resizable toolbar in React",
      description:
        "A toolbar that measures itself and folds its controls away as the space runs out, without the layout flash that usually comes with it. React, TypeScript, and SCSS.",
      url: "/design-engineering/collapsible-toolbar",
      image:
        "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-09-27",
      dateModified: "2026-01-15",
    },
  },
  "publish-button": {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/publish-button/publish-button-overview-dark-poster.webp",
      light:
        "/media/design-engineering/publish-button/publish-button-overview-light-poster.webp",
    },
    videoDuration: 12.4,
    metas: {
      shortTitle: "A publish button",
      title: "A publish button with real feedback states",
      description:
        "A button that tells you what it is doing: idle, working, done, and failed, with the timings tuned so the feedback reads as honest. React, TypeScript, and SCSS.",
      url: "/design-engineering/publish-button",
      image:
        "/media/design-engineering/publish-button/og-publish-button-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-09-28",
      dateModified: "2026-01-15",
    },
  },
  "dock-component": {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/dock/dock-overview-dark-poster.webp",
      light: "/media/design-engineering/dock/dock-overview-light-poster.webp",
    },
    videoDuration: 7.25,
    metas: {
      shortTitle: "A macOS inspired dock",
      title: "A macOS style dock in React, keyboard included",
      description:
        "The magnification curve behind the macOS dock, rebuilt in React, and made to work for keyboard users as well as for the mouse.",
      url: "/design-engineering/dock-component",
      image: "/media/design-engineering/dock/og-dock-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-10-04",
      dateModified: "2026-01-15",
    },
  },
  "carousel-component": {
    oss: true,
    repo: "https://github.com/daformat/react-headless-carousel",
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/carousel/carousel-overview-dark-poster.webp",
      light:
        "/media/design-engineering/carousel/carousel-overview-light-poster.webp",
    },
    videoDuration: 9.367,
    metas: {
      shortTitle: "A carousel component",
      title: "React carousel with momentum and rubber banding",
      description:
        "A headless, zero-dependency carousel: momentum scrolling, overscroll and rubber-banding, snapping, looping, and autoplay, with none of the styling decided for you.",
      url: "/design-engineering/carousel-component",
      image: "/media/design-engineering/carousel/og-carousel-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-10-11",
      dateModified: "2026-07-28",
    },
  },
  "stacking-cards": {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/stacking-cards/stacking-cards-overview-dark-poster.webp",
      light:
        "/media/design-engineering/stacking-cards/stacking-cards-overview-light-poster.webp",
    },
    videoDuration: 13.334,
    metas: {
      shortTitle: "Rolling stacking cards",
      title: "Rolling stacked cards, a scroll-driven animation",
      description:
        "Cards that roll and stack as the page scrolls, built on scroll-driven animations with React, TypeScript, and SCSS.",
      url: "/design-engineering/stacking-cards",
      image:
        "/media/design-engineering/stacking-cards/og-stacking-cards-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-10-19",
      dateModified: "2026-01-15",
    },
  },
  "swipeable-cards": {
    oss: true,
    repo: "https://github.com/daformat/react-swipeable-cards",
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/swipeable-cards/swipeable-cards-overview-dark-poster.webp",
      light:
        "/media/design-engineering/swipeable-cards/swipeable-cards-overview-light-poster.webp",
    },
    videoDuration: 11.35,
    metas: {
      shortTitle: "Swipeable cards carousel",
      title: "A headless swipeable card stack in React",
      description:
        "A card stack you can throw in any direction you allow, with configurable swipe axes and spring-back. Zero dependencies, React and TypeScript.",
      url: "/design-engineering/swipeable-cards",
      image:
        "/media/design-engineering/swipeable-cards/og-swipeable-cards-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-10-19",
      dateModified: "2026-05-09",
    },
  },
  "number-flow-input": {
    oss: true,
    repo: "https://github.com/daformat/react-number-flow-input",
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/number-flow-input/number-flow-input-overview-dark-poster.webp",
      light:
        "/media/design-engineering/number-flow-input/number-flow-input-overview-light-poster.webp",
    },
    videoDuration: 19.967,
    metas: {
      shortTitle: "A Number Flow Input component",
      title: "An animated number input in React",
      description:
        "A number input whose digits roll as the value changes, in the spirit of Number Flow and the Family wallet, built with React and TypeScript.",
      url: "/design-engineering/number-flow-input",
      image:
        "/media/design-engineering/number-flow-input/og-number-flow-input-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-12-20",
      dateModified: "2026-05-23",
    },
  },
  "split-flap-display": {
    oss: true,
    repo: "https://github.com/daformat/react-split-flap-display",
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/split-flap-display/split-flap-display-overview-dark-poster.webp",
      light:
        "/media/design-engineering/split-flap-display/split-flap-display-overview-light-poster.webp",
    },
    videoDuration: 9.75,
    metas: {
      shortTitle: "A split-flap display component",
      title: "A realistic split-flap display in React",
      description:
        "A departure board that flips like the real thing, down to the half-card overlap and the per-flap timing. React and TypeScript.",
      url: "/design-engineering/split-flap-display",
      image:
        "/media/design-engineering/split-flap-display/og-split-flap-display-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2025-12-20",
      dateModified: "2026-05-12",
    },
  },
  slider: {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/slider/slider-overview-dark-poster.webp",
      light:
        "/media/design-engineering/slider/slider-overview-light-poster.webp",
    },
    videoDuration: 6.617,
    metas: {
      shortTitle: "A slider component",
      title: "A headless, composable slider in React and CSS",
      description:
        "A slider assembled from composable parts rather than one prop-heavy component, so the markup and the styling stay yours. React and CSS.",
      url: "/design-engineering/slider",
      image: "/media/design-engineering/slider/og-slider-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2026-01-07",
      dateModified: "2026-05-30",
    },
  },
  "tilting-tile": {
    oss: false,
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
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/tilting-tile/tilting-tile-overview-dark-poster.webp",
      light:
        "/media/design-engineering/tilting-tile/tilting-tile-overview-light-poster.webp",
    },
    videoDuration: 10.367,
    metas: {
      shortTitle: "A tilting card with parallax",
      title: "A tvOS style tilting card with parallax",
      description:
        "The tvOS poster effect: layered artwork, parallax as the card tilts, and a highlight that follows the pointer. React and CSS.",
      url: "/design-engineering/tilting-tile",
      image: "/media/design-engineering/tilting-tile/og-tilting-tile-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2026-01-12",
      dateModified: "2026-03-14",
    },
  },
  "subtitles-app": {
    oss: false,
    video: {
      dark: {
        src: "/media/design-engineering/subtitles/subtitles-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/subtitles/subtitles-overview-light.mp4",
        type: "video/mp4",
      },
    },
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/subtitles/subtitles-overview-dark-poster.webp",
      light:
        "/media/design-engineering/subtitles/subtitles-overview-light-poster.webp",
    },
    videoDuration: 43.8,
    metas: {
      shortTitle: "The demo for my Subtitles app",
      title: "A product demo built entirely in CSS",
      description:
        "A looping product demo with no video file in it: three fake macOS windows, a caption overlay that types itself out, and an app switch that happens mid-sentence.",
      url: "/design-engineering/subtitles-app",
      image: "/media/design-engineering/subtitles/og-subtitles-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2026-08-16",
      dateModified: "2026-08-20",
    },
  },
  "contrast-colors": {
    oss: true,
    repo: "https://github.com/daformat/contrast-color",
    video: {
      dark: {
        src: "/media/design-engineering/contrast/contrast-overview-dark.mp4",
        type: "video/mp4",
      },
      light: {
        src: "/media/design-engineering/contrast/contrast-overview-light.mp4",
        type: "video/mp4",
      },
    },
    // The video's own first frame, at the video's exact dimensions, so
    // the still and the first painted frame are the same image.
    poster: {
      dark: "/media/design-engineering/contrast/contrast-overview-dark-poster.webp",
      light:
        "/media/design-engineering/contrast/contrast-overview-light-poster.webp",
    },
    videoDuration: 6.917,
    metas: {
      shortTitle: "Contrast, without losing your colour",
      title: "Contrast colours: keep the hue, move the lightness",
      description:
        "Black or white ink is the easy half of contrast. The harder half is taking a colour you chose and finding the nearest readable version of it: same hue, same chroma, only the lightness moved.",
      url: "/design-engineering/contrast-colors",
      image: "/media/design-engineering/contrast/og-contrast-light.png",
      imageWidth: 1200,
      imageHeight: 630,
      datePublished: "2026-08-18",
      dateModified: "2026-08-18",
    },
  },
} as const satisfies Record<string, Component>;

export type Component = {
  oss?: boolean;
  /** Public repository, when there is one. Feeds the SoftwareSourceCode schema. */
  repo?: string;
  metas: PageMetasProps;
  video: VideoSourcesWithoutSlowVersions;
  /** Still frame per theme, painted before the video loads. */
  poster: { dark: string; light: string };
  /** Seconds, from ffprobe. Feeds the VideoObject schema. */
  videoDuration: number;
};
export type ComponentId = keyof typeof COMPONENTS;

/**
 * Sideways links between pages that share a problem, rather than the strictly
 * chronological previous / next pair. Kept out of COMPONENTS itself so the ids
 * can be type-checked against it without the type referencing itself.
 */
export const COMPONENT_RELATIONS = {
  toc: ["details", "collapsible-toolbar", "stacking-cards"],
  details: ["toc", "publish-button", "collapsible-toolbar"],
  "images-and-embeds": ["carousel-component", "tilting-tile", "details"],
  "collapsible-toolbar": ["dock-component", "toc", "publish-button"],
  "publish-button": ["details", "number-flow-input", "collapsible-toolbar"],
  "dock-component": ["collapsible-toolbar", "tilting-tile", "slider"],
  "carousel-component": ["swipeable-cards", "slider", "stacking-cards"],
  "stacking-cards": ["carousel-component", "swipeable-cards", "tilting-tile"],
  "swipeable-cards": ["carousel-component", "stacking-cards", "slider"],
  "number-flow-input": ["split-flap-display", "slider", "publish-button"],
  "split-flap-display": [
    "number-flow-input",
    "stacking-cards",
    "contrast-colors",
  ],
  slider: ["carousel-component", "number-flow-input", "swipeable-cards"],
  "tilting-tile": ["stacking-cards", "dock-component", "images-and-embeds"],
  "subtitles-app": ["contrast-colors", "tilting-tile", "images-and-embeds"],
  "contrast-colors": [
    "subtitles-app",
    "split-flap-display",
    "images-and-embeds",
  ],
} as const satisfies Record<ComponentId, readonly ComponentId[]>;

export const getRelatedComponents = (
  currentComponentId: ComponentId
): { id: ComponentId; component: Component }[] =>
  COMPONENT_RELATIONS[currentComponentId].map((id) => ({
    id,
    component: COMPONENTS[id],
  }));

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
  "subtitles-app",
  "contrast-colors",
] as const);

export const getNextComponent = (
  currentComponentId: ComponentId
): Component => {
  const componentIndex = COMPONENTS_ORDER.findIndex(
    (id) => id === currentComponentId
  );
  const nextComponentId =
    COMPONENTS_ORDER[componentIndex + 1] ?? COMPONENTS_ORDER[0];
  return COMPONENTS[nextComponentId];
};

export const getPreviousComponent = (
  currentComponentId: ComponentId
): Component => {
  const componentIndex = COMPONENTS_ORDER.findIndex(
    (id) => id === currentComponentId
  );
  const nextComponentId =
    COMPONENTS_ORDER[componentIndex - 1] ??
    COMPONENTS_ORDER[COMPONENTS_ORDER.length - 1] ??
    COMPONENTS_ORDER[0];
  return COMPONENTS[nextComponentId];
};

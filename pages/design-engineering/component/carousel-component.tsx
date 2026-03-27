import { Carousel } from "@daformat/react-headless-carousel";
import { GetStaticProps } from "next";
import Link from "next/link";
import {
  ComponentPropsWithoutRef,
  CSSProperties,
  MouseEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { IoChevronDownOutline } from "react-icons/io5";
import { codeToHtml } from "shiki";

import { Dropdown } from "@/components/ButtonGroup/Dropdown/Dropdown";
import { DropdownItem } from "@/components/ButtonGroup/Dropdown/DropdownItem";
import styles from "@/components/Carousel/Carousel.module.scss";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";

interface CodeBlocks {
  highlightedCode: string;
}

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const codeSnippet = `
{/* Provides context to the carousel components */}
<Carousel.Root>
  {/* The scrollable area */}
  <Carousel.Viewport>
    {/* The container for the items */}
    <Carousel.Content>
      {/* A carousel item */}
      <Carousel.Item />
      <Carousel.Item />
      <Carousel.Item />
    </Carousel.Content>
  </Carousel.Viewport>
  {/* The pagination buttons */}
  <Carousel.PrevPage />
  <Carousel.NextPage />
</Carousel.Root>
  `.trim();
  const highlightedCode = await codeToHtml(codeSnippet, {
    lang: "tsx",
    themes: {
      light: "vitesse-light",
      dark: "houston",
    },
    tabindex: false,
  });

  return {
    props: {
      highlightedCode,
    },
  };
};

const componentId: ComponentId = "carousel-component";

const CarouselComponentPage = (props: CodeBlocks) => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <CarouselComponentPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const images: { light: string; dark: string }[] = [
  {
    light: "/media/hello-mat-light.png",
    dark: "/media/hello-mat-dark.png",
  },
  {
    light: "/media/design-engineering/details/og-details-light.png",
    dark: "/media/design-engineering/details/og-details-dark.png",
  },
  {
    light: "/media/design-engineering/images-and-embeds/og-media-light.png",
    dark: "/media/design-engineering/images-and-embeds/og-media-dark.png",
  },
  {
    light:
      "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
    dark: "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png",
  },
  {
    light:
      "/media/design-engineering/publish-button/og-publish-button-light.png",
    dark: "/media/design-engineering/publish-button/og-publish-button-dark.png",
  },
  {
    light: "/media/design-engineering/dock/og-dock-light.png",
    dark: "/media/design-engineering/dock/og-dock-dark.png",
  },
  {
    light: "/media/hello-mat-light.png",
    dark: "/media/hello-mat-dark.png",
  },
  {
    light: "/media/design-engineering/details/og-details-light.png",
    dark: "/media/design-engineering/details/og-details-dark.png",
  },
  {
    light: "/media/design-engineering/images-and-embeds/og-media-light.png",
    dark: "/media/design-engineering/images-and-embeds/og-media-dark.png",
  },
  {
    light:
      "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
    dark: "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png",
  },
  {
    light:
      "/media/design-engineering/publish-button/og-publish-button-light.png",
    dark: "/media/design-engineering/publish-button/og-publish-button-dark.png",
  },
  {
    light: "/media/design-engineering/dock/og-dock-light.png",
    dark: "/media/design-engineering/dock/og-dock-dark.png",
  },
];

const Button = ({ children, style, onClick, ...props }: ComponentPropsWithoutRef<'button'>) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const triggerFeedback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowFeedback(true);
    timeoutRef.current = setTimeout(() => {
      setShowFeedback(false);
    }, 1500);
  }, []);

  const handleClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    async (event) => {
      onClick?.(event);
      const img = buttonRef.current?.querySelector("img");
      const darkSource = buttonRef.current?.querySelector(
        "source[media='(prefers-color-scheme: dark)']"
      ) as HTMLSourceElement | null;
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const src = isDark && darkSource?.srcset ? darkSource.srcset : img?.src;
      if (src) {
        try {
          // Pass the Promise directly so clipboard.write() is called synchronously
          // within the user gesture — required by Safari.
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": fetch(src).then((r) => r.blob()),
            }),
          ]);
        } catch {
          // clipboard write not supported or failed, skip feedback
          return;
        }
      } else {
        const text = buttonRef.current?.textContent ?? "";
        await navigator.clipboard.writeText(text);
      }
      triggerFeedback();
    },
    [triggerFeedback, onClick]
  );

  return (
    <button
      ref={buttonRef}
      style={{ position: "relative", display: "block", ...style }}
      onClick={handleClick}
      tabIndex={0}
      {...props}
    >
      {children}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {showFeedback ? "Copied!" : ""}
      </span>
      <span
        aria-hidden="true"
        className={styles.feedback}
        style={{
          scale: showFeedback ? 1 : 0.7,
          opacity: showFeedback ? 1 : 0,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 7.5L6 10.5L10.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDashoffset: showFeedback ? "0" : "100%" }}
          />
        </svg>
      </span>
    </button>
  );
};

const CarouselComponentPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0.7);
  const [contentFade, setContentFade] = useState(true);
  const [snap, setSnap] = useState(true);
  const [snapAlign, setSnapAlign] = useState<"center" | "start" | "end">(
    "center"
  );
  const carouselRef = useRef<HTMLDivElement>(null);
  const restoreSnap = useRef(false);
  useCssSizeVariables(carouselRef);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  useLayoutEffect(() => {
    if (restoreSnap.current) {
      setSnap(true);
      restoreSnap.current = false;
    }
  }, [snapAlign, contentFade]);

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-carousel-component">
          Design engineering: a carousel component
        </h1>
        <p>
          A scrollable, and swipeable carousel, even on desktop (complete with
          snapping, friction, rubber-banding and overscroll). Inspired by
          a&nbsp;component made at{" "}
          <a href="https://finary.com" target="_blank" rel="noopener">
            Finary
          </a>
          , a one-stop shop for wealth management. Play with the component, and
          try changing the card size.
        </p>
        <section
          ref={carouselRef}
          className={styles.wrapper}
          style={{ marginBottom: 32 }}
        >
          <h1 className="sr_only">Example carousel</h1>
          <a href="#things-to-try" className="sr_only">
            Skip the carousel
          </a>
          <Carousel.Root
            className={styles.carousel}
            data-snap-align={snapAlign}
          >
            <Carousel.Viewport
              contentFade={contentFade}
              className={styles.carousel_viewport}
              scrollSnapType={snap ? "x mandatory" : "none"}
              style={
                {
                  "--margin-inline": "-12px",
                  [Carousel.CSS_VARS
                    .fadeOffsetBackwards]: `min(var(${Carousel.CSS_VARS.remainingBackwards}, 0px) + var(--margin-inline), var(--margin-inline) * -1)`,
                  [Carousel.CSS_VARS
                    .fadeOffsetForwards]: `min(var(${Carousel.CSS_VARS.remainingForwards}, 0px) + var(--margin-inline), var(--margin-inline) * -1)`,
                  marginInline: "var(--margin-inline)",
                } as CSSProperties
              }
            >
              <Carousel.Content className={styles.carousel_content}>
                {images.map((image, index) => (
                  <Carousel.Item key={index} className={styles.carousel_item}>
                    <Button aria-label={`Copy image ${index + 1}`}>
                      <picture
                        style={
                          { fontSize: 0, "--size": `${size}` } as CSSProperties
                        }
                        className={styles.card}
                      >
                        <source
                          media="(prefers-color-scheme: dark)"
                          srcSet={image.dark}
                        />
                        <img
                          src={image.light}
                          alt=""
                          style={{ aspectRatio: "1200 / 630" }}
                        />
                      </picture>
                    </Button>
                  </Carousel.Item>
                ))}
              </Carousel.Content>
            </Carousel.Viewport>
            <div className={styles.legend_and_controls}>
              <div className={styles.title_and_slider}>
                <strong style={{ margin: 0 }}>Scroll or swipe</strong>
                <div className={styles.slider}>
                  <label htmlFor="size">
                    <small>Card size</small>
                  </label>
                  <input
                    name="size"
                    type="range"
                    min={0}
                    max={1}
                    value={size}
                    step={0.01}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                    }}
                    style={
                      {
                        "--value": `${size * 100}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              </div>
              <div className={styles.controls}>
                <Carousel.PrevPage className={styles.button} aria-label="Previous">
                  <FaChevronLeft size={12} />
                </Carousel.PrevPage>
                <Carousel.NextPage className={styles.button} aria-label="Next">
                  <FaChevronRight size={12} />
                </Carousel.NextPage>
              </div>
            </div>
            <div
              className={styles.legend_and_controls + " card"}
              style={{ marginTop: 12, paddingBlock: 10, paddingInline: 12 }}
            >
              <div
                style={{
                  display: "flex",
                  columnGap: 16,
                  flexWrap: "wrap",
                  rowGap: 8,
                }}
              >
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Checkbox
                    checked={contentFade}
                    onChange={(event) => {
                      setSnap((prev) => {
                        if (prev) {
                          restoreSnap.current = true;
                        }
                        return false;
                      });
                      setContentFade(event.target.checked);
                    }}
                  />
                  <small style={{ opacity: 0.8 }}>Content fade</small>
                </label>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Checkbox
                    checked={snap}
                    onChange={(event) => setSnap(event.target.checked)}
                  />
                  <small style={{ opacity: 0.8 }}>Snap</small>
                </label>
                <Dropdown
                  trigger={
                    <button className={"button"}>
                      {snapAlign}{" "}
                      {contentFade && snapAlign !== "center" ? "(+ fade)" : ""}
                      <IoChevronDownOutline />
                    </button>
                  }
                >
                  <DropdownItem
                    onSelect={() => {
                      restoreSnap.current = true;
                      setSnap(false);
                      setSnapAlign("center");
                    }}
                  >
                    Center
                  </DropdownItem>
                  <DropdownItem
                    onSelect={() => {
                      restoreSnap.current = true;
                      setSnap(false);
                      setSnapAlign("start");
                    }}
                  >
                    Start {contentFade ? "(+ fade)" : ""}
                  </DropdownItem>
                  <DropdownItem
                    onSelect={() => {
                      restoreSnap.current = true;
                      setSnap(false);
                      setSnapAlign("end");
                    }}
                  >
                    End {contentFade ? "(+ fade)" : ""}
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
          </Carousel.Root>
        </section>
        <h2 id="things-to-try">Things to try</h2>
        <h3 id="momentum-scrolling">Momentum scrolling</h3>
        <p>
          Of course you can scroll the regular way, but you can also drag to
          swipe the carousel. On most browsers (cough cough, Safari...) dragging
          to swipe will respect the css <code>scroll-snap-align</code>. When you
          drag to swipe, we use a custom momentum scrolling implementation when
          needed (desktop browsers). The greater the velocity, the further the
          carousel will scroll.
        </p>
        <h3 id="overscroll">Overscroll / rubber-banding</h3>
        <p>
          When dragging to swipe, if you give it enough velocity the carousel
          will overscroll, with a rubber-banding effect, similar to the one you
          get on touch devices by default. For this to work, we calculate a
          velocity based on how fast you are moving your mouse and apply a
          deceleration factor. When yous scrolled to the start of the end of the
          carousel, you can also trigger the rubber-banding effect by dragging
          the carousel even more.
        </p>
        <h3 id="Pagination">Pagination</h3>
        <p>
          The carousel can be paginated, using the dedicated buttons, pagination
          is based on the <code>scroll-snap-align</code> set in css. Pagination
          accounts for the fade mask if any, or whatever offset is returned by
          the <code>boundaryOffset</code>, this allows to ensure the next item
          is always fully visible, instead of being partially masked, ensuring
          better pagination.
        </p>
        <h3 id="snapping">Snapping</h3>
        <p>
          You can play withe the demo controls to change the snapping. Thanks to
          the css styles, the carousel items will snap naturally when performing
          a regular scroll. But when you drag to scroll on desktop, this
          behavior is not a given. You have to implement it yourself by
          adjusting the deceleration factor for the velocity, so that the
          velocity reaches 0 towards the snap point. Snapping is also respected
          when using pagination or whn tabbing.
        </p>
        <h3 id="tabbing">Tabbing through the carousel items</h3>
        <p>
          Full support for tabbing through the carousel items, provided the
          items contain tabbable content. Here again, when tabbing through, the
          carousel fully enforces the desired <code>scroll-snap-align</code> and
          makes sure the tabbed item is fully visible instead of being partially
          hidden by the mask, or if you choose to render the prev / next buttons
          on top of the carousel, you cqn provide a custom{" "}
          <code>boundaryOffset</code> function to account for these.
        </p>
        <h3 id="scroll-fade">Scroll fade</h3>
        <p>
          Most scroll fades only animate the opacity when you reach the edges of
          the scroll area. Instead of doing this, I decided to animate the
          length of the mask based on the remaining scroll distance. This way,
          the fading effect is more natural, and the transition is smoother. As
          you approach the edges, the mask smoothly updates.
        </p>
        <h2 id="component-strucutre">Component structure</h2>
        <div dangerouslySetInnerHTML={{ __html: props.highlightedCode }} />
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          While implementing the basic version of the carousel is easy, thanks
          to modern css, implementing momentum scrolling with snapping and
          overscroll / rubber-banding on desktop isn’t trivial. Maybe I’ll try
          to enable infinite scrolling at some point, but for now, this is a
          good start.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default CarouselComponentPage;

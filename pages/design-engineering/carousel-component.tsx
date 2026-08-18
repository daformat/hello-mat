import { Carousel } from "@daformat/react-headless-carousel";
import { GetStaticProps } from "next";
import Link from "next/link";
import {
  ComponentProps,
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
import { BundledLanguage, BundledTheme, CodeToHastOptions, codeToHtml, } from "shiki";

import { Dropdown } from "@/components/ButtonGroup/Dropdown/Dropdown";
import { DropdownItem } from "@/components/ButtonGroup/Dropdown/DropdownItem";
import styles from "@/components/Carousel/Carousel.module.scss";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { ComponentId, COMPONENTS, } from "@/constants/design-engineering/components";
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";

interface CodeBlocks {
  highlightedCode: string;
  installInstructionsNpm: string;
  installInstructionsYarn: string;
  installInstructionsPnpm: string;
  installInstructionsBun: string;
  installInstructionsDeno: string;
}

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const getOptions = (
    lang: BundledLanguage
  ): CodeToHastOptions<BundledLanguage, BundledTheme> => ({
    lang,
    themes: {
      light: "vitesse-light",
      dark: "houston",
    },
    tabindex: false,
  });

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
  const highlightedCode = await codeToHtml(codeSnippet, getOptions("tsx"));

  const installInstructionsSourceNpm = `
npm install @daformat/react-headless-carousel
  `.trim();
  const installInstructionsNpm = await codeToHtml(
    installInstructionsSourceNpm,
    getOptions("bash")
  );

  const installInstructionsSourceYarn = `
yarn add @daformat/react-headless-carousel
  `.trim();
  const installInstructionsYarn = await codeToHtml(
    installInstructionsSourceYarn,
    getOptions("bash")
  );

  const installInstructionsSourcePnpm = `
pnpm add @daformat/react-headless-carousel
  `.trim();
  const installInstructionsPnpm = await codeToHtml(
    installInstructionsSourcePnpm,
    getOptions("bash")
  );

  const installInstructionsSourceBun = `
bun add @daformat/react-headless-carousel
  `.trim();
  const installInstructionsBun = await codeToHtml(
    installInstructionsSourceBun,
    getOptions("bash")
  );

  const installInstructionsSourceDeno = `
deno add npm:@daformat/react-headless-carousel
  `.trim();
  const installInstructionsDeno = await codeToHtml(
    installInstructionsSourceDeno,
    getOptions("bash")
  );

  return {
    props: {
      highlightedCode,
      installInstructionsNpm,
      installInstructionsYarn,
      installInstructionsPnpm,
      installInstructionsBun,
      installInstructionsDeno,
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

const Button = ({
  children,
  style,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) => {
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const lastFeedbackRef = useRef<"success" | "error">("success");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const triggerFeedback = useCallback((type: "success" | "error") => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastFeedbackRef.current = type;
    setFeedback(type);
    timeoutRef.current = setTimeout(() => {
      setFeedback(null);
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
          // within the user gesture (required by Safari).
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": fetch(src).then((r) => r.blob()),
            }),
          ]);
        } catch {
          triggerFeedback("error");
          return;
        }
      } else {
        try {
          const text = buttonRef.current?.textContent ?? "";
          await navigator.clipboard.writeText(text);
        } catch {
          triggerFeedback("error");
          return;
        }
      }
      triggerFeedback("success");
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
        {feedback === "success" ? "Copied!" : ""}
      </span>
      <span
        role="alert"
        aria-live="assertive"
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
        {feedback === "error" ? "Failed to copy" : ""}
      </span>
      <span
        aria-hidden="true"
        className={`${styles.feedback} ${
          lastFeedbackRef.current === "error" ? styles.feedback_error : ""
        }`}
        style={{
          scale: feedback !== null ? 1 : 0.7,
          opacity: feedback !== null ? 1 : 0,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {lastFeedbackRef.current === "error" ? (
            <>
              <path
                d="M3.5 3.5L10.5 10.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ strokeDashoffset: feedback !== null ? "0" : "100%" }}
              />
              <path
                d="M10.5 3.5L3.5 10.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ strokeDashoffset: feedback !== null ? "0" : "100%" }}
              />
            </>
          ) : (
            <path
              d="M3.5 7.5L6 10.5L10.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeDashoffset: feedback !== null ? "0" : "100%" }}
            />
          )}
        </svg>
      </span>
    </button>
  );
};

const CarouselComponentPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0.7);
  const [contentFade, setContentFade] = useState(true);
  const [loop, setLoop] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [autoplayMode, setAutoplayMode] = useState<
    "item" | "page" | "continuous"
  >("item");
  const [snap, setSnap] = useState(true);
  const [snapAlign, setSnapAlign] = useState<"center" | "start" | "end">(
    "center"
  );
  const carouselRef = useRef<HTMLDivElement>(null);
  const restoreSnap = useRef(false);
  useCssSizeVariables(carouselRef);
  useCssSizeVariables(deckRef);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  const autoplayOptions =
    autoplayMode === "continuous"
      ? ({
          mode: "continuous",
          atEnd: "reverse",
          pauseAtEnd: 1500,
        } as ComponentProps<typeof Carousel.Root>["autoplay"])
      : ({ mode: autoplayMode } as ComponentProps<
          typeof Carousel.Root
        >["autoplay"]);

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
          A headless, zero-dependency, scrollable, and swipeable carousel, even
          on desktop (complete with snapping, friction, rubber-banding and
          overscroll). Inspired by a&nbsp;component made at{" "}
          <a href="https://finary.com" target="_blank" rel="noopener">
            Finary
          </a>
          , a one-stop shop for wealth management. Play with the component, and
          try changing the card size. See{" "}
          <a href="#install">install instructions</a>.
        </p>
        <section
          ref={carouselRef}
          className={styles.demo}
          style={{ marginBottom: 32 }}
        >
          <h1 className="sr_only">Example carousel</h1>
          <a href="#things-to-try" className="sr_only">
            Skip the carousel
          </a>
          <Carousel.Root
            className={styles.carousel}
            data-snap-align={snapAlign}
            loop={loop}
            autoplay={autoplay ? autoplayOptions : false}
          >
            <Carousel.Viewport
              contentFade={contentFade}
              className={styles.carousel_viewport}
              scrollSnapType={snap ? "x mandatory" : undefined}
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
                <Carousel.PrevPage
                  className={styles.button}
                  aria-label="Previous"
                >
                  <FaChevronLeft size={12} />
                </Carousel.PrevPage>
                <Carousel.NextPage
                  className={styles.button}
                  aria-label="Next"
                >
                  <FaChevronRight size={12} />
                </Carousel.NextPage>
              </div>
            </div>
          </Carousel.Root>
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
                  checked={loop}
                  onChange={(event) => {
                    setLoop(event.target.checked);
                  }}
                />
                <small style={{ opacity: 0.8 }}>Loop</small>
              </label>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Checkbox
                  checked={autoplay}
                  onChange={(event) => {
                    setAutoplay(event.target.checked);
                  }}
                />
                <small style={{ opacity: 0.8 }}>Autoplay</small>
              </label>
              {autoplay ? (
                <Dropdown
                  trigger={
                    <button className={"button"}>
                      {autoplayMode}
                      <IoChevronDownOutline />
                    </button>
                  }
                >
                  <DropdownItem onSelect={() => setAutoplayMode("item")}>
                    Item
                  </DropdownItem>
                  <DropdownItem onSelect={() => setAutoplayMode("page")}>
                    Page
                  </DropdownItem>
                  <DropdownItem onSelect={() => setAutoplayMode("continuous")}>
                    Continuous
                  </DropdownItem>
                </Dropdown>
              ) : null}
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
        </section>

        <h2 id="more-demos">More demos</h2>
        <p>
          The good thing is, this carousel is fully native, headless, and
          scroll-driven, so you can get creative with scroll driven animations
          too,{" "}
          <a
            href="https://developer.mozilla.org/fr/docs/Web/CSS/Reference/Properties/view-timeline"
            target="_blank"
            rel="noopener noreferrer"
          >
            provided your browser supports them
          </a>{" "}
          (all major browsers support them, except Firefox), here are some
          examples from the awesome{" "}
          <a
            href="https://www.blossom-carousel.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            blossom carousel library
          </a>
          , which is very similar to this one:
        </p>

        <div ref={deckRef}>
          <Tabs
            defaultValue="coverflow"
            tabs={[
              {
                id: "coverflow",
                trigger: "Coverflow carousel",
                content: (
                  <section
                    className={styles.advanced1}
                    style={
                      { "--size": `${1}`, marginBlock: 24 } as CSSProperties
                    }
                  >
                    <Carousel.Root
                      className={styles.carousel}
                      data-snap-align={"center"}
                    >
                      <Carousel.Viewport
                        contentFade={true}
                        className={styles.carousel_viewport}
                        scrollSnapType="x mandatory"
                      >
                        <Carousel.Content className={styles.carousel_content}>
                          {images.map((image, index) => (
                            <Carousel.Item
                              key={index}
                              className={styles.carousel_item}
                            >
                              <div
                                className={styles.slide}
                                style={{
                                  position: "absolute",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                              >
                                <picture
                                  style={{ fontSize: 0 } as CSSProperties}
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
                              </div>
                            </Carousel.Item>
                          ))}
                        </Carousel.Content>
                      </Carousel.Viewport>
                    </Carousel.Root>
                  </section>
                ),
              },
              {
                id: "smart-stack",
                trigger: "iOS smart stack",
                content: (
                  <section
                    className={styles.advanced2}
                    style={
                      { "--size": `${1}`, marginBlock: 24 } as CSSProperties
                    }
                  >
                    <Carousel.Root
                      className={styles.carousel}
                      data-snap-align={"center"}
                    >
                      <Carousel.Viewport
                        contentFade={false}
                        className={styles.carousel_viewport}
                        scrollSnapType={"x mandatory"}
                      >
                        <Carousel.Content
                          className={styles.carousel_content}
                          style={{ width: "initial" }}
                        >
                          {images.map((image, index) => (
                            <Carousel.Item
                              key={index}
                              className={styles.carousel_item}
                            >
                              <div
                                className={styles.slide}
                                style={{
                                  position: "absolute",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                              >
                                <picture
                                  style={{ fontSize: 0 } as CSSProperties}
                                  className={styles.slide_content}
                                >
                                  <source
                                    media="(prefers-color-scheme: dark)"
                                    srcSet={image.dark}
                                  />
                                  <img src={image.light} alt="" />
                                </picture>
                              </div>
                            </Carousel.Item>
                          ))}
                        </Carousel.Content>
                      </Carousel.Viewport>
                    </Carousel.Root>
                  </section>
                ),
              },
              {
                id: "deck",
                trigger: "Deck",
                content: (
                  <section
                    className={styles.advanced3}
                    style={
                      { "--size": `${1}`, marginBlock: 24 } as CSSProperties
                    }
                  >
                    <Carousel.Root
                      className={styles.carousel}
                      data-snap-align={"center"}
                    >
                      <Carousel.Viewport
                        contentFade={true}
                        className={styles.carousel_viewport}
                        scrollSnapType="x mandatory"
                      >
                        <Carousel.Content className={styles.carousel_content}>
                          {images.map((image, index) => (
                            <Carousel.Item
                              key={index}
                              className={styles.carousel_item}
                            >
                              <div
                                className={styles.slide}
                                style={{
                                  position: "absolute",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                              >
                                <picture
                                  style={{ fontSize: 0 } as CSSProperties}
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
                              </div>
                            </Carousel.Item>
                          ))}
                        </Carousel.Content>
                      </Carousel.Viewport>
                    </Carousel.Root>
                  </section>
                ),
              },
            ]}
          />
        </div>

        <h2 id="install">Install</h2>
        <p>
          Open the repo in{" "}
          <a
            href="https://github.com/daformat/react-headless-carousel"
            target="_blank"
            rel="noopener"
          >
            Github
          </a>{" "}
          (and drop a star if you like it!)
        </p>
        <Tabs
          defaultValue="install-npm"
          tabs={[
            {
              id: "install-npm",
              trigger: (
                <h4 id="install-npm" data-no-toc={""}>
                  npm
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsNpm,
                  }}
                />
              ),
            },
            {
              id: "install-yarn",
              trigger: (
                <h4 id="install-yarn" data-no-toc={""}>
                  yarn
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsYarn,
                  }}
                />
              ),
            },
            {
              id: "install-pnpm",
              trigger: (
                <h4 id="install-pnpm" data-no-toc={""}>
                  pnpm
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsPnpm,
                  }}
                />
              ),
            },
            {
              id: "install-bun",
              trigger: (
                <h4 id="install-bun" data-no-toc={""}>
                  bun
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsBun,
                  }}
                />
              ),
            },
            {
              id: "install-deno",
              trigger: (
                <h4 id="install-deno" data-no-toc={""}>
                  deno
                </h4>
              ),
              content: (
                <div
                  dangerouslySetInnerHTML={{
                    __html: props.installInstructionsDeno,
                  }}
                />
              ),
            },
          ]}
        />

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
        <p>
          How far a click goes is up to you, with a <code>mode</code> on the
          buttons. The default, <code>page</code>, takes the next item the
          viewport was cutting off and brings it fully into view, so nothing
          stays half seen. <code>item</code> steps to the next item along
          instead, whether or not the current one was fully visible, which suits
          a carousel showing one card at a time. And <code>viewport</code> moves
          by exactly what the viewport can show and lets the items fall where
          they may. Autoplay takes the same three names, so a carousel whose
          autoplay steps by item and whose buttons page through it says so in
          the same words.
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
        <h3 id="looping">Looping</h3>
        <p>
          Tick the <em>Loop</em> checkbox and the carousel becomes endless in
          both directions. Under the hood it renders your items three times
          over, plus however many extra copies it takes for one set to be wider
          than a few viewports, then teleports the scroll position back by a
          whole number of copies whenever it gets close to running out. The
          position it leaves and the one it lands on show the exact same pixels,
          so you never see the jump. It starts on your first real item, and
          every copy gets <code>aria-hidden</code> and{" "}
          <code>tabindex=&quot;-1&quot;</code>, so screen readers and the tab
          key skip the copies themselves.
        </p>
        <p>
          That covers each copy, but not what’s inside it. Neither attribute
          reaches a descendant, so a copy holding a button still has that button
          in the tab order. That’s usually what you want: a copy you can see is
          a real part of the carousel as far as you’re concerned, and it stays
          clickable too. It does mean tabbing walks through the copies in DOM
          order, which isn’t the order they come round on screen, so there are
          three bits of help for that:
        </p>
        <ul>
          <li>
            <strong>Tabbing in goes to what you can see.</strong> The first
            thing in the tab order lives in the very first copy, right back at
            the start of the content, and going to fetch it would sweep the
            carousel all the way there. So the focus is handed to the first
            fully visible item instead, and nothing moves. Shift-tabbing in
            takes the last visible one.
          </li>
          <li>
            <strong>Tabbing on never doubles back.</strong> When the next
            element in the tab order sits a long way behind you, the carousel
            jumps whole copies towards it first. Both sides of that jump show
            the same pixels, so you never see the distance, and the small
            remainder is animated in the direction you were already tabbing. If
            the scroll can’t go that way because there’s no more content on that
            side, the focus goes to the copy already within reach and the
            carousel stays put.
          </li>
          <li>
            <strong>The focus ring follows the jump.</strong> A teleport carries
            whatever was focused inside a copy off screen with it, so the focus
            moves to the copy that took its place. Without that, the outline
            looks like it vanishes a moment after you tab.
          </li>
        </ul>
        <p>
          All three are keyboard only. Clicking still focuses whatever you
          clicked, copy or not.
        </p>
        <p>
          <strong>
            Looping and snapping are a best-effort pairing though.
          </strong>{" "}
          Every browser drives a wheel scroll towards a snap point it picks when
          the gesture starts, and none of them take kindly to the scroll
          position moving underneath: Chromium scrolls back to the item it had
          chosen, Safari swallows the rest of the momentum without applying it,
          and Firefox drops the snap it was about to make. So when a wrap
          disturbs a scroll, the carousel takes snapping off the browser for the
          rest of that gesture and applies it itself once everything stops,
          animating to the position your <code>scroll-snap-type</code> asks for.
          Chromium commits to its target early enough that the whole gesture has
          to run that way. Dragging is unaffected, since it has always managed
          its own snapping. So the carousel still lands on a snap point every
          time it comes to rest, but exactly <em>how</em> it gets there varies
          by engine, and a very long fling can still show a seam. If you need
          snapping to be exact under all circumstances, leave looping off.
        </p>
        <h3 id="autoplay">Autoplay</h3>
        <p>
          Tick <em>Autoplay</em> and the carousel scrolls on its own. The
          dropdown next to it switches between the modes below. Passing{" "}
          <code>autoplay</code> on its own steps to the next item every three
          seconds, or you can pass an object to choose how it moves:{" "}
          <code>mode</code> is any of the three the arrows take,{" "}
          <code>item</code>, <code>page</code> or <code>viewport</code>, plus{" "}
          <code>continuous</code>, which scrolls at a steady speed without
          stopping on items. Stepping takes an <code>interval</code> in
          milliseconds, a continuous scroll takes a <code>speed</code> in pixels
          per second, and both can go <code>backwards</code>. A carousel that
          does not loop also gets to say what happens when it runs out of
          content with <code>atEnd</code>: go back to the beginning, turn around
          and play back the way it came, or simply stop, with an optional pause
          at each end before it does.
        </p>
        <p>
          It also knows when to get out of the way. It pauses while your pointer
          is over the carousel and while focus is inside it, and it stands aside
          while a wheel gesture’s momentum is still running, or while the tab is
          in the background. Hovering and focusing both assume a mouse or a
          keyboard though, and touch is neither, so scrolling and dragging pause
          it too. It picks up again a second and a half after the carousel has
          come to rest, which is later than when you let go: a flick hands over
          to momentum, and the browser may still have snapping to do. That delay
          is <code>pauseOnInteraction</code> in milliseconds, and{" "}
          <code>false</code> keeps it playing throughout.
        </p>
        <h3 id="reduced-motion">Reduced motion</h3>
        <p>
          A carousel sweeps a good part of the screen sideways, which is the
          kind of movement <code>prefers-reduced-motion: reduce</code> exists
          for, so it is respected by default in the two places the carousel
          moves of its own accord. Autoplay doesn’t run at all, rather than
          merely pausing, since a paused autoplay is still something that starts
          moving the moment your pointer leaves. And the scrolls the carousel
          animates arrive instantly instead: the prev and next buttons, tabbing
          to an item that is off screen, an autoplay rewinding, and the snapping
          it finishes on the browser’s behalf after a loop wrap. The destination
          is what you asked for, the journey is the decoration.
        </p>
        <p>
          Dragging is untouched, and so is the momentum that carries on from it.
          That motion is your own hand, and stopping the carousel dead under
          your finger would be less control rather than less motion. Same for
          the rubber-banding at the ends, and for looping, whose copies are
          structure rather than movement. If your app has already made this
          decision somewhere else, <code>reducedMotion=&quot;ignore&quot;</code>{" "}
          opts out of all of it.
        </p>
        <h3 id="tabbing">Tabbing through the carousel items</h3>
        <p>
          Full support for tabbing through the carousel items, provided the
          items contain tabbable content. Here again, when tabbing through, the
          carousel fully enforces the desired <code>scroll-snap-align</code> and
          makes sure the tabbed item is fully visible instead of being partially
          hidden by the mask, or if you choose to render the prev / next buttons
          on top of the carousel, you can provide a custom{" "}
          <code>boundaryOffset</code> function to account for these. Tabbing
          through a carousel that loops has a bit more going on, see{" "}
          <a href="#looping">looping</a> above.
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
          overscroll / rubber-banding on desktop isn’t trivial. Infinite
          scrolling is in there now too, along with autoplay. Getting a loop and
          native snapping to agree with each other turned out to be a story of
          its own, one browser at a time.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default CarouselComponentPage;

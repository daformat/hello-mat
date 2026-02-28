import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

import { Carousel } from "@/components/Carousel/Carousel";
import styles from "@/components/Carousel/Carousel.module.scss";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables";

const componentId: ComponentId = "carousel-component";

const CarouselComponentPage = () => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <CarouselComponentPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const CarouselComponentPageContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0.7);
  const carouselRef = useRef<HTMLDivElement>(null);
  useCssSizeVariables(carouselRef);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

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
        <div
          ref={carouselRef}
          className={styles.wrapper}
          style={{ marginBottom: 32 }}
        >
          <Carousel.Root
            boundaryOffset={getBoundaryOffset}
            className={styles.carousel}
          >
            <Carousel.Viewport
              className={styles.carousel_viewport}
              style={
                {
                  "--margin-inline": "-12px",
                  "--carousel-fade-offset-backwards":
                    "min(var(--remaining-backwards, 0px) + var(--margin-inline), var(--margin-inline) * -1)",
                  "--carousel-fade-offset-forwards":
                    "min(var(--remaining-forwards, 0px) + var(--margin-inline), var(--margin-inline) * -1)",
                  marginInline: "var(--margin-inline)",
                } as CSSProperties
              }
            >
              <Carousel.Content className={styles.carousel_content}>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/hello-mat-dark.png"
                    />
                    <img
                      src="/media/hello-mat-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/details/og-details-dark.png"
                    />
                    <img
                      src="/media/design-engineering/details/og-details-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/images-and-embeds/og-media-dark.png"
                    />
                    <img
                      src="/media/design-engineering/images-and-embeds/og-media-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png"
                    />
                    <img
                      src="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/publish-button/og-publish-button-dark.png"
                    />
                    <img
                      src="/media/design-engineering/publish-button/og-publish-button-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/dock/og-dock-dark.png"
                    />
                    <img
                      src="/media/design-engineering/dock/og-dock-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/hello-mat-dark.png"
                    />
                    <img
                      src="/media/hello-mat-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/details/og-details-dark.png"
                    />
                    <img
                      src="/media/design-engineering/details/og-details-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/images-and-embeds/og-media-dark.png"
                    />
                    <img
                      src="/media/design-engineering/images-and-embeds/og-media-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png"
                    />
                    <img
                      src="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/publish-button/og-publish-button-dark.png"
                    />
                    <img
                      src="/media/design-engineering/publish-button/og-publish-button-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item className={styles.carousel_item}>
                  <picture
                    style={
                      { fontSize: 0, "--size": `${size}` } as CSSProperties
                    }
                    className={styles.card}
                  >
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/dock/og-dock-dark.png"
                    />
                    <img
                      src="/media/design-engineering/dock/og-dock-light.png"
                      alt=""
                      style={{ aspectRatio: "1200 / 630" }}
                    />
                  </picture>
                </Carousel.Item>
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
                <Carousel.PrevPage className={styles.button}>
                  <FaChevronLeft size={12} />
                </Carousel.PrevPage>
                <Carousel.NextPage className={styles.button}>
                  <FaChevronRight size={12} />
                </Carousel.NextPage>
              </div>
            </div>
          </Carousel.Root>
        </div>
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
          is based on the <code>scroll-snap-align</code> set in css. For this
          demo, I chose to use <code>center</code>, so the next item that is not
          fully visible will be centered in the viewport when clicking the next
          or previous page buttons.
        </p>
        <h3 id="snapping">Snapping</h3>
        <p>
          Because of the css styles, the carousel items will snap naturally when
          performing a regular scroll. I chose{" "}
          <code>scroll-snap-align: center</code> for this demo. But when you
          drag to scroll on desktop, this behavior is not a given. You have to
          implement it yourself by adjusting the deceleration factor for the
          velocity, so that the velocity reaches 0 towards the snap point. I
          also chose to allow small movements not to snap, so that it feels more
          natural.
        </p>
        <h3 id="scroll-fade">scroll-fade</h3>
        <p>
          Most scroll fades only animate the opacity when you reach the edges of
          the scroll area. Instead of doing this, I decided to animate the
          length of the mask based on the remaining scroll distance. This way,
          the fading effect is more natural, and the transition is smoother.
        </p>
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

const getBoundaryOffset = (container: HTMLElement) => {
  const viewport = container.querySelector("[data-carousel-viewport]");
  if (viewport) {
    const computedStyle = getComputedStyle(viewport);
    const maskSize = computedStyle.getPropertyValue("--carousel-fade-size");
    const temp = document.createElement("div");
    temp.style.position = "absolute";
    temp.style.visibility = "hidden";
    temp.style.setProperty("--carousel-fade-size", maskSize);
    temp.style.width = "var(--carousel-fade-size)";
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp);
    const result = { x: parseFloat(computed.getPropertyValue("width")), y: 0 };
    return result;
  }
  return { x: 0, y: 0 };
};

export default CarouselComponentPage;

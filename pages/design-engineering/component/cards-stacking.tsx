import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { CSSProperties, Fragment, useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { RollingStackedCards } from "@/components/RollingStackedCards/RollingStackedCards"
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables"

const CardsStackingPage = () => (
  <>
    <PageMetas
      title="Design engineering: a carousel component"
      description="Building a scrollable, and swipeable carousel, with momentum scrolling, overscroll and rubber-banding using React, TypeScript, and SCSS."
      url="https://hello-mat.com/design-engineering/component/carousel-component"
      image="https://hello-mat.com/media/design-engineering/carousel/og-carousel-light.png"
      imageWidth={1200}
      imageHeight={630}
    />
    <TableOfContents.Provider>
      <CardsStackingPageContent />
    </TableOfContents.Provider>
  </>
)

const CardsStackingPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  useCssSizeVariables(cardsContainerRef)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

  const cards = [
    <picture
      key="0"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="1"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="2"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="3"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="4"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="5"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="6"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="7"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="0"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="1"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="2"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="3"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="4"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="5"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="6"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="7"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="0"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="1"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="2"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="3"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="4"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="5"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="6"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
    <picture
      key="7"
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
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
    </picture>,
  ]

  useEffect(() => {
    const cardsContainer = cardsContainerRef.current
    if (!cardsContainer) {
      return
    }
    const handleScroll = () => {
      const cardsWrapper = cardsContainer?.querySelector("[data-cards-wrapper]")
      if (cardsContainer && cardsWrapper) {
        const cards = Array.from(cardsContainer.querySelectorAll("[data-card]"))
        const discardedCards: HTMLElement[] = []
        const remainingCards: HTMLElement[] = []
        const discardedScaleMap = new WeakMap<HTMLElement, number>()
        cards.forEach((card) => {
          if (card instanceof HTMLElement) {
            const scale = getComputedStyle(card).scale
            discardedScaleMap.set(card, parseFloat(scale))
            if (scale !== "none") {
              discardedCards.push(card)
            } else {
              remainingCards.push(card)
            }
          }
        })
        const discardedAmount = discardedCards.length
        const lastDiscarded = discardedCards[discardedAmount - 1]
        const lastDiscardedScale = discardedScaleMap.get(lastDiscarded)
        const discardedRatio = lastDiscardedScale
          ? 1 - (lastDiscardedScale - 0.78) / 0.22
          : 0
        cardsContainer.style.setProperty(
          "--discarded-amount",
          `${discardedAmount}`
        )
        cardsContainer.style.setProperty(
          "--discarded-ratio",
          `${discardedRatio}`
        )
        cards.forEach((card) => {
          if (card instanceof HTMLElement) {
            const prevDiscarded = Math.max(discardedAmount - 1, 0)
            card.style.paddingTop = `calc(var(--card-top-distance) + (var(--index0) - ${prevDiscarded} - ${
              discardedAmount ? discardedRatio : 0
            }) * var(--card-top-offset))`
          }
        })
      }
    }
    handleScroll()
    const handleResize = () => {
      // We need to force reflow to properly trigger the animations when resizing
      const animationElements =
        cardsContainer.querySelectorAll("[data-animates]")
      animationElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          const prevAnimation = element.style.animationName
          if (prevAnimation) {
            element.style.animationName = "none"
            const _ = element.offsetHeight
            element.style.animationName = prevAnimation
            const __ = element.offsetHeight
            cardsContainer.scrollIntoView({ block: "nearest" })
          }
        }
      })
      handleScroll()
    }
    const resizeObserver = new ResizeObserver(handleResize)
    document.addEventListener("scroll", handleScroll)
    resizeObserver.observe(cardsContainer)
    return () => {
      document.removeEventListener("scroll", handleScroll)
      resizeObserver.disconnect()
    }
  }, [])

  const showOld = false
  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-dock-component">
          Design engineering: rolling stacked cards
        </h1>
        <p>
          A scroll-driven animation that stacks cards in a rolling fashion, with
          up to 4 stacked cards at a time. Just scroll the page to see it in
          action.
        </p>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .demo {
              display: none;
            }

            *[style*="animation"] {
              will-change: transform, opacity, padding-top, margin-top, scale;
            }

            @supports (animation-timeline: view()) {
              .warning:not([data-bug]) {
                display: none;
              }

              .demo {
                display: initial;
              }
            }
          `,
          }}
        />
        <div className="warning">
          ⚠️ This demo uses a feature that is not supported by your browser.
        </div>
        <RollingStackedCards
          cards={cards}
          topDistance={"32px"}
          topOffset={"calc(32px / 1px / 464 * var(--card-height))"}
          cardHeight={
            "calc(var(--inline-size) / 1.9047619048 + var(--card-padding) * 2)"
          }
          cardMargin={"8px"}
          cardPadding={"8px"}
          rollingCount={4}
        />

        {showOld ? (
          <div
            ref={cardsContainerRef}
            style={
              {
                "--cards-amount": cards.length,
                "--card-top-distance": "32px",
                "--raw-card-top-offset": "32px",
                "--card-top-offset":
                  "calc(32px / 1px / 464 * var(--card-height))",
                // "--card-top-offset": "32px",
                "--card-height":
                  "calc(var(--inline-size) / 1.9047619048 + var(--card-padding) * 2)",
                "--card-margin": "8px",
                "--card-padding": "8px",
                marginBottom:
                  "calc(-1 * (max(var(--discarded-amount, 0) - 1, 0)) * var(--card-top-offset) - var(--discarded-ratio, 0) * var(--card-top-offset))",
                // translate: `0 calc(
                // -1 * (
                //   max(calc(var(--discarded-amount, 0) - 1), 0) * var(--card-top-offset)
                //   + var(--card-top-offset) * var(--discarded-ratio, 0)
                // ))`,
              } as CSSProperties
            }
          >
            <Keyframes
              name="scale"
              to={{
                scale: "calc(1 - calc( 0.1 * ( 1 ) ) )",
              }}
            />
            <Keyframes
              name="discard"
              to={{
                scale: "0.78",
                paddingTop: "0",
                marginTop: "calc(-1 * var(--card-margin))",
                opacity: 0,
                // translate: "0 -100%",
              }}
            />
            <div className="demo">
              <div
                data-cards-wrapper={""}
                style={
                  {
                    viewTimelineName: "--cards-scrolling",
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gridTemplateRows:
                      "repeat(var(--cards-amount), var(--card-height))",
                    gap: "var(--card-margin)",
                    paddingBottom:
                      "calc((var(--cards-amount)) * var(--card-top-offset))",
                    marginBottom: "var(--card-margin)",
                    // outline: "10px solid #ff777799",
                  } as CSSProperties
                }
              >
                {cards.map((content, i) => (
                  <div
                    key={i}
                    data-card={""}
                    data-animates={""}
                    style={
                      {
                        "--start-range":
                          "calc((var(--index0) + 3) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)",
                        "--end-range":
                          "calc((var(--index) + 3) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)",
                        animation: "discard linear forwards",
                        animationTimeline: "--cards-scrolling",
                        animationRange:
                          "exit-crossing var(--start-range) exit-crossing var(--end-range)",
                        position: "sticky",
                        top: 0,
                        paddingTop:
                          "calc(var(--card-top-distance) + var(--index0) * var(--card-top-offset))",
                        // outline: "1px solid lime",
                        "--index": `${i + 1}`,
                        "--index0": "calc(var(--index) - 1)",
                        "--reverse-index":
                          "calc(var(--cards-amount) - var(--index0))",
                        "--reverse-index0": "calc(var(--reverse-index) - 1)",
                        "--reverse-rolling-index": `${4 - (i % 4)}`,
                        "--reverse-rolling-index0":
                          "calc(var(--reverse-rolling-index) - 1)",
                        transition:
                          "--reverse-rolling-index 0.2s var(--ease-out-cubic), --reverse-rolling-index0 0.2s var(--ease-out-cubic)",
                        transformOrigin: "center 200%",
                      } as CSSProperties
                    }
                  >
                    <div
                      data-animates={""}
                      style={
                        {
                          "--card-length": `${cards.length}`,
                          "--card-i": `${i}`,
                          "--card-min-value": "3",
                          "--card-min": `${Math.min(cards.length - 1 - i, 3)}`,
                          "--start-range": `calc((var(--index0) + ${Math.min(
                            cards.length - 1 - i,
                            3
                          )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
                          "--end-range": `calc((var(--index) + ${Math.min(
                            cards.length - 1 - i,
                            3
                          )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
                          animation:
                            i < cards.length - 4
                              ? "scale linear forwards"
                              : undefined,
                          animationTimeline: "--cards-scrolling",
                          animationRange:
                            "exit-crossing var(--start-range) exit-crossing var(--end-range)",
                          transformOrigin: "50% 0%",
                        } as CSSProperties
                      }
                    >
                      <div
                        data-animates={""}
                        style={
                          {
                            "--card-length": `${cards.length}`,
                            "--card-i": `${i}`,
                            "--card-min-value": "2",
                            "--card-min": `${Math.min(
                              cards.length - 1 - i,
                              2
                            )}`,
                            "--start-range": `calc((var(--index0) + ${Math.min(
                              cards.length - 1 - i,
                              2
                            )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
                            "--end-range": `calc((var(--index) + ${Math.min(
                              cards.length - 1 - i,
                              2
                            )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
                            animation:
                              i < cards.length - 3
                                ? "scale linear forwards"
                                : undefined,
                            animationTimeline: "--cards-scrolling",
                            animationRange:
                              "exit-crossing var(--start-range) exit-crossing var(--end-range)",
                            transformOrigin: "50% 0%",
                          } as CSSProperties
                        }
                      >
                        <div
                          data-animates={""}
                          style={
                            {
                              "--card-length": `${cards.length}`,
                              "--card-i": `${i}`,
                              "--card-min-value": "1",
                              "--card-min": `${Math.min(
                                cards.length - 1 - i,
                                1
                              )}`,
                              "--start-range": `calc((var(--index0) + ${Math.min(
                                cards.length - 1 - i,
                                1
                              )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
                              "--end-range": `calc((var(--index) + ${Math.min(
                                cards.length - 1 - i,
                                1
                              )}) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)`,
                              animation:
                                i < cards.length - 2
                                  ? "scale linear forwards"
                                  : undefined,
                              animationTimeline: "--cards-scrolling",
                              animationRange:
                                "exit-crossing var(--start-range) exit-crossing var(--end-range)",
                              transformOrigin: "50% 0%",
                            } as CSSProperties
                          }
                        >
                          <picture
                            className="card flat shadow"
                            data-animates={""}
                            style={
                              {
                                "--start-range":
                                  "calc(var(--index0) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)",
                                "--end-range":
                                  "calc(var(--index) * (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%)",
                                fontSize: 0,
                                display: "inline-block",
                                padding: "var(--card-padding)",
                                // backgroundColor:
                                //   "var(--color-toolbar-button-background-hover)",
                                height: "fit-content",
                                animation:
                                  i < cards.length - 1
                                    ? "scale linear forwards"
                                    : undefined,
                                animationTimeline: "--cards-scrolling",
                                animationRange:
                                  "exit-crossing var(--start-range) exit-crossing var(--end-range)",
                                transformOrigin: "50% 0%",
                                width: "100%",
                                // outline: "1px solid orange",
                              } as CSSProperties
                            }
                          >
                            {content}
                          </picture>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
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
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          While implementing the basic version of the carousel is easy, thanks
          to modern css, implementing momentum scrolling with snapping and
          overscroll / rubber-banding on desktop isn’t trivial. Maybe I’ll try
          to enable infinite scrolling at some point, but for now, this is a
          good start.
        </p>
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

interface IProps {
  name: string
  [key: string]: React.CSSProperties | string
}

export const Keyframes = ({ name, ...props }: IProps) => {
  const toCss = (cssObject: React.CSSProperties | string) =>
    typeof cssObject === "string"
      ? cssObject
      : Object.keys(cssObject).reduce((accumulator, key) => {
          const cssKey = key.replace(/[A-Z]/g, (v) => `-${v.toLowerCase()}`)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cssValue = (cssObject as any)[key].toString().replace("'", "")
          return `${accumulator}${cssKey}:${cssValue};`
        }, "")

  return (
    <style>
      {`@keyframes ${name} {
        ${Object.keys(props)
          .map((key) => {
            return ["from", "to"].includes(key)
              ? `${key} { ${toCss(props[key])} }`
              : /^_[0-9]+$/.test(key)
              ? `${key.replace("_", "")}% { ${toCss(props[key])} }`
              : ""
          })
          .join(" ")}
      }`}
    </style>
  )
}

export default CardsStackingPage
